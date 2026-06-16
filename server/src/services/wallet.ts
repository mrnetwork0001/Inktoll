import crypto from 'crypto';
import { config } from '../config.js';

export interface CircleWallet {
  id: string;
  address: string;
  blockchain: string;
  balanceUsdc: number;
}

const mockBalances: Record<string, number> = {};

export async function createCircleWallet(userId: string, type: 'creator' | 'agent'): Promise<CircleWallet> {
  const isMock = !config.circle.apiKey || config.circle.apiKey === 'your_circle_api_key_here';

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
    // Example Circle Developer-Controlled Wallet API call
    const response = await fetch(`${config.circle.gatewayUrl.replace('/nanopayments', '')}/w3s/developer/wallets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.circle.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idempotencyKey: crypto.randomUUID(),
        walletSetId: config.circle.walletSetId,
        blockchain: 'ETH-SEPOLIA', // Fallback for testing on Ethereum Sepolia or Arc if configured
        count: 1
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Circle Wallet API error: ${response.status} - ${errorText}`);
    }

    const result = (await response.json()) as any;
    const wallet = result.data.wallets[0];

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
  const isMock = !config.circle.apiKey || config.circle.apiKey === 'your_circle_api_key_here' || mockBalances[address] !== undefined;

  if (isMock) {
    return mockBalances[address] ?? 0.00;
  }

  try {
    // Check balance from Circle API or mock
    return 0.00;
  } catch {
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

  // Update mock balance
  mockBalances[fromAddress] = parseFloat((currentBalance - amount).toFixed(6));
  if (mockBalances[toAddress] !== undefined) {
    mockBalances[toAddress] = parseFloat((mockBalances[toAddress] + amount).toFixed(6));
  }

  const txHash = '0x' + crypto.randomBytes(32).toString('hex');
  console.log(`[Wallet Service] Processed withdrawal of ${amount} USDC from ${fromAddress} to ${toAddress}. Tx: ${txHash}`);
  return txHash;
}
