import { Article } from '../db/index.js';

// Paragraph public content API — no API key required for reading published content.
// Docs: https://paragraph.com/docs/api-reference
const PARAGRAPH_API_BASE = 'https://public.api.paragraph.com/api/v1';

const MOCK_ARTICLES: Partial<Article>[] = [
  {
    ghost_slug: 'onchain-writing-economy',
    title: 'The Onchain Writing Economy After Mirror',
    excerpt: 'Paragraph absorbed Mirror and became the default home for crypto-native writing. What does that mean for creator monetization?',
    full_html: `<p>Paragraph absorbed Mirror and became the default home for crypto-native writing. What does that mean for creator monetization?</p>
<p>Web3 writers already own their audience through wallet subscriptions and permanent storage. The missing piece has been per-read economics: a way for every individual reader — human or AI — to compensate the author directly without a subscription commitment.</p>
<p>Machine-to-creator nanopayments close that gap. When an AI agent reads an essay and pays USDC for the privilege, the essay stops being marketing and starts being inventory.</p>`,
  },
  {
    ghost_slug: 'wallet-native-authorship',
    title: 'Wallet-Native Authorship: Proof Without Platforms',
    excerpt: 'When every writer has a wallet, ownership verification becomes cryptographic instead of bureaucratic.',
    full_html: `<p>When every writer has a wallet, ownership verification becomes cryptographic instead of bureaucratic.</p>
<p>Traditional platforms verify authors with API keys, OAuth handshakes, and support tickets. Wallet-native publishing replaces all of that with a signature: prove you control the address that owns the publication, and you have proven authorship.</p>
<p>This is the foundation for royalty routing — payments can flow to the verified owner with no intermediary custody.</p>`,
  },
];

// Accepts "@myblog", "myblog", "https://paragraph.com/@myblog", "paragraph.xyz/@myblog/post" etc.
export function parseParagraphSlug(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, '');
  if (!trimmed.includes('/') && !trimmed.includes('.')) {
    return trimmed.replace(/^@/, '');
  }
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const segments = url.pathname.split('/').filter(Boolean);
    const handle = segments.find((s) => s.startsWith('@')) || segments[0];
    if (handle) return handle.replace(/^@/, '');
  } catch {
    // Not a parseable URL; fall through to raw handle
  }
  return trimmed.replace(/^@/, '');
}

// Paragraph returns publishedAt as epoch milliseconds; the articles table
// stores ISO strings (matching the Ghost import path).
function normalizePublishedAt(value: any): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const date = typeof value === 'number' || /^\d+$/.test(String(value))
    ? new Date(Number(value))
    : new Date(value);
  return isNaN(date.getTime()) ? undefined : date.toISOString();
}

// Handles both '@slug' handles and wallet-address profile URLs
// (e.g. app.paragraph.com/0xabc... resolves wallet -> user -> publication).
async function fetchParagraphPublication(handle: string): Promise<any> {
  if (/^0x[a-fA-F0-9]{40}$/.test(handle)) {
    const userResponse = await fetch(`${PARAGRAPH_API_BASE}/users/wallet/${handle}`);
    if (userResponse.ok) {
      const user = (await userResponse.json()) as any;
      if (user.publicationId) {
        const pubResponse = await fetch(`${PARAGRAPH_API_BASE}/publications/${user.publicationId}`);
        if (pubResponse.ok) return pubResponse.json();
      }
    }
    // Fall through: some publications use the wallet address as their slug
  }
  const response = await fetch(`${PARAGRAPH_API_BASE}/publications/slug/${encodeURIComponent(handle)}`);
  if (!response.ok) {
    throw new Error(`Paragraph API responded with status ${response.status} for publication '${handle}'`);
  }
  return response.json();
}

export async function fetchParagraphArticles(publicationUrl: string): Promise<Partial<Article>[]> {
  if (!publicationUrl || publicationUrl.includes('mock')) {
    console.log('[Paragraph Service] Running in mock mode, returning sample articles.');
    return MOCK_ARTICLES;
  }

  try {
    const slug = parseParagraphSlug(publicationUrl);
    console.log(`[Paragraph Service] Resolving publication '@${slug}'...`);
    const publication = await fetchParagraphPublication(slug);

    const posts: any[] = [];
    let cursor: string | undefined;
    do {
      const params = new URLSearchParams({ limit: '100', includeContent: 'true' });
      if (cursor) params.set('cursor', cursor);
      const response = await fetch(`${PARAGRAPH_API_BASE}/publications/${publication.id}/posts?${params}`);
      if (!response.ok) {
        throw new Error(`Paragraph API responded with status ${response.status} listing posts`);
      }
      const page = (await response.json()) as any;
      const items = page.items || page.posts || page.data || [];
      posts.push(...items);
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);

    console.log(`[Paragraph Service] Fetched ${posts.length} posts from '@${slug}'.`);
    return posts.map((post: any) => ({
      ghost_slug: post.slug,
      title: post.title,
      excerpt: post.subtitle || '',
      full_html: post.staticHtml || (post.markdown ? `<pre>${post.markdown}</pre>` : ''),
      published_at: normalizePublishedAt(post.publishedAt),
    }));
  } catch (error: any) {
    console.error(`[Paragraph Service] Error fetching articles: ${error.message}. Falling back to mock articles.`);
    return MOCK_ARTICLES;
  }
}

// Cryptographic proof-of-authorship: the connected wallet must resolve (via
// Paragraph's public user API) to the user who owns the publication.
export async function verifyParagraphOwnership(publicationUrl: string, walletAddress: string): Promise<boolean> {
  try {
    const slug = parseParagraphSlug(publicationUrl);
    const publication = await fetchParagraphPublication(slug);

    const response = await fetch(`${PARAGRAPH_API_BASE}/users/wallet/${walletAddress}`);
    if (!response.ok) {
      console.log(`[Paragraph Service] No Paragraph user found for wallet ${walletAddress} (status ${response.status}).`);
      return false;
    }
    const user = (await response.json()) as any;

    const isOwner = user.id === publication.ownerUserId || user.publicationId === publication.id;
    console.log(`[Paragraph Service] Ownership check for '@${slug}' vs wallet ${walletAddress}: ${isOwner ? 'VERIFIED' : 'NOT OWNER'}`);
    return isOwner;
  } catch (error: any) {
    console.error(`[Paragraph Service] Ownership verification failed: ${error.message}`);
    return false;
  }
}
