import { config } from '../config.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateAndEncryptEntitySecret() {
  if (!config.circle.apiKey || config.circle.apiKey.startsWith('your_') || config.circle.apiKey.includes('your_circle_api_key_here')) {
    console.error('Error: CIRCLE_API_KEY is not set to a real key in .env');
    process.exit(1);
  }

  // 1. Fetch Circle's Developer Public Key
  const isSandbox = config.circle.apiKey.startsWith('TEST_API_KEY');
  const domain = isSandbox ? 'https://api-sandbox.circle.com' : 'https://api.circle.com';
  const url = `${domain}/v1/w3s/config/entity/publicKey`;
  
  console.log(`Fetching Circle public key from ${url}...`);
  let publicKeyPem = '';
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.circle.apiKey}`
      }
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`Failed to fetch public key: ${res.status} - ${err}`);
      process.exit(1);
    }

    const json = await res.json() as any;
    publicKeyPem = json.data.publicKey;
  } catch (error: any) {
    console.error('Network error fetching public key:', error.message);
    process.exit(1);
  }

  // 2. Generate random 32-byte hex key (64 characters)
  const entitySecretHex = crypto.randomBytes(32).toString('hex');
  console.log('Plain Entity Secret (Keep this highly secure!):', entitySecretHex);

  // 3. Encrypt the secret using Circle public key (RSA-OAEP, SHA-256)
  let ciphertextBase64 = '';
  try {
    const encrypted = crypto.publicEncrypt(
      {
        key: publicKeyPem,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      Buffer.from(entitySecretHex)
    );
    ciphertextBase64 = encrypted.toString('base64');
  } catch (error: any) {
    console.error('Encryption failed:', error.message);
    process.exit(1);
  }

  console.log('\n=============================================');
  console.log('🎉 SUCCESS: ENTITY SECRET CIPHERTEXT GENERATED!');
  console.log('=============================================\n');
  console.log(ciphertextBase64);
  console.log('\n=============================================\n');
  console.log('1. Copy the long ciphertext string above and paste it into the "Entity Secret Ciphertext" box in your Circle Console.');
  console.log('2. Click "Register" in the console.');

  // 4. Save the plain entity secret to the .env file automatically
  try {
    const envPath = path.resolve(__dirname, '../../../.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      
      // Remove any existing CIRCLE_ENTITY_SECRET lines
      envContent = envContent.replace(/^CIRCLE_ENTITY_SECRET=.*$/m, '');
      
      // Append the new one
      envContent = envContent.trim() + `\n\n# Circle Entity Secret for Programmatic Signing\nCIRCLE_ENTITY_SECRET=${entitySecretHex}\n`;
      
      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log('\nSaved CIRCLE_ENTITY_SECRET to your root .env file automatically.');
    }
  } catch (envError: any) {
    console.warn('\nCould not automatically write to .env. Please add it manually as:');
    console.log(`CIRCLE_ENTITY_SECRET=${entitySecretHex}`);
  }
}

generateAndEncryptEntitySecret();
