// Network identity for the agent service.
//
// Every value is a lazy getter on purpose: agent/src/index.ts calls
// dotenv.config() *after* module imports are evaluated, so reading
// process.env at import time would see an empty environment.
//
// Arc mainnet is chain 5042 ("ARC"); testnet is 5042002 ("ARC-TESTNET").
// Defaults stay on testnet so an un-updated .env behaves exactly as before.
export const arc = {
  get chainId(): number {
    return parseInt(process.env.ARC_CHAIN_ID || '5042002', 10);
  },
  get blockchainName(): string {
    return process.env.ARC_BLOCKCHAIN_NAME || 'ARC-TESTNET';
  },
  get isMainnet(): boolean {
    return this.chainId === 5042 || this.blockchainName.toUpperCase() === 'ARC';
  },
  get networkLabel(): string {
    return this.isMainnet ? 'arc' : 'arc-testnet';
  },
  // Chain name used by @circle-fin/x402-batching
  get chainName(): string {
    return process.env.ARC_CHAIN_NAME || (this.isMainnet ? 'arc' : 'arcTestnet');
  },
  get rpcUrl(): string {
    return process.env.ARC_RPC_URL || (this.isMainnet ? 'https://rpc.mainnet.arc.io' : 'https://rpc.testnet.arc.io');
  },
  get usdcAddress(): string {
    return process.env.ARC_USDC_ADDRESS || '0x3600000000000000000000000000000000000000';
  },
  get verifyingContract(): string {
    return (
      process.env.ARC_VERIFYING_CONTRACT ||
      (this.isMainnet
        ? '0x77777777Dcc4d5A8B6E418Fd04D8997ef11000eE'
        : '0x0077777d7EBA4688BDeF3E311b846F25870A19B9')
    );
  },
  get gatewayUrl(): string {
    let url = process.env.CIRCLE_GATEWAY_URL || (this.isMainnet ? 'https://gateway-api.circle.com' : 'https://gateway-api-testnet.circle.com');
    return url.replace(/\/$/, '');
  },
  // Circle domain id for Arc — the same (26) on mainnet and testnet.
  get gatewayDomain(): number {
    return parseInt(process.env.ARC_GATEWAY_DOMAIN || '26', 10);
  },
};

export const serverUrl = () => (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');
export const internalApiSecret = () => process.env.INTERNAL_API_SECRET || '';
