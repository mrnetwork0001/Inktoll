import { db } from './db.js';

export interface ReaderProfile {
  interests: string[];
  maxPricePerArticle: number;
  dailyBudgetUsdc: number;
}

const DEFAULT_PROFILE: ReaderProfile = {
  interests: ['AI agent payments', 'Web3 machine economy', 'stablecoin-native L1', 'Zero knowledge proofs', 'DeFi privacy'],
  maxPricePerArticle: 0.05,
  dailyBudgetUsdc: 1.00
};

export function loadProfile(userId: string): Promise<ReaderProfile> {
  return new Promise((resolve) => {
    db.get('SELECT interests, maxPricePerArticle, dailyBudgetUsdc FROM AgentProfiles WHERE userId = ?', [userId], (err, row: any) => {
      if (err) {
        console.error('[Profile] DB error loading profile:', err);
        return resolve(DEFAULT_PROFILE);
      }
      if (!row) {
        return resolve(DEFAULT_PROFILE);
      }
      resolve({
        interests: JSON.parse(row.interests),
        maxPricePerArticle: row.maxPricePerArticle,
        dailyBudgetUsdc: row.dailyBudgetUsdc
      });
    });
  });
}

export function saveProfile(userId: string, profile: ReaderProfile, agentAddress: string = '', agentPrivateKey: string = ''): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(`
      INSERT INTO AgentProfiles (userId, interests, maxPricePerArticle, dailyBudgetUsdc, agentAddress, agentPrivateKey)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(userId) DO UPDATE SET
        interests=excluded.interests,
        maxPricePerArticle=excluded.maxPricePerArticle,
        dailyBudgetUsdc=excluded.dailyBudgetUsdc,
        agentAddress=CASE WHEN excluded.agentAddress != '' THEN excluded.agentAddress ELSE agentAddress END,
        agentPrivateKey=CASE WHEN excluded.agentPrivateKey != '' THEN excluded.agentPrivateKey ELSE agentPrivateKey END
    `, [userId, JSON.stringify(profile.interests), profile.maxPricePerArticle, profile.dailyBudgetUsdc, agentAddress, agentPrivateKey], (err) => {
      if (err) {
        console.error('[Profile] Error saving profile:', err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
