import { Router } from 'express';
import { getDb } from '../db/index.js';
import { getWalletBalance } from '../services/wallet.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = getDb();
  const { creatorId, agentWallet } = req.query;

  try {
    let stats: any = {};

    if (creatorId) {
      const creator = db.prepare('SELECT * FROM creators WHERE id = ?').get(creatorId) as any;
      if (!creator) {
        return res.status(404).json({ error: 'Creator not found' });
      }

      // Wallet balance
      const balance = await getWalletBalance(creator.wallet_address);

      // Read revenue
      const readRev = db.prepare(`
        SELECT COALESCE(SUM(amount_usdc), 0) as total, COUNT(*) as count
        FROM payments p
        JOIN articles a ON p.article_id = a.id
        WHERE a.creator_id = ? AND p.payment_type = 'read' AND p.status = 'settled'
      `).get(creatorId) as any;

      // Citation revenue
      const citationRev = db.prepare(`
        SELECT COALESCE(SUM(amount_usdc), 0) as total, COUNT(*) as count
        FROM payments p
        JOIN articles a ON p.article_id = a.id
        WHERE a.creator_id = ? AND p.payment_type = 'citation' AND p.status = 'settled'
      `).get(creatorId) as any;

      // Articles with read & citation count
      const articles = db.prepare(`
        SELECT 
          a.id, a.ghost_slug, a.title, a.price_usdc, a.published_at,
          (SELECT COUNT(*) FROM payments WHERE article_id = a.id AND payment_type = 'read') as reads,
          (SELECT COUNT(*) FROM payments WHERE article_id = a.id AND payment_type = 'citation') as citations,
          (SELECT COALESCE(SUM(amount_usdc), 0) FROM payments WHERE article_id = a.id) as revenue
        FROM articles a
        WHERE a.creator_id = ?
        ORDER BY a.published_at DESC
      `).all(creatorId) as any[];

      // Transaction history
      const history = db.prepare(`
        SELECT p.*, a.title as article_title
        FROM payments p
        JOIN articles a ON p.article_id = a.id
        WHERE a.creator_id = ?
        ORDER BY p.created_at DESC
        LIMIT 20
      `).all(creatorId) as any[];

      stats = {
        role: 'creator',
        walletAddress: creator.wallet_address,
        balanceUsdc: balance,
        readCount: readRev.count,
        readRevenueUsdc: readRev.total,
        citationCount: citationRev.count,
        citationRevenueUsdc: citationRev.total,
        totalEarningsUsdc: parseFloat((readRev.total + citationRev.total).toFixed(6)),
        articles,
        history,
      };
    } else if (agentWallet) {
      const balance = await getWalletBalance(agentWallet as string);

      // Spent on reads
      const readSpent = db.prepare(`
        SELECT COALESCE(SUM(amount_usdc), 0) as total, COUNT(*) as count
        FROM payments
        WHERE reader_agent_id = ? AND payment_type = 'read' AND status = 'settled'
      `).get(agentWallet) as any;

      // Spent on citations
      const citationSpent = db.prepare(`
        SELECT COALESCE(SUM(amount_usdc), 0) as total, COUNT(*) as count
        FROM payments
        WHERE reader_agent_id = ? AND payment_type = 'citation' AND status = 'settled'
      `).get(agentWallet) as any;

      // Purchased articles
      const purchasedArticles = db.prepare(`
        SELECT DISTINCT a.id, a.ghost_slug, a.title, a.excerpt, a.price_usdc, p.created_at as purchased_at
        FROM payments p
        JOIN articles a ON p.article_id = a.id
        WHERE p.reader_agent_id = ? AND p.payment_type = 'read' AND p.status = 'settled'
        ORDER BY p.created_at DESC
      `).all(agentWallet) as any[];

      // Transaction history
      const history = db.prepare(`
        SELECT p.*, a.title as article_title
        FROM payments p
        JOIN articles a ON p.article_id = a.id
        WHERE p.reader_agent_id = ?
        ORDER BY p.created_at DESC
        LIMIT 20
      `).all(agentWallet) as any[];

      stats = {
        role: 'reader',
        walletAddress: agentWallet,
        balanceUsdc: balance,
        readCount: readSpent.count,
        readSpentUsdc: readSpent.total,
        citationCount: citationSpent.count,
        citationSpentUsdc: citationSpent.total,
        totalSpentUsdc: parseFloat((readSpent.total + citationSpent.total).toFixed(6)),
        purchasedArticles,
        history,
      };
    } else {
      // Return global stats
      const totalReads = db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(amount_usdc), 0) as volume FROM payments WHERE payment_type = 'read'").get() as any;
      const totalCitations = db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(amount_usdc), 0) as volume FROM payments WHERE payment_type = 'citation'").get() as any;
      const history = db.prepare(`
        SELECT p.*, a.title as article_title
        FROM payments p
        JOIN articles a ON p.article_id = a.id
        ORDER BY p.created_at DESC
        LIMIT 10
      `).all() as any[];

      stats = {
        role: 'global',
        readCount: totalReads.count,
        readVolumeUsdc: totalReads.volume,
        citationCount: totalCitations.count,
        citationVolumeUsdc: totalCitations.volume,
        totalVolumeUsdc: parseFloat((totalReads.volume + totalCitations.volume).toFixed(6)),
        history
      };
    }

    return res.json(stats);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
