import { ChatOpenAI } from '@langchain/openai';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { loadProfile } from '../profile.js';

export interface EvaluationResult {
  score: number; // 0 to 100
  reasoning: string;
  shouldBuy: boolean;
}

export async function evaluateArticle(
  title: string,
  previewText: string,
  price: number,
  openaiKey: string
): Promise<EvaluationResult> {
  const profile = loadProfile();

  const isMock = !openaiKey || openaiKey === 'your_openai_api_key_here';

  if (isMock) {
    // Local keyword scoring fallback
    console.log(`[Evaluate Tool] [MOCK] Evaluating article: "${title}"`);
    let matchCount = 0;
    const lowerTitle = title.toLowerCase();
    const lowerPreview = previewText.toLowerCase();

    for (const interest of profile.interests) {
      const parts = interest.toLowerCase().split(' ');
      for (const part of parts) {
        if (part.length > 3 && (lowerTitle.includes(part) || lowerPreview.includes(part))) {
          matchCount++;
        }
      }
    }

    // Base score on matches and price
    let score = 50 + matchCount * 10;
    if (price > 0.02) {
      score -= 10; // penalty for higher pricing
    }
    score = Math.min(Math.max(score, 0), 100);

    const shouldBuy = score >= 70;
    const reasoning = `[MOCK EVALUATION] Checked matching keywords from interests. Found ${matchCount} keyword hits. Score: ${score}/100. Price: $${price} USDC. ${
      shouldBuy
        ? 'Relevance is high enough, recommending purchase.'
        : 'Relevance is too low or price-to-value ratio is not optimal.'
    }`;

    return { score, reasoning, shouldBuy };
  }

  try {
    console.log(`[Evaluate Tool] [REAL] Querying GPT-4o-mini to evaluate article: "${title}"`);
    const model = new ChatOpenAI({
      openAIApiKey: openaiKey,
      modelName: 'gpt-4o-mini',
      temperature: 0.1,
    });

    const systemPrompt = `You are an autonomous AI reader agent assistant. Your goal is to evaluate article previews on behalf of a reader and decide if it is worth buying.
The reader's interest profile is:
Interests: ${profile.interests.join(', ')}
Max Price: $${profile.maxPricePerArticle} USDC
Daily Budget: $${profile.dailyBudgetUsdc} USDC

You must return a JSON response containing exactly these fields:
- "score": number from 0 to 100 representing how closely the article aligns with interests.
- "reasoning": 1-2 sentences explaining your decision.
- "shouldBuy": boolean. Set to true only if the score is 70 or above and the price is reasonable.

Ensure the output is valid JSON and nothing else.`;

    const humanPrompt = `Article Title: "${title}"
Article Preview: "${previewText}"
Article Price: $${price} USDC

Evaluate this article and return the JSON.`;

    const response = await model.call([
      new SystemMessage(systemPrompt),
      new HumanMessage(humanPrompt),
    ]);

    const content = response.text.trim();
    // Parse JSON safely
    const jsonStr = content.replace(/```json|```/g, '').trim();
    const result = JSON.parse(jsonStr) as EvaluationResult;

    return {
      score: typeof result.score === 'number' ? result.score : 50,
      reasoning: result.reasoning || 'LLM successfully evaluated content.',
      shouldBuy: !!result.shouldBuy,
    };
  } catch (error: any) {
    console.error(`[Evaluate Tool] Real LLM evaluation failed: ${error.message}. Falling back to mock.`);
    return evaluateArticle(title, previewText, price, ''); // Trigger mock fallback
  }
}
