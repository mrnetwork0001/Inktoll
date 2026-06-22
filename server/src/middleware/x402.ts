import { Request, Response, NextFunction } from 'express';
import { getDb } from '../db/index.js';
import { submitGatewayPayment } from '../services/gateway.js';
import { ethers } from 'ethers';
import { config } from '../config.js';

export interface ExtendedRequest extends Request {
  paid?: boolean;
}

export async function x402Middleware(req: ExtendedRequest, res: Response, next: NextFunction) {
  const { slug } = req.params;
  const db = getDb();

  // Find the article
  const article = db.prepare('SELECT * FROM articles WHERE ghost_slug = ?').get(slug) as any;
  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }

  // Find the creator to get their wallet address
  const creator = db.prepare('SELECT wallet_address FROM creators WHERE id = ?').get(article.creator_id) as any;
  if (!creator) {
    return res.status(500).json({ error: 'Creator wallet configuration missing' });
  }

  const creatorWallet = creator.wallet_address;
  const authHeader = req.headers['x-payment-authorization'];

  if (authHeader) {
    try {
      // Expect JSON string in header or formatted as "fromAddress:signature:nonce:deadline"
      let authData: any;
      if (typeof authHeader === 'string' && authHeader.startsWith('{')) {
        authData = JSON.parse(authHeader);
      } else {
        // Fallback split format
        const [fromAddress, signature, nonce, deadlineStr] = (authHeader as string).split(':');
        authData = {
          fromAddress,
          toAddress: creatorWallet,
          amount: article.price_usdc,
          signature,
          nonce,
          deadline: parseInt(deadlineStr || '0', 10),
        };
      }

      // Check if reader has already paid for this article in the database to avoid double-payments
      const existingPayment = db.prepare(`
        SELECT id FROM payments 
        WHERE article_id = ? AND reader_agent_id = ? AND (status = 'settled' OR status = 'pending')
      `).get(article.id, authData.fromAddress);

      if (existingPayment) {
        console.log(`[x402 Middleware] Reader ${authData.fromAddress} already purchased article "${article.title}". Bypassing transaction.`);
        req.paid = true;
        return next();
      }

      // Verify the signature
      const isMock = authData.signature.startsWith('mock-');
      let signerAddress = authData.fromAddress;

      if (!isMock) {
        // Real ECDSA verification
        // Reconstruct the message that was signed
        const message = ethers.solidityPackedKeccak256(
          ['address', 'address', 'uint256', 'string', 'uint256'],
          [authData.fromAddress, creatorWallet, ethers.parseUnits(authData.amount.toString(), 6), authData.nonce, authData.deadline]
        );
        signerAddress = ethers.verifyMessage(ethers.getBytes(message), authData.signature);
      }

      if (signerAddress.toLowerCase() !== authData.fromAddress.toLowerCase()) {
        throw new Error('Signature verification failed: Signer does not match fromAddress');
      }

      // Submit payment to Gateway
      const settlement = await submitGatewayPayment({
        fromAddress: authData.fromAddress,
        toAddress: creatorWallet,
        amount: article.price_usdc,
        signature: authData.signature,
        nonce: authData.nonce,
        deadline: authData.deadline,
      });

      // Record payment in database
      const paymentId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO payments (id, article_id, reader_agent_id, amount_usdc, payment_type, tx_hash, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        paymentId,
        article.id,
        authData.fromAddress, // Use wallet address as reader_agent_id for tracking
        article.price_usdc,
        'read',
        settlement.txHash,
        settlement.status
      );

      // Flag request as paid and proceed to retrieve full content
      req.paid = true;
      return next();
    } catch (error: any) {
      console.error(`[x402 Middleware] Payment validation failed: ${error.message}`);
      return respondWith402(res, article, creatorWallet, error.message);
    }
  }

  // No authorization header present, return 402 with preview text
  return respondWith402(res, article, creatorWallet);
}

function respondWith402(res: Response, article: any, creatorWallet: string, errorDetail?: string) {
  // Set standard x402 headers
  res.setHeader('X-Payment-Required', 'true');
  res.setHeader('X-Payment-Amount', article.price_usdc.toString());
  res.setHeader('X-Payment-Token', 'USDC');
  res.setHeader('X-Payment-Network', 'arc-testnet');
  res.setHeader('X-Payment-Recipient', creatorWallet);
  res.setHeader('X-Payment-Gateway', config.circle.gatewayUrl);

  return res.status(402).json({
    status: 402,
    message: 'Payment Required to access full article content.',
    error: errorDetail || 'No authorization header provided',
    paymentDetails: {
      amount: article.price_usdc,
      token: 'USDC',
      network: 'arc-testnet',
      recipient: creatorWallet,
      gateway: config.circle.gatewayUrl,
    },
    preview: {
      id: article.id,
      title: article.title,
      excerpt: article.excerpt,
      preview_text: article.preview_text,
      published_at: article.published_at,
    },
  });
}
