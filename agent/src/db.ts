import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'agent.db');

export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('[Agent DB] Error opening database', err);
  } else {
    console.log(`[Agent DB] Connected to SQLite database at ${dbPath}`);
    
    // Initialize tables
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS AgentProfiles (
          userId TEXT PRIMARY KEY,
          interests TEXT,
          maxPricePerArticle REAL,
          dailyBudgetUsdc REAL,
          agentAddress TEXT,
          agentPrivateKey TEXT
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS AgentHistory (
          userId TEXT,
          dailySpentUsdc REAL,
          purchasedSlugs TEXT,
          updatedAt TEXT,
          PRIMARY KEY (userId)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS FaucetClaims (
          userId TEXT PRIMARY KEY,
          lastClaimedAt INTEGER
        )
      `);
    });
  }
});
