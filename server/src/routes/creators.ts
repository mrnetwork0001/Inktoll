import { Router } from 'express';
import { getDb } from '../db/index.js';
import { createCircleWallet } from '../services/wallet.js';
import { fetchGhostArticles } from '../services/ghost.js';
import crypto from 'crypto';

const router = Router();

router.post('/', async (req, res) => {
  const { ghostUrl, ghostApiKey, defaultPriceUsdc } = req.body;

  if (!ghostUrl) {
    return res.status(400).json({ error: 'ghostUrl is required' });
  }

  const db = getDb();

  try {
    // Generate unique ID based on Ghost URL hash
    const creatorId = crypto.createHash('md5').update(ghostUrl).digest('hex');

    // Check if creator already exists
    let creator = db.prepare('SELECT * FROM creators WHERE id = ?').get(creatorId) as any;

    if (!creator) {
      // Provision Circle wallet
      const wallet = await createCircleWallet(creatorId, 'creator');

      // Insert creator
      db.prepare(`
        INSERT INTO creators (id, ghost_url, ghost_api_key, wallet_address, wallet_id, default_price_usdc)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        creatorId,
        ghostUrl,
        ghostApiKey || '',
        wallet.address,
        wallet.id,
        parseFloat(defaultPriceUsdc || '0.005')
      );

      creator = {
        id: creatorId,
        ghost_url: ghostUrl,
        ghost_api_key: ghostApiKey || '',
        wallet_address: wallet.address,
        wallet_id: wallet.id,
        default_price_usdc: parseFloat(defaultPriceUsdc || '0.005'),
      };
    }

    // Fetch and import articles
    const posts = await fetchGhostArticles(ghostUrl, ghostApiKey);
    let importedCount = 0;

    for (const post of posts) {
      if (!post.ghost_slug || !post.title) continue;

      // Extract preview: first ~200 words from HTML or excerpt
      const textOnly = post.excerpt || post.full_html?.replace(/<[^>]*>/g, ' ') || '';
      const words = textOnly.trim().split(/\s+/);
      const previewText = words.slice(0, 200).join(' ') + (words.length > 200 ? '...' : '');

      const articleId = crypto.createHash('md5').update(`${creatorId}:${post.ghost_slug}`).digest('hex');

      // Check if article exists
      const existing = db.prepare('SELECT id FROM articles WHERE id = ?').get(articleId);

      if (!existing) {
        db.prepare(`
          INSERT INTO articles (id, creator_id, ghost_slug, title, excerpt, preview_text, full_html, word_count, price_usdc, published_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          articleId,
          creatorId,
          post.ghost_slug,
          post.title,
          post.excerpt || '',
          previewText,
          post.full_html || '',
          words.length,
          creator.default_price_usdc,
          post.published_at || new Date().toISOString()
        );
        importedCount++;
      }
    }

    return res.json({
      success: true,
      creatorId: creator.id,
      walletAddress: creator.wallet_address,
      defaultPriceUsdc: creator.default_price_usdc,
      articlesImported: importedCount,
      totalArticles: db.prepare('SELECT COUNT(*) as count FROM articles WHERE creator_id = ?').get(creator.id) as any
    });
  } catch (error: any) {
    console.error(`[Creators Route] Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

router.get('/', (req, res) => {
  const db = getDb();
  const creators = db.prepare('SELECT id, ghost_url, wallet_address, default_price_usdc FROM creators').all();
  return res.json(creators);
});

export default router;
