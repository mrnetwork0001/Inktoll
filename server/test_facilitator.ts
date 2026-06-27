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
} catch (e) {
  console.error(e);
}
