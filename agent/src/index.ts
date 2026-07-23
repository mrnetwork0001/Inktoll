// Spy on global fetch BEFORE imports load
const originalFetch = global.fetch;
global.fetch = async (input: any, init: any) => {
  const url = typeof input === 'string' ? input : input.url;
  console.log(`[Fetch Spy] Outgoing request to: ${url}`);
  try {
    const response = await originalFetch(input, init);
    console.log(`[Fetch Spy] Response status: ${response.status} for ${url}`);
    const clone = response.clone();
    const text = await clone.text();
    console.log(`[Fetch Spy] Response body preview (150 chars):`, text.substring(0, 150));
    return response;
  } catch (err: any) {
    console.error(`[Fetch Spy] Request failed:`, err);
    throw err;
  }
};

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getOrCreateAgentWallet, getCircleClient } from './tools/pay.js';
import { loadProfile, saveProfile } from './profile.js';
import { loadHistory } from './budget.js';
import { runAutonomousAgent } from './agent.js';
import { detectCitations, triggerCitationTolls } from './citation.js';
import { ChatOpenAI } from '@langchain/openai';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { ethers } from 'ethers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const app = express();
app.use(cors());
app.use(express.json());

const PORT = parseInt(process.env.AGENT_PORT || '3002', 10);
const SERVER_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// Middleware to enforce user authentication
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return next();
  }
  
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    return res.status(401).json({ error: 'x-user-id header is required for agent multi-tenancy' });
  }
  (req as any).userId = userId;
  next();
});

// Balance reads used to hit the public Arc RPC on every status poll, which
// burned through the node's request quota and starved the faucet's writes
// (-32011 "request limit reached"). Circle's API is authoritative for our
// custodial wallets and doesn't touch the Arc RPC; results are cached briefly
// because the dashboard polls this endpoint. RPC remains a last-resort fallback.
const balanceCache = new Map<string, { value: number; fetchedAt: number }>();
const BALANCE_CACHE_TTL_MS = 30_000;

