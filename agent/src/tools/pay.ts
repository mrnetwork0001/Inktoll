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
  const isMock = !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here';

  if (!isMock) {
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

      let parsedData = data;
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
      console.warn(`[Pay Tool] SDK payment returned status ${status}. Falling back to custom signature...`);
    } catch (err: any) {
      console.error(`[Pay Tool] Real payment failed: ${err.message}. Falling back to custom signature...`);
    }
  }

  try {
    console.log(`[Pay Tool] Initiating custom x402 payment flow for slug: "${slug}"`);
    console.log(`[Pay Tool] Sender: ${agentWallet.address} -> Recipient: ${recipientWallet}. Amount: ${price} USDC`);

    // 1. Prepare payment details
    const nonce = crypto.randomUUID();
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour deadline

    // 2. Hash message and sign cryptographically
    const value = ethers.parseUnits(price.toString(), 6); // USDC uses 6 decimals
    const messageHash = ethers.solidityPackedKeccak256(
      ['address', 'address', 'uint256', 'string', 'uint256'],
      [agentWallet.address, recipientWallet, value, nonce, deadline]
    );

    const signature = await agentWallet.signMessage(ethers.getBytes(messageHash));

    // 3. Assemble x402 payment authorization header
    const authPayload = {
      fromAddress: agentWallet.address,
      toAddress: recipientWallet,
      amount: price,
      signature,
      nonce,
      deadline,
    };

    const authHeaderValue = JSON.stringify(authPayload);

    // 4. Request the article with the payment header
    const articleUrl = `${apiUrl}/api/articles/${slug}`;
    console.log(`[Pay Tool] Retrying article request to: ${articleUrl} with authorization`);

    const response = await fetch(articleUrl, {
      method: 'GET',
      headers: {
        'X-Payment-Authorization': authHeaderValue,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Server responded with status ${response.status}: ${errorText}`,
      };
    }

    const data = (await response.json()) as any;
    if (data.paid && data.article) {
      // Record purchase in budget tracker
      recordPurchase(slug, price);
      console.log(`[Pay Tool] Payment verified! Article content unlocked successfully.`);
      return {
        success: true,
        article: data.article,
      };
    }

    return {
      success: false,
      error: 'Unexpected server response payload',
    };
  } catch (error: any) {
    console.error(`[Pay Tool] Error: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
}
export { walletPath };
