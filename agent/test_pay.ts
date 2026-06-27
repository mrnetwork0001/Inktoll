// Fetch Spy
const originalFetch = global.fetch;
global.fetch = async (input: any, init: any) => {
  const url = typeof input === 'string' ? input : input.url;
  console.log(`[Fetch Spy] Outgoing request to: ${url}`);
  try {
    const response = await originalFetch(input, init);
    console.log(`[Fetch Spy] Response status: ${response.status} for ${url}`);
    const clone = response.clone();
    const text = await clone.text();
    console.log(`[Fetch Spy] Response body preview (150 chars):`, text.substring(0, 150));
    return response;
  } catch (err: any) {
    console.error(`[Fetch Spy] Request failed:`, err);
    throw err;
  }
};

import { payAndFetchArticle } from './src/tools/pay.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function run() {
  console.log('Running test payment...');
  const res = await payAndFetchArticle(
    'the-rise-of-the-machine-economy-how-inktoll-is-making-ai-agents-pay-for-content',
    0.005,
    '0xec27bc5b3a8c0fda9614000affd4e0dc8a8469bc',
    'http://localhost:3001'
  );
  console.log('Test pay result:', res);
}

// Wait 3 seconds for server to start
setTimeout(run, 3000);
