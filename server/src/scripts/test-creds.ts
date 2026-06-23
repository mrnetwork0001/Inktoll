import { config } from '../config.js';
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

async function testCreds() {
  console.log('Testing Circle Credentials...');
  try {
    const client = initiateDeveloperControlledWalletsClient({
      apiKey: config.circle.apiKey,
      entitySecret: config.circle.entitySecret,
    });
    const wallets = await client.listWallets({
        walletSetId: config.circle.walletSetId
    });
    console.log('SUCCESS! Credentials are valid.');
    console.log(`Found ${wallets.data?.wallets?.length || 0} wallets in the set.`);
  } catch (error: any) {
    console.error('FAILED:', error?.response?.data || error.message);
  }
}

testCreds();
