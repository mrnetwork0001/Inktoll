import { config } from '../config.js';
import crypto from 'crypto';

async function createWalletSet() {
  if (!config.circle.apiKey || config.circle.apiKey.startsWith('your_')) {
    console.error('Error: CIRCLE_API_KEY is not set to a real key in .env');
    process.exit(1);
  }

  const isSandbox = config.circle.apiKey.startsWith('TEST_API_KEY');
  const domain = isSandbox ? 'https://api-sandbox.circle.com' : 'https://api.circle.com';
  const url = `${domain}/v1/w3s/developer/walletSets`;
  
  console.log(`Creating Wallet Set via Circle API: ${url}...`);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.circle.apiKey}`
      },
      body: JSON.stringify({
        idempotencyKey: crypto.randomUUID(),
        name: 'Inktoll Wallet Set'
      })
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`Failed to create Wallet Set: ${res.status} - ${err}`);
      process.exit(1);
    }

    const json = await res.json() as any;
    console.log('\n=============================================');
    console.log('🎉 SUCCESS: WALLET SET CREATED!');
    console.log(`Wallet Set ID: ${json.data.walletSet.id}`);
    console.log('=============================================\n');
    console.log('Please copy the Wallet Set ID above and add it to your root .env file as:');
    console.log(`CIRCLE_WALLET_SET_ID=${json.data.walletSet.id}`);
  } catch (error: any) {
    console.error('Network error:', error.message);
  }
}

createWalletSet();
