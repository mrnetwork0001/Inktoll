import crypto from 'crypto';
import { config } from '../config.js';
import { getDb } from '../db/index.js';
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

export interface CircleWallet {
  id: string;
  address: string;
  blockchain: string;
  balanceUsdc: number;
}

const mockBalances: Record<string, number> = {};
let circleClient: any = null;

function getCircleClient() {
  if (!circleClient && config.circle.apiKey && config.circle.entitySecret) {
    circleClient = initiateDeveloperControlledWalletsClient({
      apiKey: config.circle.apiKey,
      entitySecret: config.circle.entitySecret,
    });
  }
  return circleClient;
}

export async function createCircleWallet(userId: string, type: 'creator' | 'agent'): Promise<CircleWallet> {
  const client = getCircleClient();
  const isMock = !client || config.circle.apiKey === 'your_circle_api_key_here';

  if (isMock) {
    const address = '0x' + crypto.randomBytes(20).toString('hex');
    const id = crypto.randomUUID();
    const balanceUsdc = type === 'agent' ? 10.00 : 0.00; // Agent gets testnet USDC faucet balance
    mockBalances[address] = balanceUsdc;
    console.log(`[Wallet Service] [MOCK] Created ${type} wallet for ${userId}: ${address}`);
    return {
      id,
      address,
      blockchain: 'arc-testnet',
      balanceUsdc,
    };
  }

  try {
    console.log(`[Wallet Service] [REAL] Provisioning wallet for user ${userId} via Circle API...`);
    const isSandbox = config.circle.apiKey.startsWith('TEST_API_KEY');
    
    const response = await client.createWallets({
      accountType: 'EOA',
      blockchains: ['ETH-SEPOLIA'], // Default blockchain
      count: 1,
      walletSetId: config.circle.walletSetId,
    });

    const wallet = response.data?.wallets?.[0];
    if (!wallet) {
      throw new Error('No wallets returned from SDK');
    }

    return {
      id: wallet.id,
      address: wallet.address,
      blockchain: wallet.blockchain,
      balanceUsdc: 0.00,
    };
  } catch (error: any) {
    console.error(`[Wallet Service] Failed to create wallet: ${error.message}. Falling back to mock.`);
    const address = '0x' + crypto.randomBytes(20).toString('hex');
    const balanceUsdc = type === 'agent' ? 10.00 : 0.00;
    mockBalances[address] = balanceUsdc;
    return {
      id: crypto.randomUUID(),
      address,
      blockchain: 'arc-testnet',
      balanceUsdc,
    };
  }
}

export async function getWalletBalance(address: string): Promise<number> {
  const client = getCircleClient();
  const isMock = !client || config.circle.apiKey === 'your_circle_api_key_here' || mockBalances[address] !== undefined;

  if (isMock) {
    return mockBalances[address] ?? 0.00;
  }

  try {
    const db = getDb();
    let walletId = '';
    
    const creator = db.prepare('SELECT wallet_id FROM creators WHERE wallet_address = ?').get(address);
    if (creator) {
      walletId = creator.wallet_id;
    }
    
    if (walletId) {
      const balanceResponse = await client.getWalletTokenBalance({
        id: walletId,
      });
      const tokenBalances = balanceResponse.data?.tokenBalances ?? [];
      const usdcToken = tokenBalances.find((t: any) => t.token?.symbol === 'USDC');
      if (usdcToken) {
        return parseFloat(usdcToken.amount);
      }
    }
    return mockBalances[address] ?? 0.00;
  } catch (error: any) {
    console.error(`[Wallet Service] Error getting balance: ${error.message}. Falling back to mock.`);
    return mockBalances[address] ?? 0.00;
  }
}

export function updateMockBalance(address: string, newBalance: number) {
  mockBalances[address] = newBalance;
}

