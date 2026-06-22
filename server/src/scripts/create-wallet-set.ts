import { config } from '../config.js';
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runCreateWalletSet() {
  if (!config.circle.apiKey || config.circle.apiKey.startsWith('your_')) {
    console.error('Error: CIRCLE_API_KEY is not set to a real key in .env');
    process.exit(1);
  }

  if (!config.circle.entitySecret) {
    console.error('Error: CIRCLE_ENTITY_SECRET is not set in .env');
    process.exit(1);
  }

  console.log('Initiating Circle Developer Controlled Wallets client...');
  try {
    const client = initiateDeveloperControlledWalletsClient({
      apiKey: config.circle.apiKey,
      entitySecret: config.circle.entitySecret,
    });

    console.log('Creating a new Wallet Set programmatically on Circle...');
    const wsResponse = await client.createWalletSet({
      name: 'Inktoll Wallet Set'
    });

    const walletSetId = wsResponse.data?.walletSet?.id;
    if (walletSetId) {
      console.log(`\n=============================================`);
      console.log(`🎉 SUCCESS: WALLET SET CREATED: ${walletSetId}`);
      console.log(`=============================================\n`);
    } else {
      throw new Error('Failed to retrieve Wallet Set ID from response');
    }

    // Save wallet set ID to the .env file automatically
    const envPath = path.resolve(__dirname, '../../../.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      
      // Remove any existing CIRCLE_WALLET_SET_ID lines
      envContent = envContent.replace(/^CIRCLE_WALLET_SET_ID=.*$/m, '');
      
      // Append the key
      envContent = envContent.trim() + `\nCIRCLE_WALLET_SET_ID=${walletSetId}\n`;
      
      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log('Saved CIRCLE_WALLET_SET_ID to your root .env file automatically.');
    }
  } catch (error: any) {
    console.error('Wallet Set creation failed:', error.message || error);
  }
}

runCreateWalletSet();
