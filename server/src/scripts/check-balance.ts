import { config } from '../config.js';
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

async function runCheckBalance() {
  if (!config.circle.apiKey || config.circle.apiKey.startsWith('your_')) {
    console.error('Error: CIRCLE_API_KEY is not set to a real key in .env');
    process.exit(1);
  }

  const walletId = '0ac7a8e4-f93e-5ff2-876d-812fa53d117f';
  console.log(`Checking balance for Wallet ID: ${walletId} (Arc Testnet)...`);

  try {
    const client = initiateDeveloperControlledWalletsClient({
      apiKey: config.circle.apiKey,
      entitySecret: config.circle.entitySecret,
    });

    const response = await client.getWalletTokenBalance({
      id: walletId,
    });

    const tokenBalances = response.data?.tokenBalances ?? [];
    if (tokenBalances.length === 0) {
      console.log('No token balances found. Wallet is empty.');
    } else {
      console.log('\n================================================================');
      console.log('💰 LIVE ARC TESTNET WALLET BALANCES:');
      console.log('================================================================');
      tokenBalances.forEach((tb: any) => {
        console.log(`Token:      ${tb.token?.symbol} (${tb.token?.name})`);
        console.log(`Amount:     ${tb.amount}`);
        console.log(`Address:    ${tb.token?.tokenAddress || 'Native'}`);
        console.log('----------------------------------------------------------------');
      });
    }
  } catch (error: any) {
    console.error('Failed to fetch balance:', error.message || error);
  }
}

runCheckBalance();
