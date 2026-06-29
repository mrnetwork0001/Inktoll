import crypto from 'crypto';
import { getWalletBalance } from './wallet.js';
import { config } from '../config.js';
import { BatchFacilitatorClient } from '@circle-fin/x402-batching/server';

export interface SettleAuthorization {
  fromAddress: string;
  toAddress: string;
  amount: number;
  signature: string;
  nonce: string;
  deadline: number;
}

let facilitatorClient: any = null;

function getFacilitatorClient() {
  if (!facilitatorClient && config.circle.apiKey) {
    console.log('[Gateway Service] Initializing BatchFacilitatorClient:');
    console.log('  URL:', config.circle.gatewayUrl || 'https://gateway-api-testnet.circle.com');
    console.log('  API Key (first 10 chars):', config.circle.apiKey.substring(0, 10) + '...');
    facilitatorClient = new BatchFacilitatorClient({
      url: config.circle.gatewayUrl || 'https://gateway-api-testnet.circle.com',
    });
  }
  return facilitatorClient;
}

export async function submitGatewayPayment(
  auth: SettleAuthorization,
  sdkPayload?: any
): Promise<{ txHash: string; status: 'settled' | 'pending' }> {
  const isMock = auth.signature.startsWith('mock-');
  
  if (isMock) {
    console.log('[Gateway Service] [MOCK] Bypassing Circle Gateway settlement for mock payment');
    return {
      txHash: '0xmock_' + crypto.randomUUID().replace(/-/g, ''),
      status: 'settled',
    };
  }

  console.log(`[Gateway Service] [REAL] Submitting payment to Circle Gateway:
    From: ${auth.fromAddress}
    To: ${auth.toAddress}
    Amount: ${auth.amount} USDC
    Signature: ${auth.signature.substring(0, 10)}...`);

  const facilitator = getFacilitatorClient();
  if (!facilitator) {
    throw new Error('Circle Gateway Facilitator Client is not initialized');
  }

  let paymentPayload: any;
  let paymentRequirements: any;

  if (sdkPayload) {
    paymentPayload = sdkPayload;
    paymentRequirements = sdkPayload.accepted;
  } else {
    const value = Math.round(auth.amount * 1e6).toString(); // USDC uses 6 decimals
    paymentRequirements = {
      scheme: 'exact',
      network: 'eip155:5042002', // Arc testnet
      asset: '0x3600000000000000000000000000000000000000', // USDC on Arc testnet
      amount: value,
      payTo: auth.toAddress,
      maxTimeoutSeconds: 3600,
      extra: {
        name: 'GatewayWalletBatched',
        version: '1',
        verifyingContract: '0x0077777d7EBA4688BDeF3E311b846F25870A19B9', // GatewayWallet verifying contract
      }
    };

    paymentPayload = {
      x402Version: '1.0',
      resource: 'urn:inktoll:citation',
      accepted: paymentRequirements,
      payload: {
        signature: auth.signature,
        nonce: auth.nonce,
        validBefore: auth.deadline,
        validAfter: 0,
        value,
        from: auth.fromAddress,
        to: auth.toAddress,
      }
    };
  }

  console.log('[Gateway Service] Settling via Circle Gateway Facilitator API...');
  const settleResult = await facilitator.settle(paymentPayload, paymentRequirements);
  console.log(`[Gateway Service] Real payment settlement response:`, settleResult);

  if (settleResult.success === false || settleResult.errorReason) {
    throw new Error(`Circle Gateway Facilitator settlement failed: ${settleResult.errorReason || 'Unknown error'}`);
  }

  return {
    txHash: settleResult.transaction || settleResult.transactionId || settleResult.settlementId || crypto.randomUUID(),
    status: 'settled',
  };
}
