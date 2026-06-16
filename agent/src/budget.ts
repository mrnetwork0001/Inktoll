import fs from 'fs';
import path from 'path';
import { loadProfile } from './profile.js';

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

const historyPath = path.resolve('./data/reading_history.json');

export function loadHistory(): ReadingHistory {
  try {
    const dir = path.dirname(historyPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(historyPath)) {
      fs.writeFileSync(historyPath, JSON.stringify(DEFAULT_HISTORY, null, 2));
      return DEFAULT_HISTORY;
    }
    const content = fs.readFileSync(historyPath, 'utf8');
    const history = JSON.parse(content) as ReadingHistory;

    // Reset daily budget if new day
    const today = new Date().toISOString().split('T')[0];
    if (history.lastSpentDate !== today) {
      history.dailySpentUsdc = 0.00;
      history.lastSpentDate = today;
      saveHistory(history);
    }

    return history;
  } catch (error) {
    console.error('[Budget] Error loading history, using defaults:', error);
    return DEFAULT_HISTORY;
  }
}

export function saveHistory(history: ReadingHistory): void {
  try {
    const dir = path.dirname(historyPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  } catch (error) {
    console.error('[Budget] Error saving history:', error);
  }
}

export function checkBudget(price: number): { allowed: boolean; reason?: string } {
  const profile = loadProfile();
  const history = loadHistory();

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

export function recordPurchase(slug: string, price: number): void {
  const history = loadHistory();
  history.dailySpentUsdc = parseFloat((history.dailySpentUsdc + price).toFixed(6));
  if (!history.purchasedSlugs.includes(slug)) {
    history.purchasedSlugs.push(slug);
  }
  saveHistory(history);
}

export function isPurchased(slug: string): boolean {
  const history = loadHistory();
  return history.purchasedSlugs.includes(slug);
}
