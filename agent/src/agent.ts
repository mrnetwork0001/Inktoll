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

  // 1. Listen for Swarm Gossip
  let gossipTargets: string[] = [];
  try {
    const res = await fetch(`${apiUrl}/api/gossip?limit=5`);
    if (res.ok) {
       const signals = (await res.json()) as any[];
       for (const sig of signals) {
           if (sig.broadcasting_agent_id !== userId) {
               gossipTargets.push(sig.target_url);
               log(`[Swarm Alert] Detected high-value signal for "${sig.article_title}" from Agent ${sig.broadcasting_agent_id.substring(0,8)}. Prioritizing...`);
           }
       }
    }
  } catch (err) {
    // Ignore if gossip isn't reachable
  }

  // 2. Discover articles
  const unread = await discoverNewArticles(userId, apiUrl);
  
  // Reorder to prioritize gossip targets
  unread.sort((a, b) => {
      const aIsGossip = gossipTargets.includes(a.slug);
      const bIsGossip = gossipTargets.includes(b.slug);
      if (aIsGossip && !bIsGossip) return -1;
      if (!aIsGossip && bIsGossip) return 1;
      return 0;
  });

  summary.articlesDiscovered = unread.length;

  if (unread.length === 0) {
    log('No new articles discovered.');
    return summary;
  }

  // 3. Evaluate and process each article
  for (const article of unread) {
    const isSwarm = gossipTargets.includes(article.slug);
    log(`Evaluating article: "${article.title}" ($${article.price} USDC)${isSwarm ? ' [SWARM TARGET]' : ''}`);
    summary.articlesEvaluated++;

    // Check budget
    const budgetCheck = await checkBudget(userId, article.price);
    if (!budgetCheck.allowed) {
      log(`Skipped "${article.title}": ${budgetCheck.reason}`);
      continue;
    }

    // Score article
    try {
      // If it's a swarm target, we give it an automatic LLM bias bump by asking LLM or just hardcode bump
      let evaluation = await evaluateArticle(userId, article.title, article.preview, article.price, openaiKey);
      if (isSwarm && evaluation.score < 80) {
         evaluation.score += 20; // Swarm bias
         evaluation.shouldBuy = true;
         evaluation.reasoning += " (Swarm Consensus Bias applied)";
      }
      
      log(`Evaluation: Score ${evaluation.score}/100. Reasoning: ${evaluation.reasoning}`);

      if (evaluation.shouldBuy) {
        log(`Decision: BUY "${article.title}"`);

        // Execute payment and fetch content
        const payResult = await payAndFetchArticle(userId, article.slug, article.price, article.wallet, apiUrl);

        if (payResult.success && payResult.article) {
          log(`Payment Succeeded! Unlocked content for "${article.title}".`);

          // Broadcast Gossip if score is very high and it wasn't already a gossip target
          if (evaluation.score >= 85 && !isSwarm) {
             try {
                log(`[Swarm Broadcast] Broadcasting high-value signal for "${article.title}" to network...`);
                await fetch(`${apiUrl}/api/gossip/broadcast`, {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({
                       broadcasting_agent_id: userId,
                       target_url: article.slug,
                       article_title: article.title,
                       relevance_score: evaluation.score
                   })
                });
             } catch (e) {}
          }

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
