import { Router } from 'express';
import { getDb } from '../db/index.js';

const router = Router();

router.get('/:creatorId', (req, res) => {
  const { creatorId } = req.params;
  const db = getDb();

  try {
    const creator = db.prepare('SELECT * FROM creators WHERE id = ?').get(creatorId) as any;
    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    const articles = db.prepare('SELECT * FROM articles WHERE creator_id = ? ORDER BY published_at DESC').all() as any[];

    // Generate valid RSS XML with custom namespaces for price & wallet
    let rss = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:inktoll="https://inktoll.org/rss/1.0">
  <channel>
    <title>Inktoll - Feed for ${creator.ghost_url}</title>
    <link>${creator.ghost_url}</link>
    <description>AI-powered knowledge monetization feed</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <generator>Inktoll Server</generator>
`;

    for (const article of articles) {
      rss += `    <item>
      <title><![CDATA[${article.title}]]></title>
      <link>${creator.ghost_url}/p/${article.ghost_slug}</link>
      <guid>${article.id}</guid>
      <pubDate>${new Date(article.published_at).toUTCString()}</pubDate>
      <description><![CDATA[${article.excerpt || ''}]]></description>
      <inktoll:slug>${article.ghost_slug}</inktoll:slug>
      <inktoll:price>${article.price_usdc}</inktoll:price>
      <inktoll:wallet>${creator.wallet_address}</inktoll:wallet>
      <inktoll:preview><![CDATA[${article.preview_text || ''}]]></inktoll:preview>
    </item>
`;
    }

    rss += `  </channel>
</rss>`;

    res.header('Content-Type', 'application/xml');
    return res.send(rss);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
