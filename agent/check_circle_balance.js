import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const dbPath = path.join(__dirname, '../server/data/inktoll.json'); // wait, the db is a JSON file or SQLite?
  // Let's read inktoll.json instead of SQLite if the server uses JSON DB.
  // In `server/src/db/index.ts` from earlier: "JSON Database Engine initialized successfully at C:\Users\IFEANYICHUKWU\OneDrive\Desktop\Inktoll\server\data\inktoll.json"
  // Yes! The DB is a JSON file!
  const fs = await import('fs');
  const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

  const creator = dbData.creators[0];
  if (!creator) {
    console.error('No creator found');
    return;
  }

  const walletId = creator.wallet_id;
  const address = creator.wallet_address;
  console.log(`Creator Wallet ID: ${walletId} | Address: ${address}`);

  const client = initiateDeveloperControlledWalletsClient({
    apiKey: process.env.CIRCLE_API_KEY || '',
    entitySecret: process.env.CIRCLE_ENTITY_SECRET || '',
  });

  const balanceResponse = await client.getWalletTokenBalance({
    id: walletId,
  });

  console.log('Circle DCW Token Balances:', JSON.stringify(balanceResponse.data?.tokenBalances, null, 2));
}

main().catch(console.error);
