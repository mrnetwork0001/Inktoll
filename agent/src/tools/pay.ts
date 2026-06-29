import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';
import { recordPurchase } from '../budget.js';
import { GatewayClient } from '@circle-fin/x402-batching/client';
import { db } from '../db.js';

export interface PayResult {
  success: boolean;
  article?: any;
  error?: string;
}

export async function getOrCreateAgentWallet(userId: string): Promise<ethers.Wallet> {
  if (process.env.AGENT_PRIVATE_KEY) {
    // Legacy fallback for dev if needed
    return new ethers.Wallet(process.env.AGENT_PRIVATE_KEY);
  }

  return new Promise((resolve, reject) => {
    db.get('SELECT agentPrivateKey FROM AgentProfiles WHERE userId = ?', [userId], (err, row: any) => {
      if (err) return reject(err);
      
      if (row && row.agentPrivateKey) {
        return resolve(new ethers.Wallet(row.agentPrivateKey));
      }

      // Create new wallet
      const wallet = ethers.Wallet.createRandom();
      console.log(`[Agent Wallet] Generated new agent wallet for ${userId}: ${wallet.address}`);
      
      // Update the DB with the new key. 
      // If the row doesn't exist, we insert it with defaults.
      db.run(`
        INSERT INTO AgentProfiles (userId, interests, maxPricePerArticle, dailyBudgetUsdc, agentAddress, agentPrivateKey)
        VALUES (?, '["AI agent payments", "Web3 machine economy", "stablecoin-native L1", "Zero knowledge proofs", "DeFi privacy"]', 0.05, 1.00, ?, ?)
        ON CONFLICT(userId) DO UPDATE SET
          agentAddress=excluded.agentAddress,
          agentPrivateKey=excluded.agentPrivateKey
      `, [userId, wallet.address, wallet.privateKey], (updateErr) => {
        if (updateErr) return reject(updateErr);
        resolve(wallet as any);
      });
    });
  });
}

export async function payAndFetchArticle(
  userId: string,
  slug: string,
  price: number,
  recipientWallet: string,
  apiUrl: string
): Promise<PayResult> {
  const agentWallet = await getOrCreateAgentWallet(userId);

  try {
    console.log(`[Pay Tool] Initiating real x402 flow using @circle-fin/x402-batching GatewayClient...`);
    const client = new GatewayClient({
      chain: (process.env.ARC_CHAIN_NAME as any) || 'arcTestnet',
      privateKey: agentWallet.privateKey as `0x${string}`,
    });

    const articleUrl = `${apiUrl}/api/articles/${slug}`;
    console.log(`[Pay Tool] Paying for article: ${articleUrl}`);

    // Check if EOA wallet has native USDC that needs to be auto-deposited/wrapped
    try {
      console.log(`[Pay Tool] Checking balances for EOA: ${agentWallet.address}...`);
      const balances = await client.getBalances();
      console.log(`[Pay Tool] Balances: Wallet (EOA) = ${balances.wallet.formatted} USDC, Gateway = ${balances.gateway.formattedAvailable} USDC`);
      
      const walletBalance = balances.wallet.balance;
      if (walletBalance > 0n) {
        console.log(`[Pay Tool] Auto-wrapping detected: EOA has ${balances.wallet.formatted} USDC. Depositing to Circle Gateway...`);
        const depositRes = await client.deposit(balances.wallet.formatted);
        console.log(`[Pay Tool] Deposit complete! TX Hash: ${depositRes.depositTxHash}`);
        
        // Wait a brief moment for the API to reflect the deposit
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    } catch (balanceErr: any) {
      console.warn(`[Pay Tool] Failed balance check/auto-wrap:`, balanceErr.message);
    }

    const { status, data } = await client.pay(articleUrl);
    console.log(`[Pay Tool] GatewayClient response status: ${status}`);

    let parsedData: any = data;
    if (typeof data === 'string') {
      try {
        parsedData = JSON.parse(data);
      } catch {
        // ignore
      }
    }

    if ((status === 200 || status === 201) && parsedData && parsedData.paid && parsedData.article) {
      await recordPurchase(userId, slug, price);
      return {
        success: true,
        article: parsedData.article,
      };
    }
    throw new Error(`Facilitator rejected request with status: ${status}`);
  } catch (err: any) {
    console.error(`[Pay Tool] Real payment failed:`, err.stack || err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}
