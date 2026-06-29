import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from monorepo root
dotenv.config({ path: path.join(__dirname, '../../.env'), override: true });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  databasePath: process.env.DATABASE_PATH || './data/inktoll.db',
  circle: {
    apiKey: process.env.CIRCLE_API_KEY || '',
    gatewayUrl: process.env.CIRCLE_GATEWAY_URL || 'https://gateway-api-testnet.circle.com',
    walletSetId: process.env.CIRCLE_WALLET_SET_ID || '',
    entitySecret: process.env.CIRCLE_ENTITY_SECRET || '',
  },
  arc: {
    rpcUrl: process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.network',
    chainId: parseInt(process.env.ARC_CHAIN_ID || '5042002', 10),
    verifyingContract: process.env.ARC_VERIFYING_CONTRACT || '0x0077777d7EBA4688BDeF3E311b846F25870A19B9',
    usdcAddress: process.env.ARC_USDC_ADDRESS || '0x3600000000000000000000000000000000000000',
    blockchainName: process.env.ARC_BLOCKCHAIN_NAME || 'ARC-TESTNET',
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
