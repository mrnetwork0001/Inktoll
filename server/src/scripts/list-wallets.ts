import { config } from '../config.js';
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

async function runListWallets() {
  if (!config.circle.apiKey || config.circle.apiKey.startsWith('your_')) {
    console.error('Error: CIRCLE_API_KEY is not set to a real key in .env');
    process.exit(1);
  }

  if (!config.circle.walletSetId || config.circle.walletSetId.startsWith('your_')) {
    console.error('Error: CIRCLE_WALLET_SET_ID is not set to a real ID in .env');
    process.exit(1);
  }

  console.log('Initiating Circle client...');
  try {
    const client = initiateDeveloperControlledWalletsClient({
      apiKey: config.circle.apiKey,
      entitySecret: config.circle.entitySecret,
    });

    console.log(`Fetching wallets for Wallet Set: ${config.circle.walletSetId}...\n`);
    const response = await client.listWallets({
      walletSetId: config.circle.walletSetId,
    });

    const wallets = response.data?.wallets ?? [];
    if (wallets.length === 0) {
      console.log('No wallets have been created in this Wallet Set yet.');
      console.log('To create a wallet, you can log in as a creator on the Inktoll dashboard, or run a wallet creation script.');
    } else {
      console.log('================================================================');
      console.log('💼 WALLETS IN YOUR WALLET SET:');
      console.log('================================================================');
      wallets.forEach((w: any, index: number) => {
        console.log(`${index + 1}. [${w.blockchain}]`);
        console.log(`   Wallet ID: ${w.id}`);
        console.log(`   Address:   ${w.address}`);
        console.log(`   Status:    ${w.state}`);
        console.log('----------------------------------------------------------------');
      });
    }
  } catch (error: any) {
    console.error('Failed to fetch wallets:', error.message || error);
  }
}

runListWallets();
