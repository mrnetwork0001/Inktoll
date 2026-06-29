import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { config } from '../config.js';
import * as schema from './schema.js';

// Define Table Types
export interface Creator {
  id: string;
  ghost_url: string;
  ghost_api_key: string;
  wallet_address: string;
  wallet_id: string;
  default_price_usdc: number;
  created_at: string;
}

export interface Article {
  id: string;
  creator_id: string;
  ghost_slug: string;
  title: string;
  excerpt: string;
  preview_text: string;
  full_html: string;
  word_count: number;
  price_usdc: number;
  published_at: string;
  imported_at: string;
}

export interface Payment {
  id: string;
  article_id: string;
  reader_agent_id: string;
  amount_usdc: number;
  payment_type: 'read' | 'citation';
  tx_hash: string;
  status: 'pending' | 'settled' | 'failed';
  created_at: string;
}

export interface ReaderAgent {
  id: string;
  wallet_address: string;
  interests: string;
  max_price_per_article: number;
  daily_budget_usdc: number;
  is_active: number;
  created_at: string;
}

export interface Embedding {
  article_id: string;
  embedding: number[];
  created_at: string;
}

export interface Citation {
  id: string;
  article_id: string;
  reader_agent_id: string;
  similarity_score: number;
  toll_amount_usdc: number;
  payment_id: string;
  created_at: string;
}

let dbInstance: Database.Database | null = null;

export function initDatabase() {
  const dbPath = path.resolve(config.databasePath);
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Initialize SQLite Database
  dbInstance = new Database(dbPath);
  dbInstance.pragma('journal_mode = WAL'); // Recommended performance tweak for production
  console.log(`[DB] SQLite Database Engine initialized successfully at ${dbPath}`);

  // Create tables using schema scripts
  dbInstance.exec(schema.CREATE_CREATORS_TABLE);
  dbInstance.exec(schema.CREATE_ARTICLES_TABLE);
  dbInstance.exec(schema.CREATE_PAYMENTS_TABLE);
  dbInstance.exec(schema.CREATE_READER_AGENTS_TABLE);
  dbInstance.exec(schema.CREATE_EMBEDDINGS_TABLE);
  dbInstance.exec(schema.CREATE_CITATIONS_TABLE);

  // Automated migration from JSON DB if it exists
  const jsonPath = dbPath.replace('.db', '.json');
  if (fs.existsSync(jsonPath)) {
    try {
      console.log(`[DB] Existing JSON data found at ${jsonPath}. Migrating to SQLite...`);
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

      dbInstance.transaction(() => {
        // creators
        if (data.creators && Array.isArray(data.creators)) {
          const stmt = dbInstance!.prepare(`
            INSERT OR IGNORE INTO creators (id, ghost_url, ghost_api_key, wallet_address, wallet_id, default_price_usdc, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          for (const c of data.creators) {
            stmt.run(c.id, c.ghost_url, c.ghost_api_key, c.wallet_address, c.wallet_id || c.id, c.default_price_usdc, c.created_at);
          }
        }
        // articles
        if (data.articles && Array.isArray(data.articles)) {
          const stmt = dbInstance!.prepare(`
            INSERT OR IGNORE INTO articles (id, creator_id, ghost_slug, title, excerpt, preview_text, full_html, word_count, price_usdc, published_at, imported_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const a of data.articles) {
            stmt.run(a.id, a.creator_id, a.ghost_slug, a.title, a.excerpt || '', a.preview_text || '', a.full_html || '', a.word_count || 0, a.price_usdc, a.published_at, a.imported_at);
          }
        }
        // payments
        if (data.payments && Array.isArray(data.payments)) {
          const stmt = dbInstance!.prepare(`
            INSERT OR IGNORE INTO payments (id, article_id, reader_agent_id, amount_usdc, payment_type, tx_hash, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const p of data.payments) {
            stmt.run(p.id, p.article_id, p.reader_agent_id, p.amount_usdc, p.payment_type, p.tx_hash || '', p.status || 'pending', p.created_at);
          }
        }
        // reader_agents
        if (data.reader_agents && Array.isArray(data.reader_agents)) {
          const stmt = dbInstance!.prepare(`
            INSERT OR IGNORE INTO reader_agents (id, wallet_address, interests, max_price_per_article, daily_budget_usdc, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          for (const r of data.reader_agents) {
            stmt.run(r.id, r.wallet_address, r.interests || '', r.max_price_per_article, r.daily_budget_usdc, r.is_active ? 1 : 0, r.created_at);
          }
        }
        // citations
        if (data.citations && Array.isArray(data.citations)) {
          const stmt = dbInstance!.prepare(`
            INSERT OR IGNORE INTO citations (id, article_id, reader_agent_id, similarity_score, toll_amount_usdc, payment_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          for (const c of data.citations) {
            stmt.run(c.id, c.article_id, c.reader_agent_id, c.similarity_score, c.toll_amount_usdc, c.payment_id || null, c.created_at);
          }
        }
      })();

      console.log(`[DB] Migration from JSON completed successfully.`);
      // Rename JSON file so we don't migrate again on next restart
      fs.renameSync(jsonPath, jsonPath + '.bak');
      console.log(`[DB] Renamed ${jsonPath} to ${jsonPath}.bak`);
    } catch (err: any) {
      console.error('[DB] Error migrating JSON to SQLite:', err.message);
    }
  }
}

export function getDb(): Database.Database {
  if (!dbInstance) {
    initDatabase();
  }
  return dbInstance!;
}
