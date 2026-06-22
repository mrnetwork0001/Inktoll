import fs from 'fs';
import path from 'path';
import { config } from '../config.js';

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

// Database schema container
interface DbSchema {
  creators: Creator[];
  articles: Article[];
  payments: Payment[];
  reader_agents: ReaderAgent[];
  embeddings: Embedding[];
  citations: Citation[];
}

const defaultDb: DbSchema = {
  creators: [],
  articles: [],
  payments: [],
  reader_agents: [],
  embeddings: [],
  citations: [],
};

class JSONDatabase {
  private filePath: string;
  private data: DbSchema = { ...defaultDb };

  constructor() {
    const dbPath = path.resolve(config.databasePath.replace('.db', '.json'));
    const dbDir = path.dirname(dbPath);
    this.filePath = dbPath;

    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.load();
  }

  private load() {
    if (fs.existsSync(this.filePath)) {
      try {
        const content = fs.readFileSync(this.filePath, 'utf8');
        this.data = JSON.parse(content);
        // Ensure all arrays are initialized
        this.data.creators = this.data.creators || [];
        this.data.articles = this.data.articles || [];
        this.data.payments = this.data.payments || [];
        this.data.reader_agents = this.data.reader_agents || [];
        this.data.embeddings = this.data.embeddings || [];
        this.data.citations = this.data.citations || [];
      } catch (err) {
        console.error('[DB] Error loading JSON DB, resetting to default:', err);
        this.data = { ...defaultDb };
      }
    } else {
      this.save();
    }
  }