async function getAgentUsdcBalance(wallet: { id: string; address: string }): Promise<number> {
  const cached = balanceCache.get(wallet.address);
  if (cached && Date.now() - cached.fetchedAt < BALANCE_CACHE_TTL_MS) {
    return cached.value;
  }

  let balance = 0.00;
  try {
    const circle = getCircleClient();
    if (!circle) throw new Error('Circle client not initialized');
    const balanceResponse = await circle.getWalletTokenBalance({ id: wallet.id });
    const usdcToken = balanceResponse.data?.tokenBalances?.find((t: any) => t.token?.symbol === 'USDC');
    balance = usdcToken ? parseFloat(usdcToken.amount) : 0;
  } catch (circleErr: any) {
    try {
      const provider = new ethers.JsonRpcProvider(process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.network');
      const usdcAbi = ["function balanceOf(address owner) view returns (uint256)"];
      const usdcContract = new ethers.Contract(process.env.ARC_USDC_ADDRESS || '0x3600000000000000000000000000000000000000', usdcAbi, provider);
      const balStr = await usdcContract.balanceOf(wallet.address);
      balance = Number(ethers.formatUnits(balStr, 6)); // USDC has 6 decimals
    } catch (rpcErr) {
      console.warn('[Agent Status] Balance unavailable from both Circle API and Arc RPC, using default.');
    }
  }

  balanceCache.set(wallet.address, { value: balance, fetchedAt: Date.now() });
  return balance;
}

// Status Endpoint
app.get('/api/agent/status', async (req, res) => {
  const userId = (req as any).userId;
  try {
    const wallet = await getOrCreateAgentWallet(userId);
    const profile = await loadProfile(userId);
    const history = await loadHistory(userId);

    // Fetch real USDC balance (Circle API first, cached, RPC fallback)
    const balance = await getAgentUsdcBalance(wallet);

    // Fetch Circle Gateway balance
    let gatewayBalance = 0.00;
    try {
      let GATEWAY_API_URL = process.env.CIRCLE_GATEWAY_URL || 'https://gateway-api-testnet.circle.com/v1';
      if (!GATEWAY_API_URL.endsWith('/v1')) GATEWAY_API_URL += '/v1';
      const balanceRes = await fetch(`${GATEWAY_API_URL}/balances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'USDC',
          sources: [
            { domain: 26, depositor: wallet.address } // Domain 26 is Arc Testnet
          ]
        })
      });
      if (balanceRes.ok) {
        const data: any = await balanceRes.json();
        gatewayBalance = parseFloat(data.balances[0].balance);
      }
    } catch (err) {
      console.warn('[Agent Status] Failed to fetch gateway balance:', (err as any).message);
    }

    // Sync with the backend database to register active agents
    try {
      await originalFetch(`${SERVER_URL}/api/creators/register-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userId,
          walletAddress: wallet.address,
          interests: profile.interests.join(', '),
          maxPricePerArticle: profile.maxPricePerArticle,
          dailyBudgetUsdc: profile.dailyBudgetUsdc,
          isActive: true
        })
      });
    } catch (err) {
      console.warn('[Agent Status Sync] Failed to register agent with backend:', (err as any).message);
    }

    return res.json({
      address: wallet.address,
      balanceUsdc: balance,
      gatewayBalanceUsdc: gatewayBalance,
      interests: profile.interests,
      maxPricePerArticle: profile.maxPricePerArticle,
      dailyBudgetUsdc: profile.dailyBudgetUsdc,
      dailySpentUsdc: history.dailySpentUsdc,
      purchasedCount: history.purchasedSlugs.length,
      purchasedSlugs: history.purchasedSlugs,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Withdraw Endpoint
app.post('/api/agent/withdraw', async (req, res) => {
  const userId = (req as any).userId;
  const { amount, recipient } = req.body;

  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'Valid amount is required for withdrawal' });
  }
  if (!recipient) {
    return res.status(400).json({ error: 'Recipient EOA address is required' });
  }

  try {
    const wallet = await getOrCreateAgentWallet(userId);
    const { GatewayClient } = await import('@circle-fin/x402-batching/client');
    const client = new GatewayClient({
      chain: (process.env.ARC_CHAIN_NAME as any) || 'arcTestnet',
      privateKey: (wallet as any).privateKey as `0x${string}`, // Typecast to bypass since Developer Wallets don't expose private keys
    });

    console.log(`[Agent Withdrawal] Withdrawing ${amount} USDC to ${recipient}...`);
    const withdrawRes = await client.withdraw(amount, { recipient });
    console.log(`[Agent Withdrawal] Withdrawal submitted: ${withdrawRes.mintTxHash}`);

    return res.json({
      success: true,
      txHash: withdrawRes.mintTxHash,
      formattedAmount: withdrawRes.formattedAmount
    });
  } catch (error: any) {
    console.error(`[Agent Withdrawal] Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// Faucet Status Endpoint
app.get('/api/agent/faucet/status', async (req, res) => {
  const userId = (req as any).userId;
  const db = (await import('./db.js')).db;

  try {
    db.get('SELECT lastClaimedAt FROM FaucetClaims WHERE userId = ?', [userId], (err, row: any) => {
      if (err) return res.status(500).json({ error: err.message });
      
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      
      if (row && row.lastClaimedAt) {
        const timePassed = now - row.lastClaimedAt;
        if (timePassed < oneDayMs) {
          const remainingSeconds = Math.ceil((oneDayMs - timePassed) / 1000);
          return res.json({ allowed: false, cooldownRemainingSeconds: remainingSeconds });
        }
      }
      return res.json({ allowed: true });
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Faucet Claim Endpoint
app.post('/api/agent/faucet/claim', async (req, res) => {
  const userId = (req as any).userId;
  const db = (await import('./db.js')).db;
  
  const faucetPrivateKey = process.env.FAUCET_PRIVATE_KEY;
  if (!faucetPrivateKey) {
    return res.status(500).json({ error: 'Faucet is not configured on this server. Please define FAUCET_PRIVATE_KEY in your .env file.' });
  }

  try {
    const wallet = await getOrCreateAgentWallet(userId);
    
    // Check cooldown
    db.get('SELECT lastClaimedAt FROM FaucetClaims WHERE userId = ?', [userId], async (err, row: any) => {
      if (err) return res.status(500).json({ error: err.message });
      
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      
      if (row && row.lastClaimedAt) {
        const timePassed = now - row.lastClaimedAt;
        if (timePassed < oneDayMs) {
          const remainingSeconds = Math.ceil((oneDayMs - timePassed) / 1000);
          return res.status(400).json({ error: `Faucet is on a 24-hour cooldown. Please wait ${remainingSeconds} seconds.` });
        }
      }
      
      // Execute faucet transfer onchain, with retry + Circle drip fallback.
      // The public Arc RPC rate-limits aggressively (-32011 "request limit
      // reached"): backoff retries ride out short throttles, and Circle's
      // faucet API covers sustained ones without touching the Arc RPC at all.
      const isRateLimited = (err: any) => {
        const msg = String(err?.message || '');
        return msg.includes('request limit') || msg.includes('-32011') || msg.toLowerCase().includes('rate limit');
      };
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

      try {
        let txHash = '';
        let lastErr: any = null;

        for (let attempt = 1; attempt <= 3 && !txHash; attempt++) {
          try {
            const provider = new ethers.JsonRpcProvider(process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.network');
            const faucetWallet = new ethers.Wallet(faucetPrivateKey, provider);
            const usdcAbi = ["function transfer(address to, uint256 value) returns (bool)"];
            const usdcContract = new ethers.Contract(process.env.ARC_USDC_ADDRESS || '0x3600000000000000000000000000000000000000', usdcAbi, faucetWallet);

            console.log(`[Faucet] Transferring 1.0 USDC from faucet to agent EOA: ${wallet.address} (attempt ${attempt}/3)...`);
            const tx = await usdcContract.transfer(wallet.address, ethers.parseUnits("1.0", 6));
            await tx.wait();
            txHash = tx.hash;
            console.log(`[Faucet] Transfer succeeded: ${txHash}`);
          } catch (err: any) {
            lastErr = err;
            if (!isRateLimited(err) || attempt === 3) break;
            const delayMs = attempt * 5000;
            console.warn(`[Faucet] Arc RPC rate-limited (attempt ${attempt}/3), retrying in ${delayMs / 1000}s...`);
            await sleep(delayMs);
          }
        }

        let fundedViaDrip = false;
        if (!txHash) {
          // Fallback: Circle's faucet API funds the wallet without the Arc RPC
          console.warn(`[Faucet] Onchain transfer failed (${lastErr?.message}). Falling back to Circle faucet drip...`);
          const dripRes = await fetch('https://api.circle.com/v1/faucet/drips', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.CIRCLE_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              address: wallet.address,
              blockchain: process.env.ARC_BLOCKCHAIN_NAME || 'ARC-TESTNET',
              usdc: true
            })
          });
          if (!dripRes.ok) {
            throw new Error(`Arc RPC is rate-limited and the Circle faucet fallback also failed (status ${dripRes.status}). Please try again in a few minutes.`);
          }
          console.log('[Faucet] Circle drip requested. Waiting for funds to arrive...');
          fundedViaDrip = true;
          txHash = 'circle-faucet-drip';

          // Wait (up to ~60s) for the drip to land before the Gateway deposit
          let arrived = false;
          for (let i = 0; i < 12; i++) {
            await sleep(5000);
            try {
              const circle = getCircleClient();
              const balanceResponse = await circle.getWalletTokenBalance({ id: wallet.id });
              const usdcToken = balanceResponse.data?.tokenBalances?.find((t: any) => t.token?.symbol === 'USDC');
              if (usdcToken && parseFloat(usdcToken.amount) >= 0.95) {
                arrived = true;
                break;
              }
            } catch { /* keep polling */ }
          }
          if (!arrived) {
            console.warn('[Faucet] Drip not confirmed within 60s — skipping auto-deposit. Funds will appear in the wallet balance shortly.');
          }
        }

        // Automatically deposit to Gateway for unified balance
        try {
          const { autoDepositToGateway } = await import('./tools/gatewayDeposit.js');
          await autoDepositToGateway(wallet.address, "0.95");
        } catch (gatewayErr: any) {
          console.error('[Faucet] Gateway auto-deposit failed:', gatewayErr.message);
          // Even if gateway deposit fails, the user still got the base USDC, so we proceed
        }

        // Update last claimed timestamp in database
        db.run(`
          INSERT INTO FaucetClaims (userId, lastClaimedAt)
          VALUES (?, ?)
          ON CONFLICT(userId) DO UPDATE SET lastClaimedAt = excluded.lastClaimedAt
        `, [userId, now], (updateErr) => {
          if (updateErr) console.error('[Faucet] Failed to save timestamp in DB:', updateErr);
        });

        // Fresh funds arrived — drop any cached balance so the UI updates immediately
        balanceCache.delete(wallet.address);

        return res.json({ success: true, txHash, method: fundedViaDrip ? 'circle-drip' : 'faucet-transfer' });
      } catch (txErr: any) {
        console.error('[Faucet] Claim failed:', txErr.message);
        return res.status(500).json({ error: `Onchain transfer failed: ${txErr.message}` });
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Update Profile
app.post('/api/agent/profile', async (req, res) => {
  const userId = (req as any).userId;
  const { interests, maxPricePerArticle, dailyBudgetUsdc } = req.body;

  try {
    const profile = await loadProfile(userId);
    if (interests && Array.isArray(interests)) profile.interests = interests;
    if (maxPricePerArticle !== undefined) profile.maxPricePerArticle = parseFloat(maxPricePerArticle);
    if (dailyBudgetUsdc !== undefined) profile.dailyBudgetUsdc = parseFloat(dailyBudgetUsdc);

    await saveProfile(userId, profile);
    return res.json({ success: true, profile });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Run Autonomous Agent Loop
app.post('/api/agent/run', async (req, res) => {
  const userId = (req as any).userId;
  try {
    const summary = await runAutonomousAgent(userId, SERVER_URL, OPENAI_API_KEY);
    return res.json(summary);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Ask Agent Question (with Citation Tolls)
app.post('/api/agent/ask', async (req, res) => {
  // We may not strictly need userId for asking general questions right now,
  // but keeping it standard across the API.
  const userId = (req as any).userId;
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  const isMock = !OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here';
  let answer = '';

  try {
    if (isMock) {
      // Smart Mock Answer based on keywords to trigger citations
      const lowerQ = question.toLowerCase();
      if (lowerQ.includes('nanopayment') || lowerQ.includes('payment') || lowerQ.includes('arc')) {
        answer = `AI agent nanopayments on Arc L1 solve API transaction costs. Using Circle gateways, agents sign EIP-3009 authorizations to settle sub-cent payments gaslessly. Inktoll harnesses Arc L1 to batch these nanopayments, keeping developer overhead minimal and user experience flawless.`;
      } else if (lowerQ.includes('zero') || lowerQ.includes('privacy') || lowerQ.includes('zk')) {
        answer = `Zero knowledge proofs like ZK-SNARKs and membership proofs allow users to prove compliance (e.g. being a qualified investor) in DeFi without revealing their identity or balance. This balances onchain transparency with off-chain zero-knowledge computations.`;
      } else {
        answer = `Most Web3 applications are designed for human wallets, but the future belongs to autonomous AI agents. These agents manage their own budgets using spending caps and run loops. Inktoll is the first knowledge economy where agents pay creators gaslessly.`;
      }
    } else {
      // Query LLM
      const model = new ChatOpenAI({
        openAIApiKey: OPENAI_API_KEY,
        modelName: 'gpt-4o-mini',
        temperature: 0.3,
      });

      const systemPrompt = `You are a helpful knowledge assistant. Answer the user's question concisely (2-3 sentences). Use only the information that would reside in technical articles on AI agent payments, zero-knowledge DeFi compliance, or agentic Web3 application design.`;

      const response = await model.call([
        new SystemMessage(systemPrompt),
        new HumanMessage(question),
      ]);
      answer = response.text.trim();
    }

    // Detect citations from answer
    const citations = await detectCitations(userId, answer, OPENAI_API_KEY);

    // Trigger payments for matches
    let paymentResults: any[] = [];
    if (citations.length > 0) {
      paymentResults = await triggerCitationTolls(userId, citations, SERVER_URL);
    }

    return res.json({
      question,
      answer,
      citationsCount: citations.length,
      citations,
      payments: paymentResults,
    });
  } catch (error: any) {
    console.error(`[Agent Q&A Error] ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`[Agent Service] Inktoll AI Reader Agent listening on port ${PORT}`);
});
