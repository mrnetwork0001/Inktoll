import { ethers } from 'ethers';

async function main() {
  const rpcs = [
    'https://rpc.testnet.arc.network',
    'https://arc-node.thecanteenapp.com'
  ];

  for (const rpc of rpcs) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      const network = await provider.getNetwork();
      console.log(`RPC: ${rpc} | Chain ID: ${network.chainId.toString()}`);
    } catch (err) {
      console.error(`Failed to check RPC ${rpc}:`, err.message);
    }
  }
}

main().catch(console.error);
