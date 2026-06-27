import { getDb } from './src/db/index.js';
import fs from 'fs';

const db = getDb();
try {
  const article = db.prepare('SELECT * FROM articles WHERE ghost_slug = ?').get('the-rise-of-the-machine-economy-how-inktoll-is-making-ai-agents-pay-for-content') as any;
  if (!article) {
    console.log('Article not found');
  } else {
    console.log('Article Title:', article.title);
    console.log('Article Excerpt:', article.excerpt);
    console.log('Full HTML length:', article.full_html.length);
    // Write full_html to a text file to check for BOM or weird chars
    fs.writeFileSync('article_html.txt', article.full_html, 'utf8');
    console.log('Wrote HTML to article_html.txt');
  }
} catch (e) {
  console.error(e);
}
