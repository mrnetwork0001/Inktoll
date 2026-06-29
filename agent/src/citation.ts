import { loadEmbeddingsIndex, generateMockEmbedding } from './tools/summarize.js';
import { getOrCreateAgentWallet } from './tools/pay.js';
import { loadHistory } from './budget.js';
import { OpenAI } from 'openai';
import { ethers } from 'ethers';
import crypto from 'crypto';

export interface CitationMatch {
  articleId: string;
  title: string;
  slug: string;
  similarity: number;
  authorWallet: string;
}

// Compute dot product of two vectors
function dotProduct(vecA: number[], vecB: number[]): number {
  let product = 0;
  for (let i = 0; i < vecA.length; i++) {
    product += vecA[i] * vecB[i];
  }
  return product;
}

export async function detectCitations(
  userId: string,
  answerText: string,
  openaiKey: string
): Promise<CitationMatch[]> {
  const isMock = !openaiKey || openaiKey === 'your_openai_api_key_here';
  let answerEmbedding: number[] = [];

  if (isMock) {
    answerEmbedding = generateMockEmbedding(answerText);
  } else {
    try {
      const openai = new OpenAI({ apiKey: openaiKey });
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: answerText,
      });
      answerEmbedding = response.data[0].embedding;
    } catch (error) {
      console.warn('[Citations] Real embedding failed, using mock:', error);
      answerEmbedding = generateMockEmbedding(answerText);
    }
  }

  const index = loadEmbeddingsIndex();
  const history = await loadHistory(userId);
  const matches: CitationMatch[] = [];

  for (const articleId of Object.keys(index)) {
    const item = index[articleId];

    // Multi-tenant check: Only allow citation if this specific user's agent paid for it
    if (!history.purchasedSlugs.includes(item.slug)) {
      continue;
    }

    let similarity = dotProduct(answerEmbedding, item.embedding);

    if (isMock) {
      // In mock mode, scale similarity so keyword hits cross the threshold
      if (similarity > 0.01) {
        similarity = 0.75 + (similarity * 0.2); // scale to 0.75 - 0.95 range
      } else {
        similarity = similarity * 5.0; // scale down
      }
      similarity = Math.min(similarity, 0.98);
    }

    // Log the similarity score for debugging/calibration
    console.log(`[Citations Check] Article: "${item.title}" | Similarity: ${similarity.toFixed(4)}`);

    // Threshold of 0.35 for OpenAI embeddings (0.75 for mock)
    const requiredThreshold = isMock ? 0.75 : 0.35;
    if (similarity >= requiredThreshold) {
      matches.push({
        articleId: item.articleId,
        title: item.title,
        slug: item.slug,
        similarity: parseFloat(similarity.toFixed(4)),
        authorWallet: item.authorWallet,
      });
    }
  }

  return matches;
}

export async function triggerCitationTolls(
  userId: string,
  matches: CitationMatch[],
  apiUrl: string
): Promise<any[]> {
  const agentWallet = await getOrCreateAgentWallet(userId);
  const results: any[] = [];

  for (const match of matches) {
    const tollAmount = 0.0001; // $0.0001 USDC per citation
    console.log(`[Citation Toll] Triggering citation toll for "${match.title}":
      Recipient Wallet: ${match.authorWallet}
      Amount: ${tollAmount} USDC
      Similarity Score: ${match.similarity}`);

    try {
      const nonce = '0x' + crypto.randomBytes(32).toString('hex');
      const deadline = Math.floor(Date.now() / 1000) + 86400 * 365; // 1 year validity
      const value = ethers.parseUnits(tollAmount.toString(), 6);

      // Sign citation toll authorization using EIP-712 typed data
      const domain = {
        name: 'GatewayWalletBatched',
        version: '1',
        chainId: parseInt(process.env.ARC_CHAIN_ID || '5042002', 10),
        verifyingContract: process.env.ARC_VERIFYING_CONTRACT || '0x0077777d7EBA4688BDeF3E311b846F25870A19B9'
      };

      const types = {
        TransferWithAuthorization: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'validAfter', type: 'uint256' },
          { name: 'validBefore', type: 'uint256' },
          { name: 'nonce', type: 'bytes32' }
        ]
      };

      const typedValue = {
        from: agentWallet.address,
        to: match.authorWallet,
        value: value.toString(),
        validAfter: 0,
        validBefore: deadline,
        nonce: nonce
      };

      const signature = await agentWallet.signTypedData(domain, types, typedValue);

      // Post citation payment to server
      const response = await fetch(`${apiUrl}/api/citations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articleId: match.articleId,
          readerAgentId: agentWallet.address,
          similarityScore: match.similarity,
          tollAmountUsdc: tollAmount.toString(),
          fromWallet: agentWallet.address,
          signature,
          nonce,
          deadline,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Server responded with ${response.status}: ${errText}`);
      }

      const resData = (await response.json()) as any;
      results.push({
        success: true,
        title: match.title,
        amount: tollAmount,
        txHash: resData.txHash,
      });
    } catch (err: any) {
      console.error(`[Citation Toll] Failed to send toll for "${match.title}": ${err.message}`);
      results.push({
        success: false,
        title: match.title,
        error: err.message,
      });
    }
  }

  return results;
}