  public save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
    } catch (err) {
      console.error('[DB] Error writing JSON DB:', err);
    }
  }

  public pragma(cmd: string) {
    // SQLite pragma placeholder
  }

  public exec(cmd: string) {
    // Schema migration placeholder
  }

  // Query engine router
  public prepare(sql: string) {
    const normalized = sql.replace(/\s+/g, ' ').trim().toLowerCase();
    const self = this;

    return {
      get(...params: any[]): any {
        self.load();
        
        // 1. SELECT * FROM creators WHERE id = ?
        if (normalized.includes('select * from creators where id =')) {
          const id = params[0];
          return self.data.creators.find(c => c.id === id);
        }

        // 2. SELECT * FROM articles WHERE ghost_slug = ?
        if (normalized.includes('select * from articles where ghost_slug =')) {
          const slug = params[0];
          return self.data.articles.find(a => a.ghost_slug === slug);
        }

        // 3. SELECT id FROM articles WHERE id = ?
        if (normalized.includes('select id from articles where id =')) {
          const id = params[0];
          const found = self.data.articles.find(a => a.id === id);
          return found ? { id: found.id } : undefined;
        }

        // Fallback for SELECT LIMIT queries
        if (normalized.includes('select * from articles') && !normalized.includes('where')) {
          return self.data.articles[0];
        }
        if (normalized.includes('select * from creators') && !normalized.includes('where')) {
          return self.data.creators[0];
        }

        // 4. SELECT * FROM articles WHERE a.ghost_slug = ? (with creator details)
        if (normalized.includes('from articles a join creators c') && normalized.includes('where a.ghost_slug =')) {
          const slug = params[0];
          const article = self.data.articles.find(a => a.ghost_slug === slug);
          if (!article) return undefined;
          const creator = self.data.creators.find(c => c.id === article.creator_id);
          return {
            ...article,
            ghost_url: creator?.ghost_url || '',
            creator_wallet: creator?.wallet_address || '',
          };
        }

        // 5. SELECT wallet_address FROM creators WHERE id = ?
        if (normalized.includes('select wallet_address from creators where id =')) {
          const id = params[0];
          const creator = self.data.creators.find(c => c.id === id);
          return creator ? { wallet_address: creator.wallet_address } : undefined;
        }

        // 6. Aggregate Payments (Stats for creator / read / settled)
        if (normalized.includes('select coalesce(sum(amount_usdc), 0)') && normalized.includes("payment_type = 'read'") && normalized.includes('creator_id =')) {
          const creatorId = params[0];
          const matchingPayments = self.data.payments.filter(p => {
            const article = self.data.articles.find(a => a.id === p.article_id);
            return article?.creator_id === creatorId && p.payment_type === 'read' && p.status === 'settled';
          });
          const total = matchingPayments.reduce((sum, p) => sum + p.amount_usdc, 0);
          return { total, count: matchingPayments.length };
        }

        // 7. Aggregate Payments (Stats for creator / citation / settled)
        if (normalized.includes('select coalesce(sum(amount_usdc), 0)') && normalized.includes("payment_type = 'citation'") && normalized.includes('creator_id =')) {
          const creatorId = params[0];
          const matchingPayments = self.data.payments.filter(p => {
            const article = self.data.articles.find(a => a.id === p.article_id);
            return article?.creator_id === creatorId && p.payment_type === 'citation' && p.status === 'settled';
          });
          const total = matchingPayments.reduce((sum, p) => sum + p.amount_usdc, 0);
          return { total, count: matchingPayments.length };
        }

        // 8. Aggregate Payments (Stats for agent / read / settled)
        if (normalized.includes('select coalesce(sum(amount_usdc), 0)') && normalized.includes("payment_type = 'read'") && normalized.includes('reader_agent_id =')) {
          const agentId = params[0];
          const matchingPayments = self.data.payments.filter(p => p.reader_agent_id === agentId && p.payment_type === 'read' && p.status === 'settled');
          const total = matchingPayments.reduce((sum, p) => sum + p.amount_usdc, 0);
          return { total, count: matchingPayments.length };
        }

        // 9. Aggregate Payments (Stats for agent / citation / settled)
        if (normalized.includes('select coalesce(sum(amount_usdc), 0)') && normalized.includes("payment_type = 'citation'") && normalized.includes('reader_agent_id =')) {
          const agentId = params[0];
          const matchingPayments = self.data.payments.filter(p => p.reader_agent_id === agentId && p.payment_type === 'citation' && p.status === 'settled');
          const total = matchingPayments.reduce((sum, p) => sum + p.amount_usdc, 0);
          return { total, count: matchingPayments.length };
        }

        // 10. Global reads volume
        if (normalized.includes('select count(*) as count, coalesce(sum(amount_usdc), 0) as volume from payments') && normalized.includes("payment_type = 'read'")) {
          const matches = self.data.payments.filter(p => p.payment_type === 'read');
          const volume = matches.reduce((sum, p) => sum + p.amount_usdc, 0);
          return { count: matches.length, volume };
        }

        // 11. Global citations volume
        if (normalized.includes('select count(*) as count, coalesce(sum(amount_usdc), 0) as volume from payments') && normalized.includes("payment_type = 'citation'")) {
          const matches = self.data.payments.filter(p => p.payment_type === 'citation');
          const volume = matches.reduce((sum, p) => sum + p.amount_usdc, 0);
          return { count: matches.length, volume };
        }

        // 12. Check if reader has paid for article
        if (normalized.includes('select id from payments') && normalized.includes('article_id =') && normalized.includes('reader_agent_id =')) {
          const [articleId, readerAgentId] = params;
          const found = self.data.payments.find(p => 
            p.article_id === articleId && 
            p.reader_agent_id === readerAgentId && 
            (p.status === 'settled' || p.status === 'pending')
          );
          return found ? { id: found?.id } : undefined;
        }

        return undefined;
      },

      all(...params: any[]): any[] {
        self.load();

        // 1. SELECT id, ghost_url, wallet_address, default_price_usdc FROM creators
        if (normalized === 'select id, ghost_url, wallet_address, default_price_usdc from creators') {
          return self.data.creators.map(c => ({
            id: c.id,
            ghost_url: c.ghost_url,
            wallet_address: c.wallet_address,
            default_price_usdc: c.default_price_usdc,
          }));
        }

        // 2. Fetch list of articles (join with creator)
        if (normalized.includes('from articles a join creators c') && normalized.includes('order by a.published_at desc')) {
          return self.data.articles.map(a => {
            const creator = self.data.creators.find(c => c.id === a.creator_id);
            return {
              id: a.id,
              creator_id: a.creator_id,
              ghost_slug: a.ghost_slug,
              title: a.title,
              excerpt: a.excerpt,
              preview_text: a.preview_text,
              price_usdc: a.price_usdc,
              published_at: a.published_at,
              ghost_url: creator?.ghost_url || '',
            };
          }).sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
        }

        // 3. Articles by creator_id
        if (normalized.includes('select * from articles where creator_id =') && normalized.includes('order by published_at desc')) {
          const creatorId = params[0];
          return self.data.articles
            .filter(a => a.creator_id === creatorId)
            .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
        }

        // 4. Articles by creator_id with reads, citations, and revenue
        if (normalized.includes('reads,') && normalized.includes('citations,') && normalized.includes('creator_id =')) {
          const creatorId = params[0];
          return self.data.articles
            .filter(a => a.creator_id === creatorId)
            .map(a => {
              const reads = self.data.payments.filter(p => p.article_id === a.id && p.payment_type === 'read').length;
              const citations = self.data.payments.filter(p => p.article_id === a.id && p.payment_type === 'citation').length;
              const revenue = self.data.payments.filter(p => p.article_id === a.id && p.status === 'settled').reduce((sum, p) => sum + p.amount_usdc, 0);
              return {
                id: a.id,
                ghost_slug: a.ghost_slug,
                title: a.title,
                price_usdc: a.price_usdc,
                published_at: a.published_at,
                reads,
                citations,
                revenue,
              };
            })
            .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
        }

        // 5. Payments history per creator
        if (normalized.includes('from payments p join articles a') && normalized.includes('creator_id =') && normalized.includes('order by p.created_at desc')) {
          const creatorId = params[0];
          const limit = parseInt(sql.split(/limit\s+/i)[1] || '20', 10);
          return self.data.payments
            .filter(p => {
              const article = self.data.articles.find(a => a.id === p.article_id);
              return article?.creator_id === creatorId;
            })
            .map(p => {
              const article = self.data.articles.find(a => a.id === p.article_id);
              return {
                ...p,
                article_title: article?.title || 'Unknown Article',
              };
            })
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, limit);
        }

        // 6. Purchased articles per agent
        if (normalized.includes('select distinct a.id, a.ghost_slug, a.title, a.excerpt') && normalized.includes('reader_agent_id =')) {
          const agentId = params[0];
          const agentPayments = self.data.payments.filter(p => p.reader_agent_id === agentId && p.payment_type === 'read' && p.status === 'settled');
          
          const list = agentPayments.map(p => {
            const article = self.data.articles.find(a => a.id === p.article_id);
            return {
              id: article?.id || '',
              ghost_slug: article?.ghost_slug || '',
              title: article?.title || '',
              excerpt: article?.excerpt || '',
              price_usdc: article?.price_usdc || 0,
              purchased_at: p.created_at,
            };
          });

          // Deduplicate
          const seen = new Set();
          return list.filter(item => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          }).sort((a, b) => new Date(b.purchased_at).getTime() - new Date(a.purchased_at).getTime());
        }

        // 7. Payments history per agent
        if (normalized.includes('from payments p join articles a') && normalized.includes('reader_agent_id =') && normalized.includes('order by p.created_at desc')) {
          const agentId = params[0];
          const limit = parseInt(sql.split(/limit\s+/i)[1] || '20', 10);
          return self.data.payments
            .filter(p => p.reader_agent_id === agentId)
            .map(p => {
              const article = self.data.articles.find(a => a.id === p.article_id);
              return {
                ...p,
                article_title: article?.title || 'Unknown Article',
              };
            })
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, limit);
        }

        // 8. Global payments history
        if (normalized.includes('from payments p join articles a') && normalized.includes('order by p.created_at desc') && !normalized.includes('where')) {
          const limit = parseInt(sql.split(/limit\s+/i)[1] || '10', 10);
          return self.data.payments
            .map(p => {
              const article = self.data.articles.find(a => a.id === p.article_id);
              return {
                ...p,
                article_title: article?.title || 'Unknown Article',
              };
            })
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, limit);
        }

        // 9. Citations history with article and creator
        if (normalized.includes('from citations c join articles a') && normalized.includes('join creators cr')) {
          return self.data.citations
            .map(c => {
              const article = self.data.articles.find(a => a.id === c.article_id);
              const creator = article ? self.data.creators.find(cr => cr.id === article.creator_id) : undefined;
              return {
                ...c,
                article_title: article?.title || 'Unknown Article',
                ghost_url: creator?.ghost_url || '',
              };
            })
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }

        return [];
      },

      run(...params: any[]): { changes: number } {
        self.load();

        // 1. DELETE cases
        if (normalized.startsWith('delete from')) {
          if (normalized.includes('citations')) self.data.citations = [];
          if (normalized.includes('payments')) self.data.payments = [];
          if (normalized.includes('articles')) self.data.articles = [];
          if (normalized.includes('creators')) self.data.creators = [];
          if (normalized.includes('reader_agents')) self.data.reader_agents = [];
          self.save();
          return { changes: 1 };
        }

        // 2. INSERT creators
        if (normalized.includes('insert into creators')) {
          let id, ghost_url, ghost_api_key, wallet_address, wallet_id, default_price_usdc;
          if (params.length === 6) {
            [id, ghost_url, ghost_api_key, wallet_address, wallet_id, default_price_usdc] = params;
          } else {
            [id, ghost_url, ghost_api_key, wallet_address, default_price_usdc] = params;
            wallet_id = id; // fallback
          }
          self.data.creators.push({
            id,
            ghost_url,
            ghost_api_key,
            wallet_address,
            wallet_id: wallet_id || '',
            default_price_usdc,
            created_at: new Date().toISOString(),
          });
          self.save();
          return { changes: 1 };
        }

        // 3. INSERT articles
        if (normalized.includes('insert into articles')) {
          const [id, creator_id, ghost_slug, title, excerpt, preview_text, full_html, word_count, price_usdc, published_at] = params;
          self.data.articles.push({
            id,
            creator_id,
            ghost_slug,
            title,
            excerpt,
            preview_text,
            full_html,
            word_count,
            price_usdc,
            published_at,
            imported_at: new Date().toISOString(),
          });
          self.save();
          return { changes: 1 };
        }

        // 4. INSERT payments
        if (normalized.includes('insert into payments')) {
          const [id, article_id, reader_agent_id, amount_usdc, payment_type, tx_hash, status] = params;
          self.data.payments.push({
            id,
            article_id,
            reader_agent_id,
            amount_usdc,
            payment_type,
            tx_hash,
            status,
            created_at: new Date().toISOString(),
          });
          self.save();
          return { changes: 1 };
        }

        // 5. INSERT citations
        if (normalized.includes('insert into citations')) {
          const [id, article_id, reader_agent_id, similarity_score, toll_amount_usdc, payment_id] = params;
          self.data.citations.push({
            id,
            article_id,
            reader_agent_id,
            similarity_score,
            toll_amount_usdc,
            payment_id,
            created_at: new Date().toISOString(),
          });
          self.save();
          return { changes: 1 };
        }

        return { changes: 0 };
      }
    };
  }
}

const instances: Record<string, JSONDatabase> = {};

export function initDatabase() {
  const dbPath = path.resolve(config.databasePath);
  if (!instances[dbPath]) {
    instances[dbPath] = new JSONDatabase();
    console.log(`[DB] JSON Database Engine initialized successfully at ${dbPath.replace('.db', '.json')}`);
  }
}

export function getDb() {
  const dbPath = path.resolve(config.databasePath);
  if (!instances[dbPath]) {
    initDatabase();
  }
  return instances[dbPath];
}
export { JSONDatabase };
