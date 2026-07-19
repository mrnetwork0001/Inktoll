import { Router } from 'express';
import { getDb } from '../db/index.js';

const router = Router();

// Read-only aggregation powering the public Knowledge Royalty Graph.
// Nodes: creators, articles, reader agents. Edges: settled read/citation payments.
router.get('/', async (req, res) => {
  const db = getDb();

  try {
    const creators = db.prepare(`
      SELECT
        c.id,
        c.ghost_url,
        c.wallet_address,
        (SELECT COUNT(*) FROM articles WHERE creator_id = c.id) as articles_count,
        (
          SELECT COALESCE(SUM(p.amount_usdc), 0)
          FROM payments p
          JOIN articles a ON p.article_id = a.id
          WHERE a.creator_id = c.id AND p.status = 'settled'
        ) as total_earnings
      FROM creators c
      LIMIT 50
    `).all() as any[];

    const articles = db.prepare(`
      SELECT
        a.id,
        a.creator_id,
        a.ghost_slug,
        a.title,
        a.price_usdc,
        (
          SELECT COUNT(*) FROM payments p
          WHERE p.article_id = a.id AND p.payment_type = 'read' AND p.status = 'settled'
        ) as reads_count,
        (
          SELECT COUNT(*) FROM payments p
          WHERE p.article_id = a.id AND p.payment_type = 'citation' AND p.status = 'settled'
        ) as citations_count,
        (
          SELECT COALESCE(SUM(p.amount_usdc), 0) FROM payments p
          WHERE p.article_id = a.id AND p.status = 'settled'
        ) as revenue
      FROM articles a
      LIMIT 200
    `).all() as any[];

    const agents = db.prepare(`
      SELECT
        p.reader_agent_id as id,
        ra.wallet_address,
        COUNT(*) as payments_count,
        COALESCE(SUM(p.amount_usdc), 0) as total_spent,
        SUM(CASE WHEN p.payment_type = 'read' THEN 1 ELSE 0 END) as reads_count,
        SUM(CASE WHEN p.payment_type = 'citation' THEN 1 ELSE 0 END) as citations_count
      FROM payments p
      LEFT JOIN reader_agents ra ON ra.id = p.reader_agent_id
      WHERE p.status = 'settled'
      GROUP BY p.reader_agent_id
      LIMIT 50
    `).all() as any[];

    const edges = db.prepare(`
      SELECT
        p.reader_agent_id as agent_id,
        p.article_id,
        p.payment_type,
        COUNT(*) as count,
        COALESCE(SUM(p.amount_usdc), 0) as total_usdc,
        MAX(p.created_at) as last_at
      FROM payments p
      WHERE p.status = 'settled'
      GROUP BY p.reader_agent_id, p.article_id, p.payment_type
      LIMIT 500
    `).all() as any[];

    // Last payments drive the live pulse animation on the client
    const recent = db.prepare(`
      SELECT
        p.id,
        p.reader_agent_id as agent_id,
        p.article_id,
        p.payment_type,
        p.amount_usdc,
        p.created_at,
        a.title as article_title
      FROM payments p
      JOIN articles a ON p.article_id = a.id
      WHERE p.status = 'settled'
      ORDER BY p.created_at DESC
      LIMIT 20
    `).all() as any[];

    return res.json({
      success: true,
      nodes: { creators, articles, agents },
      edges,
      recent
    });
  } catch (error: any) {
    console.error(`[Graph] Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
