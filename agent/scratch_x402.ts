import { signAuthorization } from '@x402/evm';
import { ethers } from 'ethers';

async function main() {
  const wallet = ethers.Wallet.createRandom();
  const auth = await signAuthorization({
    walletPrivateKey: wallet.privateKey,
    to: "0xec27bc5b3a8c0fda9614000affd4e0dc8a8469bc",
    value: "100",
    chainId: 5042002,
    verifyingContract: '0x0077777d7EBA4688BDeF3E311b846F25870A19B9',
    domainName: 'GatewayWalletBatched',
    domainVersion: '1'
  });
  console.log(JSON.stringify(auth, null, 2));
}

main().catch(console.error);
