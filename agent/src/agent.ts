import { discoverNewArticles, DiscoverResult } from './tools/discover.js';
import { evaluateArticle } from './tools/evaluate.js';
import { payAndFetchArticle } from './tools/pay.js';
import { summarizeAndEmbed } from './tools/summarize.js';
import { checkBudget } from './budget.js';

export interface RunSummary {
  articlesDiscovered: number;
  articlesEvaluated: number;
  articlesPurchased: number;
  totalSpentUsdc: number;
  logs: string[];
}

export async function runAutonomousAgent(userId: string, apiUrl: string, openaiKey: string): Promise<RunSummary> {
  const summary: RunSummary = {
    articlesDiscovered: 0,
    articlesEvaluated: 0,
    articlesPurchased: 0,
    totalSpentUsdc: 0,
    logs: [],
  };

  const log = (msg: string) => {
    const formatted = `[Agent Run] ${msg}`;
    console.log(formatted);
    summary.logs.push(formatted);
  };

  log('Starting autonomous run loop...');

  // 1. Discover articles
  const unread = await discoverNewArticles(userId, apiUrl);
  summary.articlesDiscovered = unread.length;

  if (unread.length === 0) {
    log('No new articles discovered.');
    return summary;
  }

  // 2. Evaluate and process each article
  for (const article of unread) {
    log(`Evaluating article: "${article.title}" ($${article.price} USDC)`);
    summary.articlesEvaluated++;

    // Check budget
    const budgetCheck = await checkBudget(userId, article.price);
    if (!budgetCheck.allowed) {
      log(`Skipped "${article.title}": ${budgetCheck.reason}`);
      continue;
    }

    // Score article
    try {
      const evaluation = await evaluateArticle(userId, article.title, article.preview, article.price, openaiKey);
      log(`Evaluation: Score ${evaluation.score}/100. Reasoning: ${evaluation.reasoning}`);

      if (evaluation.shouldBuy) {
        log(`Decision: BUY "${article.title}"`);

        // Execute payment and fetch content
        const payResult = await payAndFetchArticle(userId, article.slug, article.price, article.wallet, apiUrl);

        if (payResult.success && payResult.article) {
          log(`Payment Succeeded! Unlocked content for "${article.title}".`);

          // Summarize and embed
          const sumResult = await summarizeAndEmbed(
            payResult.article.id,
            article.slug,
            article.title,
            payResult.article.full_html,
            article.wallet,
            openaiKey
          );

          log(`Summary compiled: "${sumResult.summary.substring(0, 80)}..."`);
          summary.articlesPurchased++;
          summary.totalSpentUsdc = parseFloat((summary.totalSpentUsdc + article.price).toFixed(6));
        } else {
          log(`Payment Failed for "${article.title}": ${payResult.error}`);
        }
      } else {
        log(`Decision: SKIP "${article.title}" (Relevance score is too low)`);
      }
    } catch (err: any) {
      log(`Error processing article "${article.title}": ${err.message}`);
    }

    // Add brief pause between articles for realistic timing
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  log(`Autonomous run finished. Purchased ${summary.articlesPurchased} articles. Total Spent: $${summary.totalSpentUsdc} USDC.`);
  return summary;
}
