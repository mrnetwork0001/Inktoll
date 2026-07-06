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

  console.log(`[Wallet Service] [REAL] Provisioning ${config.arc.blockchainName} wallet for user ${userId} via Circle API...`);
  
  const response = await client.createWallets({
    accountType: 'EOA',
    blockchains: [config.arc.blockchainName as any],
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
  
  // Find creator wallet ID (case-insensitive comparison)
  const creator = db.prepare('SELECT wallet_id FROM creators WHERE LOWER(wallet_address) = LOWER(?)').get(address) as any;
  if (creator) {
    walletId = creator.wallet_id;
  }
  
  if (!walletId) {
    // In Inktoll, reader agents might store their wallet ID or use their address.
    // If we don't store reader wallet IDs in SQLite, we look them up via listWallets.
    const walletsResponse = await client.listWallets({
      address: address,
      blockchain: config.arc.blockchainName as any,
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

  let withdrawAmount = amount;
  const currentBalance = await getWalletBalance(fromAddress);
  
  if (withdrawAmount >= currentBalance) {
    // If withdrawing max, leave a small 0.01 USDC gas buffer to cover the transaction fees
    withdrawAmount = parseFloat((currentBalance - 0.01).toFixed(6));
    if (withdrawAmount <= 0) {
      throw new Error(`Insufficient balance: Wallet balance (${currentBalance} USDC) is too low to cover transaction gas fees.`);
    }
    console.log(`[Wallet Service] Adjusting withdrawal amount from ${amount} to ${withdrawAmount} USDC to leave a fee buffer`);
  }

  const db = getDb();
  let walletId = '';
  const creator = db.prepare('SELECT wallet_id FROM creators WHERE wallet_address = ?').get(fromAddress) as any;
  if (creator) {
    walletId = creator.wallet_id;
  } else {
    const walletsResponse = await client.listWallets({
      address: fromAddress,
      blockchain: config.arc.blockchainName as any,
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

  const feeAmount = parseFloat((withdrawAmount * 0.01).toFixed(6));
  const creatorAmount = parseFloat((withdrawAmount - feeAmount).toFixed(6));
  const treasuryAddress = config.circle.treasuryAddress || '0x0000000000000000000000000000000000001011';

  console.log(`[Wallet Service] Splitting withdrawal: ${creatorAmount} USDC to creator, ${feeAmount} USDC to treasury`);

  // 1. Transfer to Creator (99%)
  const transferResponse = await client.createTransaction({
    walletId: walletId,
    tokenAddress: usdcToken.token.tokenAddress,
    blockchain: config.arc.blockchainName as any,
    destinationAddress: toAddress,
    amounts: [creatorAmount.toString()],
    fee: {
      type: 'level',
      config: { feeLevel: 'MEDIUM' },
    },
  });

  const txId = transferResponse.data?.id;
  if (!txId) {
    throw new Error('Failed to initiate live transfer to creator on Circle');
  }

  // 2. Transfer to Treasury (1%) - Fire and forget
  if (feeAmount > 0) {
    try {
      await client.createTransaction({
        walletId: walletId,
        tokenAddress: usdcToken.token.tokenAddress,
        blockchain: config.arc.blockchainName as any,
        destinationAddress: treasuryAddress,
        amounts: [feeAmount.toString()],
        fee: {
          type: 'level',
          config: { feeLevel: 'MEDIUM' },
        },
      });
      console.log(`[Wallet Service] Treasury fee transfer (${feeAmount} USDC) initiated successfully.`);
    } catch (e: any) {
      console.error(`[Wallet Service] Failed to send treasury fee:`, e.message);
    }
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

  console.log(`[Wallet Service] [REAL Faucet] Requesting ${config.arc.blockchainName} tokens for ${address}...`);
  const response = await client.requestTestnetTokens({
    address: address,
    blockchain: config.arc.blockchainName as any,
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

export async function withdrawFromGateway(address: string, amountUsdcStr: string): Promise<string> {
  const client = getCircleClient();
  if (!client) throw new Error('Circle Client not initialized');

  const GATEWAY_WALLET_ADDRESS = config.arc.verifyingContract || "0x0077777d7EBA4688BDeF3E311b846F25870A19B9";
  const USDC_ADDRESS = config.arc.usdcAddress || "0x3600000000000000000000000000000000000000";
  const BLOCKCHAIN = config.arc.blockchainName as any || "ARC-TESTNET";

  const [whole, decimal = ""] = amountUsdcStr.split(".");
  const parsedAmount = (whole || "0") + (decimal + "000000").slice(0, 6);

  console.log(`[Gateway Sync] Attempting onchain Gateway withdrawal of ${amountUsdcStr} USDC to EOA ${address}...`);
  
  try {
    const withdrawTx = await client.createContractExecutionTransaction({
      walletAddress: address,
      blockchain: BLOCKCHAIN,
      contractAddress: GATEWAY_WALLET_ADDRESS,
      abiFunctionSignature: "withdraw(address,uint256)",
      abiParameters: [USDC_ADDRESS, parsedAmount],
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
    });

    if (!withdrawTx.data?.id) throw new Error("Withdraw Tx failed to initialize.");

    const txId = withdrawTx.data.id;
    let state = 'INITIATED';
    let txHash = '';

    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 1500));
      const txResponse = await client.getTransaction({ id: txId });
      const tx = txResponse.data?.transaction;
      state = tx?.state || 'INITIATED';
      txHash = tx?.txHash || '';
      if (state === 'COMPLETE' || state === 'FAILED' || state === 'DENIED' || state === 'CANCELLED') {
        break;
      }
    }

    if (state !== 'COMPLETE' && state !== 'CONFIRMED' && state !== 'SENT') {
      throw new Error(`Gateway withdraw failed with state: ${state}`);
    }

    return txHash || `tx-${txId}`;
  } catch (err: any) {
    console.warn(`[Gateway Sync] Gateway withdrawal failed: ${err.message}. Falling back to direct agent-to-creator payout to bypass testnet batching lag...`);
    
    const db = getDb();
    
    // Find any agent that paid this creator recently (using case-insensitive LOWER() comparison)
    const payment = db.prepare(`
      SELECT reader_agent_id FROM payments 
      WHERE article_id IN (SELECT id FROM articles WHERE creator_id = (SELECT id FROM creators WHERE LOWER(wallet_address) = LOWER(?)))
      LIMIT 1
    `).get(address) as any;
    
    let agentAddress = '';
    if (payment) {
      const agent = db.prepare('SELECT wallet_address FROM reader_agents WHERE id = ?').get(payment.reader_agent_id) as any;
      if (agent) agentAddress = agent.wallet_address;
    }
    
    // Fallback to any active agent if we can't find a specific one
    if (!agentAddress) {
      const fallbackAgent = db.prepare('SELECT wallet_address FROM reader_agents LIMIT 1').get() as any;
      if (fallbackAgent) agentAddress = fallbackAgent.wallet_address;
    }
    
    if (!agentAddress) {
      throw new Error(`Gateway withdrawal failed, and no reader agents found to execute direct payout fallback.`);
    }
    
    // Resolve agent's wallet ID
    const walletsResponse = await client.listWallets({
      address: agentAddress,
      blockchain: BLOCKCHAIN,
    });
    const agentWallet = walletsResponse.data?.wallets?.[0];
    if (!agentWallet) {
      throw new Error(`Failed to resolve wallet ID for fallback agent: ${agentAddress}`);
    }
    
    console.log(`[Gateway Sync] Executing fallback direct transfer of ${amountUsdcStr} USDC from Agent ${agentAddress} to Creator ${address}...`);
    
    const transferTx = await client.createTransaction({
      walletId: agentWallet.id,
      blockchain: BLOCKCHAIN,
      destinationAddress: address,
      amounts: [amountUsdcStr],
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
      tokenAddress: USDC_ADDRESS
    });
    
    if (!transferTx.data?.id) throw new Error("Fallback transfer failed to initialize.");
    
    const txId = transferTx.data.id;
    let state = 'INITIATED';
    let txHash = '';

    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 1500));
      const txResponse = await client.getTransaction({ id: txId });
      const tx = txResponse.data?.transaction;
      state = tx?.state || 'INITIATED';
      txHash = tx?.txHash || '';
      if (state === 'COMPLETE' || state === 'FAILED' || state === 'DENIED' || state === 'CANCELLED') {
        break;
      }
    }
    
    if (state !== 'COMPLETE' && state !== 'CONFIRMED' && state !== 'SENT') {
      throw new Error(`Fallback transfer failed with state: ${state}`);
    }
    
    console.log(`[Gateway Sync] Fallback transfer succeeded! TxHash: ${txHash}`);
    return txHash || `tx-${txId}`;
  }
}
