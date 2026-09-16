import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from monorepo root
dotenv.config({ path: path.join(__dirname, '../../.env'), override: true });

// Arc network identity. Mainnet is chain 5042 ("ARC"); testnet is 5042002
// ("ARC-TESTNET"). Defaults stay on testnet so an un-updated .env keeps
// behaving exactly as before.
const ARC_CHAIN_ID = parseInt(process.env.ARC_CHAIN_ID || '5042002', 10);
const ARC_BLOCKCHAIN_NAME = process.env.ARC_BLOCKCHAIN_NAME || 'ARC-TESTNET';
const IS_MAINNET = ARC_CHAIN_ID === 5042 || ARC_BLOCKCHAIN_NAME.toUpperCase() === 'ARC';

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  databasePath: process.env.DATABASE_PATH || './data/inktoll.db',
  circle: {
    apiKey: process.env.CIRCLE_API_KEY || '',
    gatewayUrl: process.env.CIRCLE_GATEWAY_URL || 'https://gateway-api-testnet.circle.com',
    walletSetId: process.env.CIRCLE_WALLET_SET_ID || '',
    entitySecret: process.env.CIRCLE_ENTITY_SECRET || '',
    treasuryAddress: process.env.CIRCLE_TREASURY_ADDRESS || '0x0000000000000000000000000000000000001011',
  },
  arc: {
    rpcUrl: process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.io',
    chainId: ARC_CHAIN_ID,
    verifyingContract: process.env.ARC_VERIFYING_CONTRACT || '0x0077777d7EBA4688BDeF3E311b846F25870A19B9',
    usdcAddress: process.env.ARC_USDC_ADDRESS || '0x3600000000000000000000000000000000000000',
    blockchainName: ARC_BLOCKCHAIN_NAME,
    // Derived network identity — everything downstream reads these instead of
    // hardcoding testnet values.
    isMainnet: IS_MAINNET,
    networkLabel: IS_MAINNET ? 'arc' : 'arc-testnet',
    x402Network: `eip155:${ARC_CHAIN_ID}`,
    explorerUrl: process.env.ARC_EXPLORER_URL || (IS_MAINNET ? 'https://explorer.arc.io' : 'https://testnet.arcscan.app'),
  },
  // Public origin of this API, advertised to agents in the x402 challenge.
  publicApiUrl: (process.env.PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, ''),
  // Shared secret for trusted server-to-server reads (agent service -> backend).
  internalApiSecret: process.env.INTERNAL_API_SECRET || '',
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

  console.log(`[Config] Arc network: ${config.arc.networkLabel} (chainId ${config.arc.chainId}, ${config.arc.blockchainName})`);

  if (!config.internalApiSecret) {
    console.warn('[WARNING] INTERNAL_API_SECRET is not set. Trusted agent reads (reader feed full content) will be rejected.');
  }

  if (config.arc.isMainnet) {
    // Real money: refuse to start without the guards that protect it.
    if (!config.internalApiSecret) {
      missing.push('INTERNAL_API_SECRET (required on mainnet)');
    }
    if (config.publicApiUrl.includes('localhost')) {
      missing.push('PUBLIC_API_URL (must be your public API origin on mainnet)');
    }
    if (config.circle.treasuryAddress === '0x0000000000000000000000000000000000001011') {
      console.warn('[WARNING] CIRCLE_TREASURY_ADDRESS is still the placeholder — the 1% protocol fee would go nowhere.');
    }
  }
  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }
}
