import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';

const dbPath = path.resolve('server/data/inktoll.db');
const db = new Database(dbPath);

const creatorId = '99ad2a6b6c225625f87c991a6d0391f1';
const ghostUrl = 'https://mrnetwork.ghost.io';
const ghostApiKey = '5553b3f4b5b9030af280b331c4';

console.log('[Direct Sync] Deleting mock articles...');
const delResult = db.prepare(`
  DELETE FROM articles 
  WHERE ghost_slug IN ('ai-agent-nanopayments-arc', 'zero-knowledge-privacy-defi', 'agentic-web3-applications')
`).run();
console.log(`[Direct Sync] Deleted ${delResult.changes} mock articles.`);

try {
  console.log('[Direct Sync] Fetching posts from Ghost API...');
  const endpoint = `${ghostUrl}/ghost/api/content/posts/?key=${ghostApiKey}&include=tags,authors&formats=html,plaintext&limit=all`;
  const response = await fetch(endpoint);
  
  if (!response.ok) {
    throw new Error(`Ghost API responded with status ${response.status}`);
  }
  
  const data = await response.json();
  const posts = data.posts || [];
  console.log(`[Direct Sync] Fetched ${posts.length} posts from Ghost.`);
  
  let inserted = 0;
  let updated = 0;
  
  for (const post of posts) {
    if (!post.slug || !post.title) continue;
    
    // Extract preview
    const textOnly = post.excerpt || post.html?.replace(/<[^>]*>/g, ' ') || '';
    const words = textOnly.trim().split(/\s+/);
    const previewText = words.slice(0, 200).join(' ') + (words.length > 200 ? '...' : '');
    
    const articleId = crypto.createHash('md5').update(`${creatorId}:${post.slug}`).digest('hex');
    
    const existing = db.prepare('SELECT id FROM articles WHERE id = ?').get(articleId);
    
    if (!existing) {
      db.prepare(`
        INSERT INTO articles (id, creator_id, ghost_slug, title, excerpt, preview_text, full_html, word_count, price_usdc, published_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        articleId,
        creatorId,
        post.slug,
        post.title,
        post.excerpt || '',
        previewText,
        post.html || '',
        words.length,
        0.005,
        post.published_at || new Date().toISOString()
      );
      inserted++;
    } else {
      db.prepare(`
        UPDATE articles
        SET title = ?, excerpt = ?, preview_text = ?, full_html = ?, word_count = ?, published_at = ?
        WHERE id = ?
      `).run(
        post.title,
        post.excerpt || '',
        previewText,
        post.html || '',
        words.length,
        post.published_at || new Date().toISOString(),
        articleId
      );
      updated++;
    }
  }
  
  console.log(`[Direct Sync] Success: Inserted ${inserted}, Updated ${updated} articles.`);
  
} catch (error) {
  console.error('[Direct Sync] Failed:', error);
}
