import { ethers } from 'ethers';

async function main() {
  const provider = new ethers.JsonRpcProvider('https://rpc.testnet.arc.network');
  
  // Agent private key from agent_wallet.json
  const agentPrivateKey = '0x1338de6d4fc65099b013c008d20fc898f416b9c87a0c1ed698a5bad17194b9a4';
  const agentWallet = new ethers.Wallet(agentPrivateKey, provider);

  const creatorAddress = '0xec27bc5b3a8c0fda9614000affd4e0dc8a8469bc';
  const usdcAddress = '0x3600000000000000000000000000000000000000';

  const abi = [
    "function transfer(address to, uint256 value) returns (bool)",
    "function balanceOf(address owner) view returns (uint256)"
  ];
  
  const contract = new ethers.Contract(usdcAddress, abi, agentWallet);

  console.log(`Transferring 5.0 USDC from Agent (${agentWallet.address}) to Creator (${creatorAddress})...`);

  try {
    const tx = await contract.transfer(creatorAddress, ethers.parseUnits('5.0', 6));
    console.log('Transaction submitted! Hash:', tx.hash);
    console.log('Waiting for transaction to be mined...');
    const receipt = await tx.wait();
    console.log('Transaction mined successfully in block:', receipt.blockNumber);

    const nextBal = await contract.balanceOf(creatorAddress);
    console.log('New Creator USDC Balance:', ethers.formatUnits(nextBal, 6), 'USDC');
  } catch (err) {
    console.error('Transfer failed:', err.message);
  }
}

main().catch(console.error);
