import { Article } from '../db/index.js';

const MOCK_ARTICLES: Partial<Article>[] = [
  {
    ghost_slug: 'ai-agent-nanopayments-arc',
    title: 'The Rise of AI Agent Nanopayments on Arc L1',
    excerpt: 'AI agents are no longer just thinking; they are paying. Explore how stablecoin-native L1s like Arc settle nanopayments below $0.01 instantly and gaslessly.',
    full_html: `<p>AI agents are no longer just thinking; they are paying. Explore how stablecoin-native L1s like Arc settle nanopayments below $0.01 instantly and gaslessly.</p>
<p>Today, LLMs perform complex workflows but face severe friction when interacting with APIs that require credit cards or complex subscriptions. The solution is micropayments or nanopayments. By integrating stablecoin settlement directly into the agent logic, a LangChain agent can pay a fraction of a cent per API call or per article read. This enables a granular pay-as-you-go machine economy.</p>
<p>Arc, the stablecoin-native layer-1 blockchain powered by Circle, supports high throughput and near-instant finality, making it the perfect settlement layer for agent-to-agent transactions. Inktoll harnesses Arc to batch these nanopayments, keeping developer overhead minimal and user experience flawless.</p>`,
  },
  {
    ghost_slug: 'zero-knowledge-privacy-defi',
    title: 'Zero Knowledge Proofs: The Future of Privacy in DeFi',
    excerpt: 'An in-depth look at how ZK-SNARKs and membership proofs are reshaping compliance and privacy in decentralized finance.',
    full_html: `<p>An in-depth look at how ZK-SNARKs and membership proofs are reshaping compliance and privacy in decentralized finance.</p>
<p>In traditional finance, privacy is the default, and compliance is managed off-chain. In DeFi, everything is public, which poses massive frontrunning risks and makes proprietary trading impossible. Zero-knowledge proofs (ZKPs) solve this by allowing users to prove they comply with regulations (like being a non-US citizen or a qualified investor) without revealing their identity or balance.</p>
<p>As ZK technology matures, we are seeing the emergence of hybrid platforms that combine on-chain transparency with off-chain zero-knowledge computations. This balance is critical for institutional adoption of blockchain systems.</p>`,
  },
  {
    ghost_slug: 'agentic-web3-applications',
    title: 'Designing Agentic Web3 Applications',
    excerpt: 'How to build systems where autonomous software agents are first-class citizens on the blockchain.',
    full_html: `<p>How to build systems where autonomous software agents are first-class citizens on the blockchain.</p>
<p>Most Web3 applications are designed for human wallets connecting via MetaMask. But the future belongs to AI agents executing autonomous strategies. To accommodate them, smart contracts must be designed with machine-friendly interfaces, predictable gas models, and sub-second settlement.</p>
<p>Furthermore, agents need to manage their own budgets. We implement spending caps, per-transaction limits, and automatic sleep schedules so agents don't drain their wallets in infinite loops.</p>`,
  }
];

export async function fetchGhostArticles(
  ghostUrl: string,
  ghostApiKey: string
): Promise<Partial<Article>[]> {
  // Check if we should run in mock mode
  if (!ghostUrl || !ghostApiKey || ghostUrl.includes('mock')) {
    console.log('[Ghost Service] Running in mock mode, returning sample articles.');
    return MOCK_ARTICLES;
  }

  try {
    const cleanUrl = ghostUrl.replace(/\/$/, '');
    const endpoint = `${cleanUrl}/ghost/api/content/posts/?key=${ghostApiKey}&include=tags,authors&formats=html,plaintext&limit=all`;

    console.log(`[Ghost Service] Fetching articles from: ${endpoint}`);
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`Ghost API responded with status ${response.status}`);
    }

    const data = (await response.json()) as any;
    if (!data.posts || !Array.isArray(data.posts)) {
      throw new Error('Invalid response format from Ghost API');
    }

    return data.posts.map((post: any) => ({
      ghost_slug: post.slug,
      title: post.title,
      excerpt: post.excerpt || post.custom_excerpt || '',
      full_html: post.html || '',
      published_at: post.published_at,
    }));
  } catch (error: any) {
    console.error(`[Ghost Service] Error fetching articles: ${error.message}. Falling back to mock articles.`);
    return MOCK_ARTICLES;
  }
}
