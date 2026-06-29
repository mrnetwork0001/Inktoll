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
  if (!client) {
    throw new Error('Circle DCW Client is not initialized (check your CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET in .env)');
  }

  console.log(`[Wallet Service] [REAL] Provisioning ARC-TESTNET wallet for user ${userId} via Circle API...`);
  
  const response = await client.createWallets({
    accountType: 'EOA',
    blockchains: ['ARC-TESTNET'],
    count: 1,
    walletSetId: config.circle.walletSetId,
  });

  const wallet = response.data?.wallets?.[0];
  if (!wallet) {
    throw new Error('No wallets returned from Circle W3S SDK');
  }

  return {
    id: wallet.id,
    address: wallet.address,
    blockchain: wallet.blockchain,
    balanceUsdc: 0.00,
  };
}

export async function getWalletBalance(address: string): Promise<number> {
  const client = getCircleClient();
  if (!client) {
    throw new Error('Circle DCW Client is not initialized');
  }

  const db = getDb();
  let walletId = '';
  
  // Find creator wallet ID
  const creator = db.prepare('SELECT wallet_id FROM creators WHERE wallet_address = ?').get(address) as any;
  if (creator) {
    walletId = creator.wallet_id;
  }
  
  if (!walletId) {
    // In Inktoll, reader agents might store their wallet ID or use their address.
    // If we don't store reader wallet IDs in SQLite, we look them up via listWallets.
    const walletsResponse = await client.listWallets({
      address: address,
      blockchain: 'ARC-TESTNET',
    });
    const wallet = walletsResponse.data?.wallets?.[0];
    if (wallet) {
      walletId = wallet.id;
    }
  }

  if (!walletId) {
    console.warn(`[Wallet Service] Wallet ID not found in database or Circle for address ${address}. Assuming EOA, returning 0.00`);
    return 0.00;
  }

  const balanceResponse = await client.getWalletTokenBalance({
    id: walletId,
  });
  const tokenBalances = balanceResponse.data?.tokenBalances ?? [];
  
  // Look for USDC on Arc Testnet
  const usdcToken = tokenBalances.find((t: any) => t.token?.symbol === 'USDC');
  if (usdcToken) {
    return parseFloat(usdcToken.amount);
  }
  return 0.00;
}

export async function processWithdrawal(fromAddress: string, toAddress: string, amount: number): Promise<string> {
  const client = getCircleClient();
  if (!client) {
    throw new Error('Circle DCW Client is not initialized');
  }

  const currentBalance = await getWalletBalance(fromAddress);
  if (currentBalance < amount) {
    throw new Error(`Insufficient balance: wallet has ${currentBalance} USDC, requested ${amount} USDC`);
  }

  const db = getDb();
  let walletId = '';
  const creator = db.prepare('SELECT wallet_id FROM creators WHERE wallet_address = ?').get(fromAddress) as any;
  if (creator) {
    walletId = creator.wallet_id;
  } else {
    const walletsResponse = await client.listWallets({
      address: fromAddress,
      blockchain: 'ARC-TESTNET',
    });
    const wallet = walletsResponse.data?.wallets?.[0];
    if (wallet) {
      walletId = wallet.id;
    }
  }

  if (!walletId) {
    throw new Error(`Wallet ID not found for address ${fromAddress}`);
  }

  const balanceResponse = await client.getWalletTokenBalance({
    id: walletId,
  });
  const tokenBalances = balanceResponse.data?.tokenBalances ?? [];
  const usdcToken = tokenBalances.find((t: any) => t.token?.symbol === 'USDC' && t.token?.tokenAddress);
  if (!usdcToken || !usdcToken.token?.tokenAddress) {
    throw new Error('USDC token not found in wallet on Arc Testnet');
  }

  const transferResponse = await client.createTransaction({
    walletId: walletId,
    tokenAddress: usdcToken.token.tokenAddress,
    blockchain: 'ARC-TESTNET',
    destinationAddress: toAddress,
    amounts: [amount.toString()],
    fee: {
      type: 'level',
      config: { feeLevel: 'MEDIUM' },
    },
  });

  const txId = transferResponse.data?.id;
  if (!txId) {
    throw new Error('Failed to initiate live transfer on Circle');
  }

  console.log(`[Wallet Service] Real Arc Testnet withdrawal transaction initiated: ${txId}`);

  let state = 'INITIATED';
  let txHash = '';

  for (let i = 0; i < 15; i++) {
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
}

export async function requestFaucetFunds(address: string, type: 'creator' | 'agent'): Promise<{ txHash: string; balanceUsdc: number }> {
  const client = getCircleClient();
  if (!client) {
    throw new Error('Circle DCW Client is not initialized');
  }

  console.log(`[Wallet Service] [REAL Faucet] Requesting ARC-TESTNET tokens for ${address}...`);
  const response = await client.requestTestnetTokens({
    address: address,
    blockchain: 'ARC-TESTNET',
    usdc: true
  });
  
  console.log(`[Wallet Service] [REAL Faucet] Faucet request submitted successfully. Faucet ID: ${response.data?.faucetQueueId}`);
  
  // Wait a brief moment and check balance
  await new Promise(resolve => setTimeout(resolve, 5000));
  const nextBal = await getWalletBalance(address);

  return {
    txHash: response.data?.faucetQueueId || crypto.randomUUID(),
    balanceUsdc: nextBal,
  };
}
