import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const settlementId = '484e50b3-0df2-40cd-9555-47a47e262a9d';
  const apiKey = process.env.CIRCLE_API_KEY || '';
  const gatewayUrl = process.env.CIRCLE_GATEWAY_URL || 'https://gateway-api-testnet.circle.com';
  
  const res = await fetch(`${gatewayUrl}/v1/payments/settlements/${settlementId}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });

  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Data:', JSON.stringify(data, null, 2));
}

main().catch(console.error);
