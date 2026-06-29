import { ethers } from 'ethers';

async function main() {
  const provider = new ethers.JsonRpcProvider('https://rpc.testnet.arc.network');
  
  const creatorAddress = '0xec27bc5b3a8c0fda9614000affd4e0dc8a8469bc';
  const usdcAddress = '0x3600000000000000000000000000000000000000';

  const abi = [
    "event Transfer(address indexed from, address indexed to, uint256 value)"
  ];
  
  const contract = new ethers.Contract(usdcAddress, abi, provider);

  console.log('Querying Transfer events to creator:', creatorAddress);

  try {
    // Query transfers *to* creator
    const filterTo = contract.filters.Transfer(null, creatorAddress);
    const eventsTo = await contract.queryFilter(filterTo, -1000); // last 1,000 blocks
    console.log(`Found ${eventsTo.length} transfers to creator:`);
    for (const event of eventsTo) {
      console.log(`  From: ${event.args.from} | Value: ${ethers.formatUnits(event.args.value, 6)} USDC | Tx: ${event.transactionHash}`);
    }
  } catch (err) {
    console.error('Error querying transfers to creator:', err.message);
  }

  try {
    // Query transfers *from* creator
    const filterFrom = contract.filters.Transfer(creatorAddress, null);
    const eventsFrom = await contract.queryFilter(filterFrom, -10000);
    console.log(`Found ${eventsFrom.length} transfers from creator:`);
    for (const event of eventsFrom) {
      console.log(`  To: ${event.args.to} | Value: ${ethers.formatUnits(event.args.value, 6)} USDC | Tx: ${event.transactionHash}`);
    }
  } catch (err) {
    console.error('Error querying transfers from creator:', err.message);
  }
}

main().catch(console.error);
