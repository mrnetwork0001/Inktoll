import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import type { Express, Request, Response } from 'express';
import { getOrCreateAgentWallet, payAndFetchArticle } from './tools/pay.js';
import { summarizeAndEmbed } from './tools/summarize.js';
import { getAgentUsdcBalance, getGatewayBalance } from './tools/balance.js';
import { checkBudget, loadHistory, isPurchased } from './budget.js';
import { loadProfile } from './profile.js';

// Inktoll MCP server: lets ANY MCP-capable AI assistant (Claude, Cursor, etc.)
// browse the article catalog, pay creators in USDC via x402, and ask questions
// whose answers settle citation tolls to the cited authors.
//
// Identity: each connecting user picks a handle via `?uid=<handle>` on the MCP
// URL (or an `x-user-id` header). The first paid action auto-provisions a
// Circle developer-controlled wallet for that handle — "every assistant gets
// a wallet." Env is read lazily (dotenv runs in index.ts after imports load).

const serverUrl = () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const openaiKey = () => process.env.OPENAI_API_KEY || '';
const agentPort = () => parseInt(process.env.AGENT_PORT || '3002', 10);

const UID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const LOOPBACK_TIMEOUT_MS = 45_000;

function firstString(value: unknown): string {
  const v = Array.isArray(value) ? value[0] : value;
  return typeof v === 'string' ? v : '';
}

function resolveUserId(req: Request): string | null {
  // Query param is the documented interface; header is a fallback. Lowercased
  // so 'Alice' and 'alice' key the same wallet. The 'mcp-' prefix is reserved
  // (it is the namespace applied server-side), so uids carrying it are
  // rejected rather than silently collapsing onto another user's identity.
  const raw = (firstString(req.query.uid) || firstString(req.headers['x-user-id'])).toLowerCase();
  if (!raw || !UID_RE.test(raw) || raw.startsWith('mcp-')) return null;
  return `mcp-${raw}`;
}

const NO_UID_MSG =
  'No identity set. Add `?uid=<any-handle-you-choose>` to your Inktoll MCP URL ' +
  '(e.g. https://agent.inktoll.xyz/mcp?uid=alice) and reconnect. Handles are ' +
  'letters/numbers/dashes, may not start with the reserved prefix "mcp-", and ' +
  'key your personal agent wallet — pick one and keep it.';

const BACKEND_DOWN_MSG = 'The Inktoll backend is unreachable right now — please try again shortly.';

function text(s: string) {
  return { content: [{ type: 'text' as const, text: s }] };
}

function toolError(s: string) {
  return { content: [{ type: 'text' as const, text: s }], isError: true };
}

