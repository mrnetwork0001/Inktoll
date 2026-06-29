import { GatewayClient } from '@circle-fin/x402-batching/client';
import { ethers } from 'ethers';

async function main() {
  const wallet = ethers.Wallet.createRandom();
  const client = new GatewayClient({
    chain: 'arcTestnet',
    privateKey: wallet.privateKey as any,
  });

  const auth = await client.signAuthorization({
    amount: "100",
    payTo: "0xec27bc5b3a8c0fda9614000affd4e0dc8a8469bc"
  });

  console.log(JSON.stringify(auth, null, 2));
}

main().catch(console.error);
