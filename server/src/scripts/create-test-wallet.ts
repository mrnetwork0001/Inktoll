import { config } from '../config.js';
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

async function runCreateWallet() {
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

    console.log(`Provisioning a new Developer-Controlled Wallet in set: ${config.circle.walletSetId}...`);
    const response = await client.createWallets({
      accountType: 'EOA',
      blockchains: ['ETH-SEPOLIA'], // Default Sepolia testnet blockchain for Developer Controlled Wallets
      count: 1,
      walletSetId: config.circle.walletSetId,
    });

    const wallet = response.data?.wallets?.[0];
    if (wallet) {
      console.log('\n================================================================');
      console.log('🎉 SUCCESS: WALLET CREATED PROGRAMMATICALLY!');
      console.log('================================================================');
      console.log(`Blockchain:    ${wallet.blockchain}`);
      console.log(`Wallet ID:     ${wallet.id}`);
      console.log(`Address:       ${wallet.address}`);
      console.log(`Status:        ${wallet.state}`);
      console.log('================================================================\n');
      console.log('👉 Copy the "Wallet ID" above and paste it into the Faucet input in your Circle Console to add testnet funds!');
    } else {
      throw new Error('No wallets returned in the response');
    }
  } catch (error: any) {
    console.error('Failed to create wallet:', error.message || error);
  }
}

runCreateWallet();
