import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';
import { recordPurchase } from '../budget.js';
import crypto from 'crypto';
import { db } from '../db.js';

export interface PayResult {
  success: boolean;
  article?: any;
  error?: string;
}

import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

let circleClient: any = null;
export function getCircleClient() {
  if (!circleClient && process.env.CIRCLE_API_KEY && process.env.CIRCLE_ENTITY_SECRET) {
    circleClient = initiateDeveloperControlledWalletsClient({
      apiKey: process.env.CIRCLE_API_KEY,
      entitySecret: process.env.CIRCLE_ENTITY_SECRET,
    });
  }
  return circleClient;
}

export async function getOrCreateAgentWallet(userId: string): Promise<{ id: string, address: string }> {
  return new Promise((resolve, reject) => {
    db.get('SELECT walletId, agentAddress FROM AgentProfiles WHERE userId = ?', [userId], async (err, row: any) => {
      if (err) return reject(err);
      
      if (row && row.walletId && row.agentAddress) {
        return resolve({ id: row.walletId, address: row.agentAddress });
      }

      // Create new wallet via Circle
      try {
        const client = getCircleClient();
        if (!client) throw new Error('Circle Client not initialized');

        console.log(`[Agent Wallet] Provisioning new Developer-Controlled Wallet for agent...`);
        const response = await client.createWallets({
          accountType: 'EOA',
          blockchains: [(process.env.ARC_BLOCKCHAIN_NAME as any) || 'ARC-TESTNET'],
          count: 1,
          walletSetId: process.env.CIRCLE_WALLET_SET_ID || '',
        });

        const wallet = response.data?.wallets?.[0];
        if (!wallet) throw new Error('No wallets returned from Circle API');

        console.log(`[Agent Wallet] Generated new agent wallet for ${userId}: ${wallet.address}`);
        
        db.run(`
          INSERT INTO AgentProfiles (userId, interests, maxPricePerArticle, dailyBudgetUsdc, agentAddress, walletId)
          VALUES (?, '["AI agent payments", "Web3 machine economy", "stablecoin-native L1", "Zero knowledge proofs", "DeFi privacy"]', 0.05, 1.00, ?, ?)
          ON CONFLICT(userId) DO UPDATE SET
            agentAddress=excluded.agentAddress,
            walletId=excluded.walletId
        `, [userId, wallet.address, wallet.id], (updateErr) => {
          if (updateErr) return reject(updateErr);
          resolve({ id: wallet.id, address: wallet.address });
        });
      } catch (e) {
        reject(e);
      }
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
    const articleUrl = `${apiUrl}/api/articles/${slug}`;
    console.log(`[Pay Tool] Paying for article: ${articleUrl}`);

    const nonce = '0x' + crypto.randomBytes(32).toString('hex');
    const deadline = Math.floor(Date.now() / 1000) + 86400 * 365;
    const value = ethers.parseUnits(price.toString(), 6);

    const domain = {
      name: 'GatewayWalletBatched',
      version: '1',
      chainId: parseInt(process.env.ARC_CHAIN_ID || '5042002', 10),
      verifyingContract: process.env.ARC_VERIFYING_CONTRACT || '0x0077777d7EBA4688BDeF3E311b846F25870A19B9'
    };

    const types = {
      TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' }
      ]
    };

    const typedValue = {
      from: agentWallet.address,
      to: recipientWallet,
      value: value.toString(),
      validAfter: 0,
      validBefore: deadline,
      nonce: nonce
    };

    const typedData = {
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' },
          { name: 'verifyingContract', type: 'address' }
        ],
        ...types
      },
      primaryType: 'TransferWithAuthorization',
      domain,
      message: typedValue
    };

    const circle = getCircleClient();
    console.log(`[Pay Tool] Requesting signature from Circle Secure Enclave...`);
    const signRes = await circle.signTypedData({
      walletId: agentWallet.id,
      data: JSON.stringify(typedData)
    });

    let signature = signRes.data?.signature;

    if (!signature) throw new Error('Failed to retrieve signature');

    const authHeaderPayload = JSON.stringify({
      x402Version: 2,
      resource: {
        url: articleUrl,
        description: 'Payment for reading creator article',
        mimeType: 'application/json'
      },
      accepted: {
        scheme: 'exact',
        network: `eip155:${domain.chainId}`,
        asset: process.env.ARC_USDC_ADDRESS || '0x0000000000000000000000000000000000000000',
        amount: typedValue.value.toString(),
        payTo: recipientWallet,
        maxTimeoutSeconds: 3600,
        extra: {
          name: domain.name,
          version: domain.version,
          verifyingContract: domain.verifyingContract
        }
      },
      payload: {
        authorization: {
          from: agentWallet.address,
          to: recipientWallet,
          value: typedValue.value.toString(),
          validAfter: typedValue.validAfter.toString(),
          validBefore: typedValue.validBefore.toString(),
          nonce: typedValue.nonce
        },
        signature: signature
      }
    });
    const authHeader = Buffer.from(authHeaderPayload).toString('base64');
    
    console.log(`[Pay Tool] Submitting payment to article url with signature...`);
    const articleResponse = await fetch(articleUrl, {
      headers: {
        'x-payment-authorization': authHeader,
        'Accept': 'application/json'
      }
    });
    
    const status = articleResponse.status;
    const data = await articleResponse.json();

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
    throw new Error(`Server rejected request with status: ${status}`);
  } catch (err: any) {
    console.error(`[Pay Tool] Real payment failed:`, err.stack || err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}
