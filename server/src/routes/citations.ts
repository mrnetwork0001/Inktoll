import { Router } from 'express';
import { getDb } from '../db/index.js';
import { submitGatewayPayment } from '../services/gateway.js';
import crypto from 'crypto';

const router = Router();

router.post('/', async (req, res) => {
  const { articleId, readerAgentId, similarityScore, tollAmountUsdc, fromWallet, signature, nonce, deadline } = req.body;

  if (!articleId || !readerAgentId || !similarityScore || !tollAmountUsdc || !fromWallet) {
    return res.status(400).json({ error: 'Missing required citation fields' });
  }

  const db = getDb();

  try {
    // Verify article exists and find creator wallet
    const article = db.prepare(`
      SELECT a.*, c.wallet_address as creator_wallet
      FROM articles a
      JOIN creators c ON a.creator_id = c.id
      WHERE a.id = ?
    `).get(articleId) as any;

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const creatorWallet = article.creator_wallet;

    // Settle citation nanopayment
    const settlement = await submitGatewayPayment({
      fromAddress: fromWallet,
      toAddress: creatorWallet,
      amount: parseFloat(tollAmountUsdc),
      signature: signature || `mock-sig-${crypto.randomBytes(8).toString('hex')}`,
      nonce: nonce || crypto.randomUUID(),
      deadline: deadline || Math.floor(Date.now() / 1000) + 3600,
    });

    // Save payment record
    const paymentId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO payments (id, article_id, reader_agent_id, amount_usdc, payment_type, tx_hash, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      paymentId,
      articleId,
      readerAgentId,
      parseFloat(tollAmountUsdc),
      'citation',
      settlement.txHash,
      settlement.status
    );

    // Save citation record
    const citationId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO citations (id, article_id, reader_agent_id, similarity_score, toll_amount_usdc, payment_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      citationId,
      articleId,
      readerAgentId,
      parseFloat(similarityScore),
      parseFloat(tollAmountUsdc),
      paymentId
    );

    return res.json({
      success: true,
      citationId,
      paymentId,
      txHash: settlement.txHash,
      status: settlement.status
    });
  } catch (error: any) {
    console.error(`[Citations Route] Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

router.get('/', (req, res) => {
  const db = getDb();
  try {
    const citations = db.prepare(`
      SELECT c.*, a.title as article_title, cr.ghost_url
      FROM citations c
      JOIN articles a ON c.article_id = a.id
      JOIN creators cr ON a.creator_id = cr.id
      ORDER BY c.created_at DESC
    `).all();
    return res.json(citations);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
