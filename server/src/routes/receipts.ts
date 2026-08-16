import { Router } from 'express';
import { getDb } from '../db/index.js';

const router = Router();

// Public, read-only receipt lookup: one payment, joined with its article,
// creator, and platform-verification state. Powers the shareable proof page.
router.get('/:paymentId', (req, res) => {
  const { paymentId } = req.params;
  const db = getDb();

  try {
    const receipt = db.prepare(`
      SELECT
        p.id,
        p.amount_usdc,
        p.payment_type,
        p.tx_hash,
        p.status,
        p.created_at,
        p.reader_agent_id,
        a.title as article_title,
        a.ghost_slug,
        c.ghost_url,
        c.platform,
        c.platform_verified,
        c.wallet_address as creator_wallet
      FROM payments p
      JOIN articles a ON p.article_id = a.id
      JOIN creators c ON a.creator_id = c.id
      WHERE p.id = ?
    `).get(paymentId) as any;

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    // An onchain hash is verifiable on Arcscan; anything else (batch ids,
    // sync placeholders) is settled via Circle Gateway batching.
    const onchain = /^0x[0-9a-fA-F]{64}$/.test(receipt.tx_hash || '');

    return res.json({
      success: true,
      receipt: {
        ...receipt,
        platform_verified: !!receipt.platform_verified,
        onchain,
        explorerUrl: onchain ? `https://testnet.arcscan.app/tx/${receipt.tx_hash}` : null,
      },
    });
  } catch (error: any) {
    console.error(`[Receipts] Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
