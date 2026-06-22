import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from monorepo root
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  databasePath: process.env.DATABASE_PATH || './data/inktoll.db',
  circle: {
    apiKey: process.env.CIRCLE_API_KEY || '',
    gatewayUrl: process.env.CIRCLE_GATEWAY_URL || 'https://api.circle.com/v1/nanopayments',
    walletSetId: process.env.CIRCLE_WALLET_SET_ID || '',
    entitySecret: process.env.CIRCLE_ENTITY_SECRET || '',
  },
  arc: {
    rpcUrl: process.env.ARC_RPC_URL || 'https://arc-node.thecanteenapp.com',
    chainId: parseInt(process.env.ARC_CHAIN_ID || '123456', 10),
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
  ghost: {
    url: process.env.GHOST_BLOG_URL || '',
    apiKey: process.env.GHOST_CONTENT_API_KEY || '',
  },
};

export function validateConfig() {
  const missing: string[] = [];
  if (!config.openai.apiKey) {
    // If not set, we will warn but continue with simulated fallback.
    console.warn('[WARNING] OPENAI_API_KEY is missing. Semantic similarity/LLM features will be simulated.');
  }
  if (!config.circle.apiKey) {
    console.warn('[WARNING] CIRCLE_API_KEY is missing. Circle API responses will be simulated.');
  }
  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }
}
