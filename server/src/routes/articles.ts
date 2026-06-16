import { Router } from 'express';
import { getDb } from '../db/index.js';
import { x402Middleware } from '../middleware/x402.js';

const router = Router();

// Get list of all articles (public, returning previews only)
router.get('/', (req, res) => {
  const db = getDb();
  try {
    const articles = db.prepare(`
      SELECT a.id, a.creator_id, a.ghost_slug, a.title, a.excerpt, a.preview_text, a.price_usdc, a.published_at, c.ghost_url
      FROM articles a
      JOIN creators c ON a.creator_id = c.id
      ORDER BY a.published_at DESC
    `).all();
    return res.json(articles);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Get individual article details (behind paywall)
router.get('/:slug', x402Middleware, (req, res) => {
  const { slug } = req.params;
  const db = getDb();

  try {
    const article = db.prepare(`
      SELECT a.*, c.ghost_url, c.wallet_address as creator_wallet
      FROM articles a
      JOIN creators c ON a.creator_id = c.id
      WHERE a.ghost_slug = ?
    `).get(slug) as any;

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Since it bypassed x402Middleware, it is paid
    return res.json({
      paid: true,
      article: {
        id: article.id,
        creator_id: article.creator_id,
        ghost_slug: article.ghost_slug,
        title: article.title,
        excerpt: article.excerpt,
        full_html: article.full_html,
        word_count: article.word_count,
        price_usdc: article.price_usdc,
        published_at: article.published_at,
        ghost_url: article.ghost_url,
        creator_wallet: article.creator_wallet
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
