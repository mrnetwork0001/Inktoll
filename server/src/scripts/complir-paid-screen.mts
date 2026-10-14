// Pays for one CompliR screen over x402 and prints the fresh verdict.
//   npx tsx src/scripts/complir-paid-screen.mts <address> [amountUsdc]
//
// SPENDS REAL USDC (~0.0081 per screen) on Arc mainnet.
//
// Reads the disposable payer key from /Users/mrnetwork/inktoll-complir-payer.env
// (outside the repo). The key is never logged. Payment is an EIP-3009
// TransferWithAuthorization: the payer only signs, and CompliR's facilitator
// submits it, so this wallet needs USDC but no separate gas balance.
import { readFileSync } from 'node:fs';
import { createPublicClient, http, defineChain, erc20Abi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const KEY_FILE = '/Users/mrnetwork/inktoll-complir-payer.env';
const COMPLIR = process.env.COMPLIR_URL || 'https://trycomplir.xyz';
const USDC = '0x3600000000000000000000000000000000000000' as const;
const RPC = process.env.ARC_RPC_URL || 'https://rpc.mainnet.arc.io';

const arcMainnet = defineChain({
  id: 5042,
  name: 'Arc',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 6 },
  rpcUrls: { default: { http: [RPC] } },
});

function readEnvFile(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const target = (process.argv[2] || '').toLowerCase();
const amountUsdc = Number(process.argv[3] ?? 5);
if (!/^0x[0-9a-f]{40}$/.test(target)) {
  console.error('Usage: npx tsx src/scripts/complir-paid-screen.mts <0xaddress> [amountUsdc]');
  process.exit(1);
}

const env = readEnvFile(KEY_FILE);
const account = privateKeyToAccount(env.COMPLIR_PAYER_PRIVATE_KEY as `0x${string}`);
const publicClient = createPublicClient({ chain: arcMainnet, transport: http(RPC) });

const usdcBalance = async () =>
  publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: 'balanceOf', args: [account.address] });

const before = await usdcBalance();
console.log(`payer   ${account.address}`);
console.log(`balance ${Number(before) / 1e6} USDC`);
if (before === 0n) {
  console.error('Payer wallet is empty. Fund it with a little USDC on Arc mainnet first.');
  process.exit(1);
}

// 1. Unpaid request -> 402 carrying the payment requirements.
const body = JSON.stringify({ address: target, amountUsdc, clientId: process.env.COMPLIR_CLIENT_ID || 'inktoll' });
const challenge = await fetch(`${COMPLIR}/api/v1/screen`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body,
});
if (challenge.status !== 402) {
  console.log(`No payment required (HTTP ${challenge.status}):`);
  console.log(JSON.stringify(await challenge.json(), null, 2).slice(0, 2000));
  process.exit(0);
}

const requirements: any = await challenge.json();
const accept = requirements.accepts?.[0];
if (!accept) throw new Error('402 did not include any payment requirements');
console.log(`price   ${Number(accept.amount) / 1e6} USDC -> ${accept.payTo}  (${accept.network})`);

// 2. Sign an EIP-3009 TransferWithAuthorization. The signature is the payment.
const nowSec = Math.floor(Date.now() / 1000);
const nonce = `0x${Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex')}` as `0x${string}`;
const authorization = {
  from: account.address,
  to: accept.payTo as `0x${string}`,
  value: BigInt(accept.amount),
  validAfter: BigInt(0),
  validBefore: BigInt(nowSec + (accept.maxTimeoutSeconds ?? 60)),
  nonce,
};

const signature = await account.signTypedData({
  domain: {
    name: accept.extra?.name ?? 'USDC',
    version: accept.extra?.version ?? '2',
    chainId: 5042,
    verifyingContract: (accept.asset ?? USDC) as `0x${string}`,
  },
  types: {
    TransferWithAuthorization: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
    ],
  },
  primaryType: 'TransferWithAuthorization',
  message: authorization,
});

// Envelope shape follows the one Inktoll's own x402 client sends
// (agent/src/tools/pay.ts): `accepted` singular, echoing the resource back,
// with the signature inside `payload`.
const payment = {
  x402Version: 2,
  resource: requirements.resource ?? {
    url: '/api/v1/screen',
    description: 'CompliR screen: one address',
    mimeType: 'application/json',
  },
  accepted: {
    scheme: accept.scheme ?? 'exact',
    network: accept.network,
    asset: accept.asset ?? USDC,
    amount: accept.amount,
    payTo: accept.payTo,
    maxTimeoutSeconds: accept.maxTimeoutSeconds ?? 60,
    extra: accept.extra,
  },
  payload: {
    authorization: {
      from: authorization.from,
      to: authorization.to,
      value: authorization.value.toString(),
      validAfter: authorization.validAfter.toString(),
      validBefore: authorization.validBefore.toString(),
      nonce: authorization.nonce,
    },
    signature,
  },
};
const header = Buffer.from(JSON.stringify(payment)).toString('base64');

// 3. Retry with the signed payment attached.
const paid = await fetch(`${COMPLIR}/api/v1/screen`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'PAYMENT-SIGNATURE': header,
    'X-PAYMENT': header, // some x402 servers read this spelling
  },
  body,
});
console.log(`screen  HTTP ${paid.status}`);
const text = await paid.text();
try {
  const verdict = JSON.parse(text);
  console.log(JSON.stringify(verdict, null, 2).slice(0, 2600));
  console.log('\n--- fields the free endpoint does not return ---');
  console.log('reasons:           ', JSON.stringify(verdict.reasons));
  console.log('recommendedLimits: ', JSON.stringify(verdict.recommendedLimits));
  console.log('rationale:         ', (verdict.rationale ?? '').slice(0, 300));
  console.log('eddRequested:      ', JSON.stringify(verdict.eddRequested));
} catch {
  console.log(text.slice(0, 1200));
}

const after = await usdcBalance();
console.log(`\nbalance ${Number(before) / 1e6} -> ${Number(after) / 1e6} USDC (spent ${Number(before - after) / 1e6})`);
