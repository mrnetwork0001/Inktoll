import { config } from '../config.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateEntitySecretCiphertext } from '@circle-fin/developer-controlled-wallets';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runManualSecret() {
  if (!config.circle.apiKey || config.circle.apiKey.startsWith('your_')) {
    console.error('Error: CIRCLE_API_KEY is not set to a real key in .env');
    process.exit(1);
  }

  try {
    console.log('1. Generating a new Entity Secret...');
    const entitySecretHex = crypto.randomBytes(32).toString('hex');

    console.log('2. Generating Entity Secret Ciphertext via Circle SDK...');
    const ciphertextBase64 = await generateEntitySecretCiphertext({
      apiKey: config.circle.apiKey,
      entitySecret: entitySecretHex,
      baseUrl: 'https://api.circle.com'
    });

    console.log('\n================================================================');
    console.log('🔑 STEP A: PASTE THIS IN YOUR CIRCLE CONSOLE');
    console.log('================================================================');
    console.log(ciphertextBase64);
    console.log('================================================================\n');

    console.log('📝 STEP B: SAVE THIS IN YOUR .ENV AS CIRCLE_ENTITY_SECRET');
    console.log('================================================================');
    console.log(`CIRCLE_ENTITY_SECRET=${entitySecretHex}`);
    console.log('================================================================\n');

    // Automatically append to .env for convenience
    const envPath = path.resolve(__dirname, '../../../.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      envContent = envContent.replace(/^CIRCLE_ENTITY_SECRET=.*$/m, '');
      envContent = envContent.trim() + `\n\n# Circle Entity Secret\nCIRCLE_ENTITY_SECRET=${entitySecretHex}\n`;
      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log('Automatically updated CIRCLE_ENTITY_SECRET in your root .env file.');
    }

  } catch (error: any) {
    console.error('Failed to generate manual secret:', error.message);
  }
}

runManualSecret();
