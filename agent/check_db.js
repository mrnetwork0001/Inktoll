import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve('server/data/inktoll.db');
const db = new Database(dbPath);

console.log('--- CREATORS ---');
const creators = db.prepare('SELECT * FROM creators').all();
console.log(creators);

console.log('\n--- ARTICLES ---');
const articles = db.prepare('SELECT id, ghost_slug, title, price_usdc FROM articles').all();
console.log(articles);
