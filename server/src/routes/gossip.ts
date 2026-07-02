import express from 'express';
import { getDb } from '../db/index.js';
import { randomUUID } from 'crypto';

const router = express.Router();

// Get the latest high-value signals broadcasted by other agents
router.get('/', (req, res) => {
  const db = getDb();
  const limit = parseInt(req.query.limit as string) || 10;
  
  try {
    const signals = db.prepare(`
      SELECT * FROM agent_gossip_signals 
      ORDER BY created_at DESC 
      LIMIT ?
    `).all(limit);
    
    return res.json(signals);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Broadcast a new high-value signal
router.post('/broadcast', (req, res) => {
  const { broadcasting_agent_id, target_url, article_title, relevance_score } = req.body;

  if (!broadcasting_agent_id || !target_url || !article_title || relevance_score === undefined) {
    return res.status(400).json({ error: 'Missing required signal fields' });
  }

  const db = getDb();
  
  try {
    const id = randomUUID();
    const stmt = db.prepare(`
      INSERT INTO agent_gossip_signals (id, broadcasting_agent_id, target_url, article_title, relevance_score)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, broadcasting_agent_id, target_url, article_title, relevance_score);
    
    return res.json({ success: true, signal_id: id });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
