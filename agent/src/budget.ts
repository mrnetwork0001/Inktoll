import { loadProfile } from './profile.js';
import { db } from './db.js';

export interface ReadingHistory {
  dailySpentUsdc: number;
  lastSpentDate: string; // YYYY-MM-DD
  purchasedSlugs: string[];
}

const DEFAULT_HISTORY: ReadingHistory = {
  dailySpentUsdc: 0.00,
  lastSpentDate: new Date().toISOString().split('T')[0],
  purchasedSlugs: []
};

export function loadHistory(userId: string): Promise<ReadingHistory> {
  return new Promise((resolve) => {
    db.get('SELECT dailySpentUsdc, purchasedSlugs, updatedAt FROM AgentHistory WHERE userId = ?', [userId], (err, row: any) => {
      if (err) {
        console.error('[Budget] DB error loading history:', err);
        return resolve(DEFAULT_HISTORY);
      }
      if (!row) {
        return resolve(DEFAULT_HISTORY);
      }
      
      const history = {
        dailySpentUsdc: row.dailySpentUsdc,
        lastSpentDate: row.updatedAt,
        purchasedSlugs: JSON.parse(row.purchasedSlugs)
      };

      // Reset daily budget if new day
      const today = new Date().toISOString().split('T')[0];
      if (history.lastSpentDate !== today) {
        history.dailySpentUsdc = 0.00;
        history.lastSpentDate = today;
        saveHistory(userId, history); // Fire and forget update
      }

      resolve(history);
    });
  });
}

export function saveHistory(userId: string, history: ReadingHistory): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(`
      INSERT INTO AgentHistory (userId, dailySpentUsdc, purchasedSlugs, updatedAt)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(userId) DO UPDATE SET
        dailySpentUsdc=excluded.dailySpentUsdc,
        purchasedSlugs=excluded.purchasedSlugs,
        updatedAt=excluded.updatedAt
    `, [userId, history.dailySpentUsdc, JSON.stringify(history.purchasedSlugs), history.lastSpentDate], (err) => {
      if (err) {
        console.error('[Budget] Error saving history:', err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export async function checkBudget(userId: string, price: number): Promise<{ allowed: boolean; reason?: string }> {
  const profile = await loadProfile(userId);
  const history = await loadHistory(userId);

  if (price > profile.maxPricePerArticle) {
    return {
      allowed: false,
      reason: `Article price ($${price} USDC) exceeds max price limit ($${profile.maxPricePerArticle} USDC)`
    };
  }

  const projectSpent = history.dailySpentUsdc + price;
  if (projectSpent > profile.dailyBudgetUsdc) {
    return {
      allowed: false,
      reason: `Buying this article would exceed daily budget. Daily budget: $${profile.dailyBudgetUsdc} USDC, spent today: $${history.dailySpentUsdc} USDC, article price: $${price} USDC`
    };
  }

  return { allowed: true };
}

export async function recordPurchase(userId: string, slug: string, price: number): Promise<void> {
  const history = await loadHistory(userId);
  history.dailySpentUsdc = parseFloat((history.dailySpentUsdc + price).toFixed(6));
  if (!history.purchasedSlugs.includes(slug)) {
    history.purchasedSlugs.push(slug);
  }
  await saveHistory(userId, history);
}

export async function isPurchased(userId: string, slug: string): Promise<boolean> {
  const history = await loadHistory(userId);
  return history.purchasedSlugs.includes(slug);
}
