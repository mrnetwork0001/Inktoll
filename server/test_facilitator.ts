import { BatchFacilitatorClient } from '@circle-fin/x402-batching/server';
import { config } from './src/config.js';

console.log('API Key:', config.circle.apiKey ? 'Present' : 'Missing');
console.log('Config URL:', config.circle.gatewayUrl);

try {
  // Test default url
  const c1 = new BatchFacilitatorClient({ apiKey: config.circle.apiKey });
  console.log('Default Client URL:', (c1 as any).url);
  
  // Test with sandbox url
  const c2 = new BatchFacilitatorClient({ url: 'https://gateway-api-testnet.circle.com', apiKey: config.circle.apiKey });
  console.log('Testnet Client URL:', (c2 as any).url);
  
  console.log('Attempting mock settle...');
  const res = await c2.settle({
    signature: '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
    nonce: '123',
    validBefore: Math.floor(Date.now() / 1000) + 3600,
    validAfter: 0,
    value: '5000',
    from: '0x260c3FDcf6ecB7CD5a67A33C27565e911b9aDf08',
    to: '0xec27bc5b3a8c0fda9614000affd4e0dc8a8469bc',
  }, {
    scheme: 'exact',
    network: 'eip155:5042002',
    asset: '0x3600000000000000000000000000000000000000',
    amount: '5000',
    payTo: '0xec27bc5b3a8c0fda9614000affd4e0dc8a8469bc',
    extra: {
      name: 'GatewayWalletBatched',
      version: '1',
      verifyingContract: '0x0077777d7EBA4688BDeF3E311b846F25870A19B9',
    }
  });
  console.log('Settle result:', res);
} catch (e) {
  console.error('Test failed with error:', e);
}
