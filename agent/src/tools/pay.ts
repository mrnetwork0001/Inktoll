import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';
import { recordPurchase } from '../budget.js';
import { GatewayClient } from '@circle-fin/x402-batching/client';

export interface PayResult {
  success: boolean;
  article?: any;
  error?: string;
}

const walletPath = path.resolve('./data/agent_wallet.json');

export function getOrCreateAgentWallet(): any {
  const dir = path.dirname(walletPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(walletPath)) {
    const raw = fs.readFileSync(walletPath, 'utf8');
    const data = JSON.parse(raw);
    return new ethers.Wallet(data.privateKey);
  }

  // Create new wallet
  const wallet = ethers.Wallet.createRandom();
  fs.writeFileSync(
    walletPath,
    JSON.stringify(
      {
        address: wallet.address,
        privateKey: wallet.privateKey,
      },
      null,
      2
    )
  );
  console.log(`[Agent Wallet] Generated new agent wallet: ${wallet.address}`);
  return wallet;
}

export async function payAndFetchArticle(
  slug: string,
  price: number,
  recipientWallet: string,
  apiUrl: string
): Promise<PayResult> {
  const agentWallet = getOrCreateAgentWallet();

  try {
    console.log(`[Pay Tool] Initiating real x402 flow using @circle-fin/x402-batching GatewayClient...`);
    const client = new GatewayClient({
      chain: 'arcTestnet',
      privateKey: agentWallet.privateKey as `0x${string}`,
    });

    const articleUrl = `${apiUrl}/api/articles/${slug}`;
    console.log(`[Pay Tool] Paying for article: ${articleUrl}`);
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
      recordPurchase(slug, price);
      return {
        success: true,
        article: parsedData.article,
      };
    }
    throw new Error(`Facilitator rejected request with status: ${status}`);
  } catch (err: any) {
    console.error(`[Pay Tool] Real payment failed: ${err.message}`);
    return {
      success: false,
      error: err.message,
    };
  }
}
export { walletPath };
