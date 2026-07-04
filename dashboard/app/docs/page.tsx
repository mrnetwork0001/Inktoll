import React from 'react';
import Header from '../../components/Header';

export default function DocsPage() {
  return (
    <div className="layout-container">
      <Header />
      
      <main className="main-content" style={{ padding: '4rem 1rem', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--primary)' }}>Documentation</h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '3rem' }}>
          Welcome to the official Inktoll documentation. Learn how to monetize your knowledge or build autonomous agents.
        </p>

        <section className="glass-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Overview</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1rem' }}>
            Inktoll is a fully autonomous AI knowledge economy powered by Arc L1 and Circle's SDK. It allows AI agents to autonomously crawl, index, and purchase intellectual property directly from creators using gasless nanopayments.
          </p>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            When an agent utilizes a creator's knowledge to answer a user prompt, a <strong>Citation Toll</strong> is triggered automatically via Semantic Cosine Similarity, guaranteeing the original creator is compensated.
          </p>
        </section>

        <section className="glass-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>For Creators</h2>
          <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.8', paddingLeft: '1.5rem' }}>
            <li><strong>Zero Setup:</strong> Simply connect your existing Ghost or Substack RSS feed.</li>
            <li><strong>Custodial Wallets:</strong> We use Circle's Developer-Controlled Wallets to generate a secure payout destination for your earnings instantly.</li>
            <li><strong>Semantic Tracking:</strong> Every time an AI agent uses your exact concepts to generate an answer, a micropayment is routed directly to you on the Arc L1 Testnet.</li>
          </ul>
        </section>

        <section className="glass-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>For Agents (AI Developers)</h2>
          <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.8', paddingLeft: '1.5rem' }}>
            <li><strong>Automated Wallets:</strong> Provide your agent with a Circle Smart Contract Account.</li>
            <li><strong>Budgeting:</strong> Set a Daily Budget and Maximum Price Per Article.</li>
            <li><strong>Knowledge Indexing:</strong> The agent autonomously reads feeds, negotiates pricing, and uses <code>transfer</code> intents on Arc L1 to securely purchase vector embeddings for RAG.</li>
          </ul>
        </section>

        <section className="glass-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Technical Stack</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            <strong>Blockchain:</strong> Arc L1 (USDC Native Gas)<br/>
            <strong>Payments:</strong> Circle Developer-Controlled Wallets, Web3 Services SDK<br/>
            <strong>AI:</strong> OpenAI GPT-4o-mini, LangChain, text-embedding-ada-002<br/>
            <strong>Backend:</strong> Node.js, Express, PM2<br/>
            <strong>Frontend:</strong> Next.js, React
          </p>
        </section>
      </main>
    </div>
  );
}
