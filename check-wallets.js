import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { ethers } from 'ethers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config();

const provider = new ethers.JsonRpcProvider('https://rpc.testnet.arc.network');
const usdcAddress = '0x3600000000000000000000000000000000000000';
const abi = ['function balanceOf(address) view returns (uint256)'];
const usdcContract = new ethers.Contract(usdcAddress, abi, provider);

async function checkBalance(address) {
  try {
    const bal = await usdcContract.balanceOf(address);
    return parseFloat(ethers.formatUnits(bal, 6));
  } catch (err) {
    return null;
  }
}

async function requestFaucet(address) {
  const apiKey = process.env.CIRCLE_API_KEY;
  if (!apiKey) return { success: false, error: 'No CIRCLE_API_KEY in .env' };

  try {
    const res = await fetch('https://api.circle.com/v1/faucet/drips', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        address,
        blockchain: 'ARC-TESTNET',
        usdc: true
      })
    });
    const data = await res.json();
    if (res.status === 200 || res.status === 201 || data.data?.faucetQueueId) {
      return { success: true, data };
    } else {
      return { success: false, error: data.message || JSON.stringify(data) };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function getSqliteData(dbPath, sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) return reject(err);
    });
    db.all(sql, params, (err, rows) => {
      db.close();
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function main() {
  console.log('=== Inktoll Wallet Diagnosis & Faucet Tool ===\n');

  let serverDb = path.join(__dirname, 'server/data/inktoll.db');
  let agentDb = path.join(__dirname, 'agent/data/agent.db');

  // Fallback to root data folder if not found in folder-specific paths
  if (!fs.existsSync(serverDb) && fs.existsSync(path.join(__dirname, 'data/inktoll.db'))) {
    serverDb = path.join(__dirname, 'data/inktoll.db');
  }
  if (!fs.existsSync(agentDb) && fs.existsSync(path.join(__dirname, 'data/agent.db'))) {
    agentDb = path.join(__dirname, 'data/agent.db');
  }

  let creators = [];
  let agents = [];

  // Read creators
  if (fs.existsSync(serverDb)) {
    try {
      creators = await getSqliteData(serverDb, 'SELECT id, wallet_address FROM creators');
    } catch (e) {
      console.error('Error reading creators DB:', e.message);
    }
  } else {
    console.warn(`Creators DB not found at: ${serverDb}`);
  }

  // Read agents
  if (fs.existsSync(agentDb)) {
    try {
      agents = await getSqliteData(agentDb, 'SELECT userId, agentAddress FROM AgentProfiles');
    } catch (e) {
      console.error('Error reading agents DB:', e.message);
    }
  } else {
    console.warn(`Agents DB not found at: ${agentDb}`);
  }

  // Fallback: Read agents from the server's database (reader_agents table)
  if (fs.existsSync(serverDb)) {
    try {
      const serverAgents = await getSqliteData(serverDb, 'SELECT id, wallet_address FROM reader_agents');
      serverAgents.forEach(sa => {
        // Only add if not already found in agentDb
        if (!agents.some(a => a.agentAddress.toLowerCase() === sa.wallet_address.toLowerCase())) {
          agents.push({ userId: sa.id, agentAddress: sa.wallet_address });
        }
      });
    } catch (e) {
      console.error('Error reading reader_agents from server DB:', e.message);
    }
  }

  console.log(`Found ${creators.length} Creators and ${agents.length} Agents in databases.\n`);

  const allAddresses = [];
  creators.forEach(c => allAddresses.push({ type: 'Creator', address: c.wallet_address, id: c.id }));
  agents.forEach(a => allAddresses.push({ type: 'Agent', address: a.agentAddress, id: a.userId }));

  if (allAddresses.length === 0) {
    console.log('No wallets registered yet. Try logging into the dashboard or running the agent first.');
    return;
  }

  for (const item of allAddresses) {
    console.log(`Checking ${item.type} (${item.id}): ${item.address}`);
    const bal = await checkBalance(item.address);
    
    if (bal === null) {
      console.log(`  ❌ Failed to check balance. RPC error.`);
      continue;
    }

    console.log(`  💰 Current Balance: ${bal.toFixed(6)} USDC`);

    if (bal < 0.05) {
      console.log(`  ⚠️  Balance is too low for transaction gas fees (< 0.05 USDC).`);
      console.log(`  ⚡ Attempting automatic faucet drip...`);
      const drip = await requestFaucet(item.address);
      if (drip.success) {
        console.log(`  ✅ Faucet request successful! Queue ID: ${drip.data?.data?.faucetQueueId}`);
        console.log(`     Please wait 30 seconds for funds to arrive.`);
      } else {
        console.log(`  ❌ Faucet auto-drip failed: ${drip.error}`);
        console.log(`  👉 ACTION REQUIRED:`);
        console.log(`     1. Go to: https://faucet.circle.com`);
        console.log(`     2. Select 'Arc Testnet'`);
        console.log(`     3. Paste this address: ${item.address}`);
        console.log(`     4. Request tokens to fund the wallet with gas.`);
      }
    } else {
      console.log(`  ✅ Wallet has sufficient gas.`);
    }
    console.log('');
  }

  console.log('=== Diagnosis Complete ===');
}

main();
