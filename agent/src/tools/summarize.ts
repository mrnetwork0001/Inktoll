import fs from 'fs';
import path from 'path';
import { OpenAI } from 'openai';

export interface SummarizeResult {
  summary: string;
  embedding: number[];
}

const embeddingsPath = path.resolve('./data/embeddings.json');

// Retrieve all stored embeddings
export function loadEmbeddingsIndex(): Record<string, { title: string; articleId: string; embedding: number[]; authorWallet: string; slug: string }> {
  try {
    const dir = path.dirname(embeddingsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(embeddingsPath)) {
      fs.writeFileSync(embeddingsPath, '{}');
      return {};
    }
    const content = fs.readFileSync(embeddingsPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('[Embeddings] Error loading index:', error);
    return {};
  }
}

// Save embeddings index
export function saveEmbeddingsIndex(index: any): void {
  try {
    fs.writeFileSync(embeddingsPath, JSON.stringify(index, null, 2));
  } catch (error) {
    console.error('[Embeddings] Error saving index:', error);
  }
}

// Custom keyword hashing vector generator (1536 dimensions) for mock mode
export function generateMockEmbedding(text: string): number[] {
  const vector = new Array(1536).fill(0);
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);

  for (const word of words) {
    if (word.length <= 3) continue;

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash << 5) - hash + word.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }

    const index = Math.abs(hash) % 1536;
    vector[index] = 1.0;
  }

  // Normalize the vector (unit vector) so dot product equals cosine similarity
  let magnitude = 0;
  for (let i = 0; i < 1536; i++) {
    magnitude += vector[i] * vector[i];
  }
  magnitude = Math.sqrt(magnitude);

  if (magnitude > 0) {
    for (let i = 0; i < 1536; i++) {
      vector[i] = vector[i] / magnitude;
    }
  } else {
    vector[0] = 1.0; // fallback unit vector
  }

  return vector;
}

export async function summarizeAndEmbed(
  articleId: string,
  slug: string,
  title: string,
  fullHtml: string,
  authorWallet: string,
  openaiKey: string
): Promise<SummarizeResult> {
  const isMock = !openaiKey || openaiKey === 'your_openai_api_key_here';
  const textContent = fullHtml.replace(/<[^>]*>/g, ' ').trim();

  let summary = '';
  let embedding: number[] = [];

  if (isMock) {
    // Generate simple mock summary
    console.log(`[Summarize Tool] [MOCK] Summarizing article: "${title}"`);
    const sentences = textContent.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
    summary = `[MOCK SUMMARY] ${sentences.slice(0, 3).join('. ')}. This post details ${title.toLowerCase()} and explains its role in agentic networks.`;

    // Compute mock vector embedding
    embedding = generateMockEmbedding(textContent);
  } else {
    try {
      console.log(`[Summarize Tool] [REAL] Querying OpenAI API to summarize and embed...`);
      const openai = new OpenAI({ apiKey: openaiKey });

      // Generate Summary
      const summaryResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Summarize the provided article content in 2-3 sentences. Keep it informative and concise.',
          },
          {
            role: 'user',
            content: textContent,
          },
        ],
        max_tokens: 150,
      });
      summary = summaryResponse.choices[0].message?.content || '';

      // Generate Embedding
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: textContent,
      });
      embedding = embeddingResponse.data[0].embedding;
    } catch (error: any) {
      console.error(`[Summarize Tool] Real OpenAI failed: ${error.message}. Falling back to mock.`);
      return summarizeAndEmbed(articleId, slug, title, fullHtml, authorWallet, ''); // Trigger mock fallback
    }
  }

  // Save to index
  const index = loadEmbeddingsIndex();
  index[articleId] = {
    title,
    articleId,
    embedding,
    authorWallet,
    slug,
  };
  saveEmbeddingsIndex(index);

  return {
    summary,
    embedding,
  };
}
