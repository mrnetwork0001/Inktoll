import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./data/agent.db');

db.get('SELECT agentAddress, agentPrivateKey FROM AgentProfiles LIMIT 1', (err, row) => {
  if (err) {
    console.error('Error reading database:', err.message);
  } else if (row) {
    console.log('\n=============================================');
    console.log('🤖 AGENT WALLET FOUND');
    console.log('=============================================');
    console.log('Address:', row.agentAddress);
    console.log('Private Key:', row.agentPrivateKey);
    console.log('=============================================\n');
  } else {
    console.log('No agent wallet found in the database. You need to start the agent or interact with it first to generate one.');
  }
  db.close();
});
