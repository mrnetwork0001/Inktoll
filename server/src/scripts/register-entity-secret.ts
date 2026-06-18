import { config } from '../config.js';
import { generateEntitySecret, registerEntitySecretCiphertext } from '@circle-fin/developer-controlled-wallets';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runRegistration() {
  if (!config.circle.apiKey || config.circle.apiKey.startsWith('your_')) {
    console.error('Error: CIRCLE_API_KEY is not set to a real key in .env');
    process.exit(1);
  }

  console.log('Generating entity secret using Circle SDK...');
  const entitySecret = generateEntitySecret();

  console.log('Registering Entity Secret with Circle API...');
  try {
    const isSandbox = config.circle.apiKey.startsWith('TEST_API_KEY');
    const baseUrl = isSandbox ? 'https://api-sandbox.circle.com' : 'https://api.circle.com';
    const response = await registerEntitySecretCiphertext({
      apiKey: config.circle.apiKey,
      entitySecret: entitySecret,
      baseUrl
    });

    console.log('\n=============================================');
    console.log('🎉 SUCCESS: ENTITY SECRET REGISTERED SUCCESSFULLY!');
    console.log('=============================================\n');
    console.log('Circle Response Data:', JSON.stringify(response, null, 2));

    // Save the plain entity secret to the .env file automatically
    const envPath = path.resolve(__dirname, '../../../.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      
      // Remove any existing CIRCLE_ENTITY_SECRET lines
      envContent = envContent.replace(/^CIRCLE_ENTITY_SECRET=.*$/m, '');
      
      // Append the new one
      envContent = envContent.trim() + `\n\n# Circle Entity Secret for Programmatic Signing\nCIRCLE_ENTITY_SECRET=${entitySecret}\n`;
      
      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log('Saved CIRCLE_ENTITY_SECRET to your root .env file automatically.');
    }
  } catch (error: any) {
    console.error('Registration failed:', error);
  }
}

runRegistration();
