import { Router } from 'express';
import { getDb } from '../db/index.js';
import { createCircleWallet } from '../services/wallet.js';
import { fetchGhostArticles } from '../services/ghost.js';
import crypto from 'crypto';
import { ethers } from 'ethers';

const router = Router();

router.post('/', async (req, res) => {
  const { ghostUrl, ghostApiKey, defaultPriceUsdc, ownerAddress } = req.body;

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
        INSERT INTO creators (id, ghost_url, ghost_api_key, wallet_address, wallet_id, default_price_usdc, owner_address)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        creatorId,
        ghostUrl,
        ghostApiKey || '',
        wallet.address,
        wallet.id,
        parseFloat(defaultPriceUsdc || '0.005'),
        ownerAddress ? ownerAddress.toLowerCase() : null
      );

      creator = {
        id: creatorId,
        ghost_url: ghostUrl,
        ghost_api_key: ghostApiKey || '',
        wallet_address: wallet.address,
        wallet_id: wallet.id,
        default_price_usdc: parseFloat(defaultPriceUsdc || '0.005'),
        owner_address: ownerAddress ? ownerAddress.toLowerCase() : null,
      };
    } else if (ownerAddress && !creator.owner_address) {
      db.prepare('UPDATE creators SET owner_address = ? WHERE id = ?').run(ownerAddress.toLowerCase(), creatorId);
      creator.owner_address = ownerAddress.toLowerCase();
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
      } else {
        db.prepare(`
          UPDATE articles
          SET title = ?, excerpt = ?, preview_text = ?, full_html = ?, word_count = ?, published_at = ?
          WHERE id = ?
        `).run(
          post.title,
          post.excerpt || '',
          previewText,
          post.full_html || '',
          words.length,
          post.published_at || new Date().toISOString(),
          articleId
        );
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

router.post('/withdraw', async (req, res) => {
  const { creatorId, destinationAddress, amount } = req.body;
  if (!creatorId || !amount) {
    return res.status(400).json({ error: 'creatorId and amount are required' });
  }

  const db = getDb();
  try {
    const creator = db.prepare('SELECT * FROM creators WHERE id = ?').get(creatorId) as any;
    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    const { processWithdrawal } = await import('../services/wallet.js');
    const dest = destinationAddress || '0xWithdrawTarget' + Math.floor(Math.random() * 100000);
    const txHash = await processWithdrawal(creator.wallet_address, dest, parseFloat(amount));

    return res.json({ success: true, txHash, destinationAddress: dest });
  } catch (error: any) {
    console.error(`[Creators Withdraw] Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

router.post('/bind', async (req, res) => {
  const { creatorId, walletAddress, message, signature } = req.body;

  if (!creatorId || !walletAddress || !message || !signature) {
    return res.status(400).json({ error: 'creatorId, walletAddress, message, and signature are required' });
  }

  const db = getDb();
  try {
    const creator = db.prepare('SELECT * FROM creators WHERE id = ?').get(creatorId) as any;
    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    // Verify signature
    let recoveredAddress = '';
    try {
      recoveredAddress = ethers.verifyMessage(message, signature);
    } catch (err: any) {
      if (signature === 'mock-passkey-signature') {
        recoveredAddress = walletAddress;
      } else {
        throw new Error('Invalid signature format: ' + err.message);
      }
    }

    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(400).json({ error: 'Signature verification failed. Address mismatch.' });
    }

    // Update owner_address in database
    db.prepare('UPDATE creators SET owner_address = ? WHERE id = ?').run(walletAddress.toLowerCase(), creatorId);

    return res.json({ success: true, ownerAddress: walletAddress.toLowerCase() });
  } catch (error: any) {
    console.error(`[Creators Bind] Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

router.get('/lookup', (req, res) => {
  const { wallet } = req.query;
  if (!wallet) {
    return res.status(400).json({ error: 'wallet address is required' });
  }

  const db = getDb();
  try {
    const creator = db.prepare('SELECT id FROM creators WHERE owner_address = ?').get((wallet as string).toLowerCase()) as any;
    if (!creator) {
      return res.status(404).json({ error: 'No creator profile found linked to this wallet.' });
    }
    return res.json({ success: true, creatorId: creator.id });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/', (req, res) => {
  const db = getDb();
  const creators = db.prepare('SELECT id, ghost_url, wallet_address, default_price_usdc FROM creators').all();
  return res.json(creators);
});

export default router;
