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
  // All signatures must be real and processed by the Facilitator.
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
      network: `eip155:${config.arc.chainId}`,
      asset: config.arc.usdcAddress,
      amount: value,
      payTo: auth.toAddress,
      maxTimeoutSeconds: 3600,
      extra: {
        name: 'GatewayWalletBatched',
        version: '1',
        verifyingContract: config.arc.verifyingContract,
      }
    };

    paymentPayload = {
      x402Version: 2,
      resource: {
        url: 'http://localhost:3001/api/citations',
        description: 'Citation toll payment for reading creator content',
        mimeType: 'application/json'
      },
      accepted: paymentRequirements,
      payload: {
        signature: auth.signature,
        authorization: {
          from: auth.fromAddress,
          to: auth.toAddress,
          value,
          validAfter: '0',
          validBefore: auth.deadline.toString(),
          nonce: auth.nonce,
        }
      }
    };
  }

  console.log('[Gateway Service] Settling via Circle Gateway Facilitator API...');
  let settleResult: any;
  try {
    settleResult = await facilitator.settle(paymentPayload, paymentRequirements);
    console.log(`[Gateway Service] Real payment settlement response:`, settleResult);
  } catch (error: any) {
    console.error('[Gateway Service] Error settling with Facilitator:', error, error.response?.data, error.details);
    throw new Error(`Circle Gateway Facilitator settlement failed: ${error.response?.data?.message || error.message || 'Unknown error'}`);
  }

  if (settleResult.success === false || settleResult.errorReason) {
    throw new Error(`Circle Gateway Facilitator settlement failed: ${settleResult.errorReason || 'Unknown error'}`);
  }

  return {
    txHash: settleResult.transaction || settleResult.transactionId || settleResult.settlementId || crypto.randomUUID(),
    status: 'settled',
  };
}
