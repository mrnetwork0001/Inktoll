import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const client = initiateDeveloperControlledWalletsClient({
    apiKey: process.env.CIRCLE_API_KEY || '',
    entitySecret: process.env.CIRCLE_ENTITY_SECRET || '',
  });

  const txId = '68246866-e785-5401-86d6-95b8db06114c';
  const txResponse = await client.getTransaction({ id: txId });
  console.log('Transaction Details:', JSON.stringify(txResponse.data?.transaction, null, 2));
}

main().catch(console.error);
