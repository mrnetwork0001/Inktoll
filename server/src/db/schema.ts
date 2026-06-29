export const CREATE_CREATORS_TABLE = `
CREATE TABLE IF NOT EXISTS creators (
  id TEXT PRIMARY KEY,
  ghost_url TEXT NOT NULL,
  ghost_api_key TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  wallet_id TEXT NOT NULL,
  default_price_usdc REAL DEFAULT 0.005,
  owner_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

export const CREATE_ARTICLES_TABLE = `
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  ghost_slug TEXT NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  preview_text TEXT,
  full_html TEXT NOT NULL,
  word_count INTEGER,
  price_usdc REAL NOT NULL,
  published_at DATETIME,
  imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES creators(id)
);
`;

export const CREATE_PAYMENTS_TABLE = `
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  reader_agent_id TEXT NOT NULL,
  amount_usdc REAL NOT NULL,
  payment_type TEXT NOT NULL,
  tx_hash TEXT,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id)
);
`;

export const CREATE_READER_AGENTS_TABLE = `
CREATE TABLE IF NOT EXISTS reader_agents (
  id TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  interests TEXT,
  max_price_per_article REAL DEFAULT 0.05,
  daily_budget_usdc REAL DEFAULT 1.00,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

export const CREATE_EMBEDDINGS_TABLE = `
CREATE TABLE IF NOT EXISTS embeddings (
  article_id TEXT PRIMARY KEY,
  embedding BLOB NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id)
);
`;

export const CREATE_CITATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS citations (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  reader_agent_id TEXT NOT NULL,
  similarity_score REAL NOT NULL,
  toll_amount_usdc REAL NOT NULL,
  payment_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id),
  FOREIGN KEY (payment_id) REFERENCES payments(id)
);
`;
