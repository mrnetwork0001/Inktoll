import { config } from '../config.js';
import { generateEntitySecret, registerEntitySecretCiphertext, initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runRegistration() {
  if (!config.circle.apiKey || config.circle.apiKey.startsWith('your_')) {
    console.error('Error: CIRCLE_API_KEY is not set to a real key in .env');
    process.exit(1);
  }

  console.log('Generating entity secret...');
  const entitySecret = crypto.createHash('sha256').update(crypto.randomBytes(32)).digest('hex');

  console.log('Registering Entity Secret with Circle API...');
  try {
    const baseUrl = 'https://api.circle.com';
    const response = await registerEntitySecretCiphertext({
      apiKey: config.circle.apiKey,
      entitySecret: entitySecret,
      baseUrl
    });

    console.log('\n=============================================');
    console.log('🎉 SUCCESS: ENTITY SECRET REGISTERED SUCCESSFULLY!');
    console.log('=============================================\n');

    // Create wallet set programmatically
    console.log('Creating a new Wallet Set programmatically on Circle...');
    const client = initiateDeveloperControlledWalletsClient({
      apiKey: config.circle.apiKey,
      entitySecret: entitySecret,
    });

    const wsResponse = await client.createWalletSet({
      name: 'Inktoll Wallet Set'
    });

    const walletSetId = wsResponse.data?.walletSet?.id;
    if (walletSetId) {
      console.log(`🎉 SUCCESS: WALLET SET CREATED: ${walletSetId}`);
    } else {
      throw new Error('Failed to retrieve Wallet Set ID from response');
    }

    // Save plain entity secret & wallet set ID to the .env file automatically
    const envPath = path.resolve(__dirname, '../../../.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      
      // Remove any existing CIRCLE_ENTITY_SECRET and CIRCLE_WALLET_SET_ID lines
      envContent = envContent.replace(/^CIRCLE_ENTITY_SECRET=.*$/m, '');
      envContent = envContent.replace(/^CIRCLE_WALLET_SET_ID=.*$/m, '');
      
      // Append the new keys
      envContent = envContent.trim() + `\n\n# Circle Developer Credentials\nCIRCLE_ENTITY_SECRET=${entitySecret}\nCIRCLE_WALLET_SET_ID=${walletSetId}\n`;
      
      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log('Saved CIRCLE_ENTITY_SECRET and CIRCLE_WALLET_SET_ID to your root .env file automatically.');
    }
  } catch (error: any) {
    console.error('Registration failed:', error);
  }
}

runRegistration();
