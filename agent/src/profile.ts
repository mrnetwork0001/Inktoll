import fs from 'fs';
import path from 'path';

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

const profilePath = path.resolve('./data/profile.json');

export function loadProfile(): ReaderProfile {
  try {
    const dir = path.dirname(profilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(profilePath)) {
      fs.writeFileSync(profilePath, JSON.stringify(DEFAULT_PROFILE, null, 2));
      return DEFAULT_PROFILE;
    }
    const content = fs.readFileSync(profilePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('[Profile] Error loading profile, using defaults:', error);
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile: ReaderProfile): void {
  try {
    const dir = path.dirname(profilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2));
  } catch (error) {
    console.error('[Profile] Error saving profile:', error);
  }
}
