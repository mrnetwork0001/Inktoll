import { Router } from 'express';
import { getDb } from '../db/index.js';

const router = Router();

router.get('/leaderboard', async (req, res) => {
  const db = getDb();

  try {
    // 1. Calculate Global Stats
    const totalVolumeResult = db.prepare(`
      SELECT COALESCE(SUM(amount_usdc), 0) as total 
      FROM payments 
      WHERE status = 'settled'
    `).get() as any;

    const totalArticlesResult = db.prepare(`
      SELECT COUNT(*) as count 
      FROM articles
    `).get() as any;

    const activeAgentsResult = db.prepare(`
      SELECT COUNT(*) as count 
      FROM reader_agents 
      WHERE is_active = 1
    `).get() as any;

    // 2. Fetch Top Creators
    const creators = db.prepare(`
      SELECT 
        c.id, 
        c.ghost_url, 
        c.wallet_address,
        (SELECT COUNT(*) FROM articles WHERE creator_id = c.id) as articles_count,
        (
          SELECT COUNT(*) 
          FROM payments p 
          JOIN articles a ON p.article_id = a.id 
          WHERE a.creator_id = c.id AND p.payment_type = 'read' AND p.status = 'settled'
        ) as reads_count,
        (
          SELECT COUNT(*) 
          FROM payments p 
          JOIN articles a ON p.article_id = a.id 
          WHERE a.creator_id = c.id AND p.payment_type = 'citation' AND p.status = 'settled'
        ) as citations_count,
        (
          SELECT COALESCE(SUM(p.amount_usdc), 0) 
          FROM payments p 
          JOIN articles a ON p.article_id = a.id 
          WHERE a.creator_id = c.id AND p.status = 'settled'
        ) as total_earnings
      FROM creators c
      ORDER BY total_earnings DESC
      LIMIT 25
    `).all() as any[];

    // 3. Fetch Recent Payments Activity Ticker
    const activity = db.prepare(`
      SELECT 
        p.id, 
        p.amount_usdc, 
        p.payment_type, 
        p.created_at, 
        p.tx_hash,
        a.title as article_title, 
        c.ghost_url,
        p.reader_agent_id
      FROM payments p
      JOIN articles a ON p.article_id = a.id
      JOIN creators c ON a.creator_id = c.id
      WHERE p.status = 'settled'
      ORDER BY p.created_at DESC
      LIMIT 15
    `).all() as any[];

    return res.json({
      success: true,
      stats: {
        totalVolumeUsdc: totalVolumeResult.total,
        totalArticles: totalArticlesResult.count,
        activeAgents: activeAgentsResult.count,
      },
      creators,
      activity
    });
  } catch (error: any) {
    console.error(`[Stats Leaderboard] Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