export async function processWithdrawal(fromAddress: string, toAddress: string, amount: number): Promise<string> {
  const currentBalance = await getWalletBalance(fromAddress);
  if (currentBalance < amount) {
    throw new Error('Insufficient balance');
  }

  const client = getCircleClient();
  const isMock = !client || config.circle.apiKey === 'your_circle_api_key_here' || mockBalances[fromAddress] !== undefined;

  if (isMock) {
    mockBalances[fromAddress] = parseFloat((currentBalance - amount).toFixed(6));
    if (mockBalances[toAddress] !== undefined) {
      mockBalances[toAddress] = parseFloat((mockBalances[toAddress] + amount).toFixed(6));
    }

    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    console.log(`[Wallet Service] Processed withdrawal of ${amount} USDC from ${fromAddress} to ${toAddress}. Tx: ${txHash}`);
    return txHash;
  }

  try {
    const db = getDb();
    const creator = db.prepare('SELECT wallet_id FROM creators WHERE wallet_address = ?').get(fromAddress);
    if (!creator || !creator.wallet_id) {
      throw new Error('Wallet ID not found in database');
    }

    const balanceResponse = await client.getWalletTokenBalance({
      id: creator.wallet_id,
    });
    const tokenBalances = balanceResponse.data?.tokenBalances ?? [];
    const usdcToken = tokenBalances.find((t: any) => t.token?.symbol === 'USDC');
    if (!usdcToken || !usdcToken.token?.tokenAddress) {
      throw new Error('USDC token not found in wallet');
    }

    const transferResponse = await client.createTransaction({
      walletId: creator.wallet_id,
      tokenAddress: usdcToken.token.tokenAddress,
      destinationAddress: toAddress,
      amounts: [amount.toString()],
      fee: {
        type: 'level',
        config: { feeLevel: 'MEDIUM' },
      },
    });

    const txId = transferResponse.data?.id;
    console.log(`[Wallet Service] Real withdrawal transaction initiated: ${txId}`);

    let state = 'INITIATED';
    let txHash = '';

    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const txResponse = await client.getTransaction({ id: txId });
      const tx = txResponse.data?.transaction;
      state = tx?.state || 'INITIATED';
      txHash = tx?.txHash || '';
      if (state === 'COMPLETE' || state === 'FAILED' || state === 'DENIED') {
        break;
      }
    }

    if (state !== 'COMPLETE' && state !== 'CONFIRMED' && state !== 'SENT') {
      throw new Error(`Transaction failed with state: ${state}`);
    }

    return txHash || `tx-${txId}`;
  } catch (error: any) {
    console.error(`[Wallet Service] Real withdrawal failed:`, error);
    throw new Error(`Real withdrawal failed: ${error.message}`);
  }
}

export async function requestFaucetFunds(address: string, type: 'creator' | 'agent'): Promise<{ txHash: string; balanceUsdc: number }> {
  const client = getCircleClient();
  const isMock = !client || config.circle.apiKey === 'your_circle_api_key_here' || mockBalances[address] !== undefined;

  if (isMock) {
    const current = mockBalances[address] ?? 0.00;
    const added = type === 'agent' ? 10.00 : 5.00;
    const next = parseFloat((current + added).toFixed(6));
    mockBalances[address] = next;
    console.log(`[Wallet Service] [MOCK Faucet] Funded ${address} with ${added} USDC.`);
    return {
      txHash: '0x' + crypto.randomBytes(32).toString('hex'),
      balanceUsdc: next,
    };
  }

  try {
    console.log(`[Wallet Service] [REAL Faucet] Requesting testnet tokens for ${address}...`);
    // Request USDC testnet tokens on ETH-SEPOLIA
    const response = await client.requestTestnetTokens({
      address: address,
      blockchain: 'ETH-SEPOLIA',
      usdc: true
    });
    
    console.log(`[Wallet Service] [REAL Faucet] Faucet request submitted successfully.`);
    // Wait a brief moment and check balance
    await new Promise(resolve => setTimeout(resolve, 2000));
    const nextBal = await getWalletBalance(address);

    return {
      txHash: '0x' + crypto.randomBytes(32).toString('hex'), // Faucet does not return txn hash, so return mock hash
      balanceUsdc: nextBal,
    };
  } catch (error: any) {
    console.error(`[Wallet Service] Real Faucet request failed: ${error.message}. Falling back to mock.`);
    const current = mockBalances[address] ?? 0.00;
    const added = type === 'agent' ? 10.00 : 5.00;
    const next = parseFloat((current + added).toFixed(6));
    mockBalances[address] = next;
    return {
      txHash: '0x' + crypto.randomBytes(32).toString('hex'),
      balanceUsdc: next,
    };
  }
}

