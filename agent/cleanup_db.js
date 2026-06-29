import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve('server/data/inktoll.db');
const db = new Database(dbPath);

console.log('[Cleanup] Deleting mock articles from SQLite...');
const result = db.prepare(`
  DELETE FROM articles 
  WHERE ghost_slug IN ('ai-agent-nanopayments-arc', 'zero-knowledge-privacy-defi', 'agentic-web3-applications')
`).run();

console.log(`[Cleanup] Deleted ${result.changes} mock articles.`);

console.log('[Cleanup] Triggering sync with Ghost API...');
try {
  const response = await fetch('http://localhost:3001/api/creators', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ghostUrl: 'https://mrnetwork.ghost.io',
      ghostApiKey: '5553b3f4b5b9030af280b331c4',
      defaultPriceUsdc: '0.005'
    })
  });
  
  const resData = await response.json();
  console.log('[Cleanup] Sync response:', resData);
} catch (error) {
  console.error('[Cleanup] Failed to trigger sync:', error);
}