function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&') // decode last so double-encoded text isn't double-decoded
    .replace(/\s+\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// MCP agents pay like any other agent, so register them with the backend —
// otherwise their payments appear on the graph with no named agent node.
function syncAgentRegistration(userId: string): void {
  void (async () => {
    try {
      const wallet = await getOrCreateAgentWallet(userId);
      const profile = await loadProfile(userId);
      await fetch(`${serverUrl()}/api/creators/register-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userId,
          walletAddress: wallet.address,
          interests: profile.interests.join(', '),
          maxPricePerArticle: profile.maxPricePerArticle,
          dailyBudgetUsdc: profile.dailyBudgetUsdc,
          isActive: true,
        }),
      });
    } catch {
      /* non-fatal */
    }
  })();
}

function buildMcpServer(userId: string | null): McpServer {
  const server = new McpServer(
    { name: 'inktoll', version: '1.0.0' },
    {
      instructions:
        'Inktoll is a marketplace where AI agents pay human writers in USDC for their work, settled gaslessly on Arc. ' +
        'Flow: browse_articles (free) -> read_article (pays the author via x402; needs a funded wallet -> claim_faucet on testnet) -> ' +
        'ask_inktoll (answers questions and auto-pays citation tolls to cited authors). ' +
        'wallet_status shows your agent wallet, balances, and spend.',
    }
  );

  server.registerTool(
    'browse_articles',
    {
      title: 'Browse the Inktoll article catalog',
      description:
        'List monetized articles with title, author, USDC price, and a free preview. No payment required.',
      inputSchema: { limit: z.number().int().min(1).max(50).optional().describe('Max articles to return (default 20)') },
    },
    async ({ limit }) => {
      let articles: any[];
      try {
        const res = await fetch(`${serverUrl()}/api/articles`);
        if (!res.ok) throw new Error(String(res.status));
        articles = (await res.json()) as any[];
      } catch {
        return toolError(BACKEND_DOWN_MSG);
      }
      const rows = articles.slice(0, limit ?? 20).map((a: any) => ({
        slug: a.ghost_slug,
        title: a.title,
        author: hostOf(a.ghost_url || ''),
        price_usdc: a.price_usdc,
        preview: (a.excerpt || a.preview_text || '').substring(0, 220),
      }));
      return text(
        `${rows.length} of ${articles.length} articles. Pay-per-read via read_article(slug).\n\n` +
          JSON.stringify(rows, null, 2)
      );
    }
  );

  server.registerTool(
    'read_article',
    {
      title: 'Pay the author and read the full article',
      description:
        'Unlocks the full article by paying its USDC price to the verified author via an x402 nanopayment ' +
        'signed by YOUR Inktoll agent wallet. Re-reading an article you already own does not pay again. ' +
        'Fails with guidance if the wallet is unfunded or a budget cap is hit.',
      inputSchema: { slug: z.string().describe('Article slug from browse_articles') },
    },
    async ({ slug }) => {
      if (!userId) return toolError(NO_UID_MSG);

      // x402 discovery: the unauthenticated request returns the 402 challenge
      // carrying the authoritative price and the author's payout address.
      let challenge: globalThis.Response;
      try {
        challenge = await fetch(`${serverUrl()}/api/articles/${encodeURIComponent(slug)}`);
      } catch {
        return toolError(BACKEND_DOWN_MSG);
      }
      if (challenge.status === 404) {
        return toolError(`No article with slug '${slug}'. Use browse_articles to list valid slugs.`);
      }
      const priceHeader = challenge.headers.get('payment-amount');
      const price = priceHeader === null ? NaN : parseFloat(priceHeader);
      const recipient = challenge.headers.get('payment-recipient') || '';
      if (!Number.isFinite(price) || price < 0 || !recipient) {
        return toolError('Could not read the x402 payment challenge for this article. Try again.');
      }

      const alreadyOwned = await isPurchased(userId, slug);
      if (!alreadyOwned) {
        const budget = await checkBudget(userId, price);
        if (!budget.allowed) {
          return toolError(`Purchase blocked by your agent budget: ${budget.reason}`);
        }
      }

      const payResult = await payAndFetchArticle(userId, slug, price, recipient, serverUrl());
      if (!payResult.success || !payResult.article) {
        const hint = /insufficient/i.test(payResult.error || '')
          ? ' Your agent wallet needs testnet USDC — call claim_faucet, wait ~30s, then retry.'
          : '';
        return toolError(`Payment failed: ${payResult.error}${hint}`);
      }
      const article = payResult.article;

      // Store the embedding so ask_inktoll can cite (and pay) this author later.
      // Fire-and-forget: the paid content must not wait on OpenAI latency.
      void summarizeAndEmbed(article.id, slug, article.title, article.full_html, recipient, openaiKey()).catch(
        () => {}
      );
      syncAgentRegistration(userId);

      const body = stripHtml(article.full_html || '').substring(0, 12000);
      const paidLine = alreadyOwned
        ? `ALREADY OWNED — no new payment (this article was purchased previously).`
        : `PAID ${price} USDC -> ${hostOf(article.ghost_url || '')} (author wallet ${recipient}) via x402 on Arc.`;
      return text(`${paidLine}\nTitle: ${article.title}\n\n${body}`);
    }
  );

  server.registerTool(
    'ask_inktoll',
    {
      title: 'Ask a question — cited authors get paid',
      description:
        'Answers a question using knowledge from articles your agent has purchased. When the answer draws on a ' +
        'purchased article, a $0.0001 USDC citation toll is automatically paid to the original author.',
      inputSchema: { question: z.string().describe('The question to answer') },
    },
    async ({ question }) => {
      if (!userId) return toolError(NO_UID_MSG);

      // Delegate to the existing /api/agent/ask pipeline so MCP and dashboard
      // answers (and the authors they pay) can never drift apart.
      let res: globalThis.Response;
      try {
        res = await fetch(`http://127.0.0.1:${agentPort()}/api/agent/ask`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
          body: JSON.stringify({ question }),
          signal: AbortSignal.timeout(LOOPBACK_TIMEOUT_MS),
        });
      } catch {
        return toolError('The ask service took too long or is unreachable — please try again.');
      }
      const data: any = await res.json().catch(() => ({}));
      if (!res.ok) return toolError(`Ask failed: ${data.error || `status ${res.status}`}`);

      const citations: any[] = data.citations || [];
      const paid = (data.payments || []).filter((p: any) => p.success);
      let receipt = 'No citation tolls (answer did not draw on purchased articles).';
      if (citations.length > 0) {
        receipt =
          `Citation tolls paid: ${paid.length}/${citations.length} — ` +
          citations.map((c: any) => `"${c.title}" (similarity ${(c.similarity * 100).toFixed(0)}%)`).join(', ');
      }
      return text(`${data.answer}\n\n---\n${receipt}`);
    }
  );

  server.registerTool(
    'wallet_status',
    {
      title: "Your agent wallet's address, balances, and spend",
      description:
        'Shows (and on first call auto-provisions) your Circle developer-controlled agent wallet on Arc: address, ' +
        'USDC balance, Circle Gateway balance, daily spend, and purchased articles.',
      inputSchema: {},
    },
    async () => {
      if (!userId) return toolError(NO_UID_MSG);

      let wallet: { id: string; address: string };
      try {
        wallet = await getOrCreateAgentWallet(userId);
      } catch (err: any) {
        return toolError(`Could not provision your agent wallet: ${err.message}`);
      }
      syncAgentRegistration(userId);

      const [balance, gatewayBalance, history] = await Promise.all([
        getAgentUsdcBalance(wallet).catch(() => null),
        getGatewayBalance(wallet.address).catch(() => null),
        loadHistory(userId),
      ]);

      return text(
        JSON.stringify(
          {
            identity: userId,
            walletAddress: wallet.address,
            network: 'Arc (USDC-native)',
            usdcBalance: balance,
            gatewayBalanceUsdc: gatewayBalance,
            dailySpentUsdc: history.dailySpentUsdc,
            purchasedArticles: history.purchasedSlugs,
          },
          null,
          2
        )
      );
    }
  );

  server.registerTool(
    'claim_faucet',
    {
      title: 'Fund your agent wallet with testnet USDC',
      description:
        'Claims 1 testnet USDC into your agent wallet (24h cooldown) and auto-deposits into Circle Gateway so ' +
        'read_article payments can settle. Can take over a minute under testnet congestion.',
      inputSchema: {},
    },
    async () => {
      if (!userId) return toolError(NO_UID_MSG);

      let res: globalThis.Response;
      try {
        res = await fetch(`http://127.0.0.1:${agentPort()}/api/agent/faucet/claim`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
          signal: AbortSignal.timeout(LOOPBACK_TIMEOUT_MS),
        });
      } catch (err: any) {
        if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
          // The claim keeps running server-side; a retry would hit the cooldown.
          return text(
            'Funding started and is still processing (testnet settlement can take a minute or more). ' +
              'Check wallet_status shortly — do NOT re-claim, the 24h cooldown applies once it completes.'
          );
        }
        return toolError('The faucet service is unreachable — please try again shortly.');
      }
      const data: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        return toolError(`Faucet claim failed: ${data.error || `status ${res.status}`}`);
      }
      return text(
        `Faucet claim succeeded (${data.method || 'transfer'}). Your agent wallet is funded — ` +
          `call wallet_status to confirm, then read_article to pay a writer.`
      );
    }
  );

  return server;
}

export function mountMcp(app: Express) {
  app.post('/mcp', async (req: Request, res: Response) => {
    try {
      const server = buildMcpServer(resolveUserId(req));
      // Stateless mode: a fresh server+transport per request, no session tracking
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      res.on('close', () => {
        transport.close();
        server.close();
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err: any) {
      console.error('[MCP] Request failed:', err.message);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    }
  });

  const methodNotAllowed = (_req: Request, res: Response) =>
    res.status(405).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed. This MCP endpoint is stateless — use POST.' },
      id: null,
    });
  app.get('/mcp', methodNotAllowed);
  app.delete('/mcp', methodNotAllowed);

  console.log('[MCP] Inktoll MCP server mounted at /mcp (streamable HTTP, stateless)');
}
