import { ethers } from 'ethers';

async function main() {
  const provider = new ethers.JsonRpcProvider('https://rpc.testnet.arc.network');
  
  const creatorAddress = '0xec27bc5b3a8c0fda9614000affd4e0dc8a8469bc';
  const agentAddress = '0x260c3FDcf6ecB7CD5a67A33C27565e911b9aDf08';
  const usdcAddress = '0x3600000000000000000000000000000000000000';

  const abi = ["function balanceOf(address owner) view returns (uint256)"];
  const usdc = new ethers.Contract(usdcAddress, abi, provider);

  try {
    const creatorBal = await usdc.balanceOf(creatorAddress);
    console.log('Creator USDC onchain Balance:', ethers.formatUnits(creatorBal, 6), 'USDC');
  } catch (err) {
    console.error('Failed to get creator balance:', err.message);
  }

  try {
    const agentBal = await usdc.balanceOf(agentAddress);
    console.log('Agent USDC onchain Balance:', ethers.formatUnits(agentBal, 6), 'USDC');
  } catch (err) {
    console.error('Failed to get agent balance:', err.message);
  }
}

main().catch(console.error);
