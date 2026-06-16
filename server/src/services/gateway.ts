import crypto from 'crypto';
import { updateMockBalance, getWalletBalance } from './wallet.js';

export interface SettleAuthorization {
  fromAddress: string;
  toAddress: string;
  amount: number;
  signature: string;
  nonce: string;
  deadline: number;
}

export async function submitGatewayPayment(auth: SettleAuthorization): Promise<{ txHash: string; status: 'settled' | 'pending' }> {
  console.log(`[Gateway Service] Submitting payment to Circle Gateway:
    From: ${auth.fromAddress}
    To: ${auth.toAddress}
    Amount: ${auth.amount} USDC
    Signature: ${auth.signature.substring(0, 10)}...`);

  // In a real environment, we would post to CIRCLE_GATEWAY_URL
  // e.g. await fetch(config.circle.gatewayUrl, { ... })

  // Let's settle the mock balances in our state
  const senderBalance = await getWalletBalance(auth.fromAddress);
  const recipientBalance = await getWalletBalance(auth.toAddress);

  if (senderBalance < auth.amount) {
    throw new Error(`Insufficient funds in sender wallet: ${auth.fromAddress} has ${senderBalance} USDC, needs ${auth.amount} USDC.`);
  }

  // Settle
  const nextSenderBalance = parseFloat((senderBalance - auth.amount).toFixed(6));
  const nextRecipientBalance = parseFloat((recipientBalance + auth.amount).toFixed(6));

  updateMockBalance(auth.fromAddress, nextSenderBalance);
  updateMockBalance(auth.toAddress, nextRecipientBalance);

  const txHash = '0x' + crypto.randomBytes(32).toString('hex');
  console.log(`[Gateway Service] Payment settled on Arc Testnet. Tx Hash: ${txHash}`);

  return {
    txHash,
    status: 'settled',
  };
}
