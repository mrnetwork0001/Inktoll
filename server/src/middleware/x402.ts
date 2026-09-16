import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getDb } from '../db/index.js';
import { submitGatewayPayment } from '../services/gateway.js';
import { ethers } from 'ethers';
import { config } from '../config.js';

export interface ExtendedRequest extends Request {
  paid?: boolean;
}

const EIP712_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
};

function constantTimeEquals(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

// Trusted server-to-server read. The agent service holds the shared internal
// secret and asserts which agent address it is acting for; we still require a
// settled payment row for that exact agent + article. This replaces the old
// "mock-" signature bypass, which let anyone claim a known payer address and
// read for free (payer addresses are public on the graph and receipts).
function isTrustedAgentRead(req: Request, articleId: string): boolean {
  const secret = config.internalApiSecret;
  if (!secret) return false;

  const provided = req.headers['x-internal-secret'];
  if (typeof provided !== 'string' || !constantTimeEquals(provided, secret)) return false;

  const agentAddress = req.headers['x-agent-address'];
  if (typeof agentAddress !== 'string' || !agentAddress) return false;

  const db = getDb();
  const paid = db.prepare(`
    SELECT id FROM payments
    WHERE article_id = ? AND LOWER(reader_agent_id) = LOWER(?) AND status = 'settled'
  `).get(articleId, agentAddress);

  return !!paid;
}

// Recovers the payer from an EIP-712 TransferWithAuthorization signature, or
// from the legacy EIP-191 packed message. Returns null when the signature
// cannot be verified locally (in which case we never grant free access — the
// request must go through real settlement instead).
function recoverPayer(authData: any, creatorWallet: string): string | null {
  try {
    if (!authData.signature || typeof authData.signature !== 'string') return null;

    if (authData.nonce && String(authData.nonce).startsWith('0x') && String(authData.nonce).length === 66) {
      const domain = {
        name: 'GatewayWalletBatched',
        version: '1',
        chainId: config.arc.chainId,
        verifyingContract: config.arc.verifyingContract,
      };
      const message = {
        from: authData.fromAddress,
        to: authData.toAddress || creatorWallet,
        value: ethers.parseUnits(String(authData.amount), 6),
        validAfter: 0,
        validBefore: authData.deadline,
        nonce: authData.nonce,
      };
      return ethers.verifyTypedData(domain, EIP712_TYPES, message, authData.signature);
    }

    const packed = ethers.solidityPackedKeccak256(
      ['address', 'address', 'uint256', 'string', 'uint256'],
      [
        authData.fromAddress,
        creatorWallet,
        ethers.parseUnits(String(authData.amount), 6),
        authData.nonce,
        authData.deadline,
      ]
    );
    return ethers.verifyMessage(ethers.getBytes(packed), authData.signature);
  } catch {
    return null;
  }
}

export async function x402Middleware(req: ExtendedRequest, res: Response, next: NextFunction) {
  const { slug } = req.params;
  const db = getDb();

  const article = db.prepare('SELECT * FROM articles WHERE ghost_slug = ?').get(slug) as any;
  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }

  const creator = db.prepare('SELECT wallet_address FROM creators WHERE id = ?').get(article.creator_id) as any;
  if (!creator) {
    return res.status(500).json({ error: 'Creator wallet configuration missing' });
  }
  const creatorWallet = creator.wallet_address;

  // Trusted internal read for content an agent has already paid for.
  if (isTrustedAgentRead(req, article.id)) {
    req.paid = true;
    return next();
  }

  const authHeader =
    req.headers['x-payment-authorization'] ||
    req.headers['payment-signature'] ||
    req.headers['x-payment-signature'] ||
    req.headers['payment-authorization'];

  if (!authHeader) {
    return respondWith402(res, article, creatorWallet);
  }

  try {
    let decodedAuthHeader = authHeader;
    if (typeof authHeader === 'string' && !authHeader.trim().startsWith('{')) {
      try {
        decodedAuthHeader = Buffer.from(authHeader, 'base64').toString('utf-8');
      } catch {
        // may be the legacy split format
      }
    }

    let authData: any;
    let rawPayload: any;
    if (typeof decodedAuthHeader === 'string' && decodedAuthHeader.trim().startsWith('{')) {
      const parsed = JSON.parse(decodedAuthHeader);
      rawPayload = parsed;
      if (parsed.payload) {
        const auth = parsed.payload.authorization || parsed.payload;
        const sig = parsed.payload.signature || parsed.signature;
        authData = {
          fromAddress: auth.from || parsed.fromAddress,
          toAddress: auth.to || parsed.toAddress,
          amount: auth.value ? Number(auth.value) / 1e6 : parsed.amount, // USDC has 6 decimals
          signature: sig,
          nonce: auth.nonce || parsed.nonce,
          deadline: parseInt(auth.validBefore || parsed.deadline || '0', 10),
        };
      } else {
        authData = parsed;
      }
    } else {
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

    if (!authData.fromAddress || !authData.signature) {
      throw new Error('Payment authorization is missing fromAddress or signature');
    }

    // Verify the caller actually controls the address they claim to pay from.
    // Only a verified payer may use the already-purchased shortcut; anything
    // unverified must settle for real, and the facilitator is the final judge.
    const recovered = recoverPayer(authData, creatorWallet);
    const verifiedPayer = recovered && recovered.toLowerCase() === String(authData.fromAddress).toLowerCase();

    if (verifiedPayer) {
      const existingPayment = db.prepare(`
        SELECT id FROM payments
        WHERE article_id = ? AND LOWER(reader_agent_id) = LOWER(?) AND (status = 'settled' OR status = 'pending')
      `).get(article.id, authData.fromAddress);

      if (existingPayment) {
        console.log(`[x402] Verified payer ${authData.fromAddress} already purchased "${article.title}" — serving without a new charge.`);
        req.paid = true;
        return next();
      }
    }

    const settlement = await submitGatewayPayment(
      {
        fromAddress: authData.fromAddress,
        toAddress: creatorWallet,
        amount: article.price_usdc,
        signature: authData.signature,
        nonce: authData.nonce,
        deadline: authData.deadline,
      },
      rawPayload
    );

    const paymentId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO payments (id, article_id, reader_agent_id, amount_usdc, payment_type, tx_hash, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      paymentId,
      article.id,
      authData.fromAddress,
      article.price_usdc,
      'read',
      settlement.txHash,
      settlement.status
    );

    req.paid = true;
    return next();
  } catch (error: any) {
    console.error(`[x402] Payment validation failed: ${error.message}`);
    return respondWith402(res, article, creatorWallet, error.message);
  }
}

function respondWith402(res: Response, article: any, creatorWallet: string, errorDetail?: string) {
  const value = Math.round(article.price_usdc * 1e6).toString();
  const paymentRequiredObj = {
    x402Version: 2,
    resource: {
      url: `${config.publicApiUrl}/api/articles/${article.ghost_slug}`,
      description: article.title || 'Inktoll premium article content',
      mimeType: 'application/json',
    },
    accepts: [
      {
        scheme: 'exact',
        network: config.arc.x402Network,
        asset: config.arc.usdcAddress,
        amount: value,
        payTo: creatorWallet,
        maxTimeoutSeconds: 3600,
        extra: {
          name: 'GatewayWalletBatched',
          version: '1',
          verifyingContract: config.arc.verifyingContract,
        },
      },
    ],
  };
  const paymentRequiredBase64 = Buffer.from(JSON.stringify(paymentRequiredObj)).toString('base64');

  res.setHeader('Payment-Required', paymentRequiredBase64);
  res.setHeader('Payment-Amount', article.price_usdc.toString());
  res.setHeader('Payment-Token', 'USDC');
  res.setHeader('Payment-Network', config.arc.networkLabel);
  res.setHeader('Payment-Recipient', creatorWallet);
  res.setHeader('Payment-Gateway', config.circle.gatewayUrl);

  // Legacy header aliases
  res.setHeader('X-Payment-Required', paymentRequiredBase64);
  res.setHeader('X-Payment-Amount', article.price_usdc.toString());
  res.setHeader('X-Payment-Token', 'USDC');
  res.setHeader('X-Payment-Network', config.arc.networkLabel);
  res.setHeader('X-Payment-Recipient', creatorWallet);
  res.setHeader('X-Payment-Gateway', config.circle.gatewayUrl);

  return res.status(402).json({
    status: 402,
    message: 'Payment Required to access full article content.',
    error: errorDetail || 'No authorization header provided',
    paymentDetails: {
      amount: article.price_usdc,
      token: 'USDC',
      network: config.arc.networkLabel,
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
