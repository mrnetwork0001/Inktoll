import React from 'react';
import Header from '../../components/Header';

export default function DocsPage() {
  return (
    <div className="layout-container">
      <Header />
      
      <main className="main-content" style={{ padding: '4rem 1rem', maxWidth: '850px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--primary)' }}>Documentation</h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '3rem' }}>
          Welcome to the official Inktoll documentation. Learn how to onboard your publications, explore the roadmap, and understand our autonomous AI reader mechanics.
        </p>

        <section className="glass-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--primary)' }}>1. Overview</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1rem' }}>
            Inktoll is a decentralized, gasless settlement protocol designed for the machine-to-human Web3 Knowledge Economy. By combining **Circle Developer-Controlled Wallets** and the **Arc L1 blockchain** (USDC-native gas chain), Inktoll enables autonomous AI agents to crawl, evaluate, and purchase intellectual property directly from creators using sub-cent micropayments.
          </p>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            When an agent pulls knowledge from a previously unlocked article to answer a user prompt, the system detects the semantic citation and routes an automatic **Citation Toll ($0.0001 USDC)** directly to the creator's wallet.
          </p>
        </section>

        <section className="glass-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.25rem', color: 'var(--primary)' }}>2. Content Platform Roadmap</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1rem' }}>
            To protect authorship and prevent plagiarism, Inktoll secures API handshakes with publishing platforms, verifying that payouts route strictly to original content authors.
          </p>
          <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.8', paddingLeft: '1.5rem', listStyleType: 'none' }}>
            <li>🟢 <strong>Ghost (LIVE & Integrated):</strong> Fully functional. Creators onboard by simply pasting their Ghost URL and Content API Key. Inktoll indexes articles and wraps them with x402 paywalls gaslessly.</li>
            <li>🔵 <strong>X (Twitter) (30% Developed):</strong> Active milestone. Using X OAuth 2.0 and the X API, creators can import and stitch together high-value Twitter threads, monetizing their social alpha.</li>
            <li>🟡 <strong>WordPress (Coming Soon):</strong> Integration with the WP REST API v2.</li>
            <li>🟡 <strong>Substack (Coming Soon):</strong> Integration with Substack RSS feed syndication.</li>
          </ul>
        </section>

        <section className="glass-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--primary)' }}>3. Dashboard Features</h2>
          <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.8', paddingLeft: '1.5rem' }}>
            <li><strong>Onboarding Guide:</strong> A step-by-step interactive tour powered by React Joyride that explains Web3 payout systems (Total Earnings vs Claimable Balances) to traditional Web2 creators.</li>
            <li><strong>Sync Gateway:</strong> A manual gateway sync command that bypasses blockchain latency, pulling pending AI agent payments directly into the creator's claimable on-chain balance.</li>
            <li><strong>Settlement Hub:</strong> Creators can cash out their Claimable Balance directly to MetaMask or any external Web3 wallet on the Arc L1 network.</li>
            <li><strong>Top Agent Fans:</strong> A leaderboard tracking the most active autonomous AI agents reading and citing your work.</li>
          </ul>
        </section>

        <section className="glass-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--primary)' }}>4. AI Agent Mechanics (Developers)</h2>
          <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.8', paddingLeft: '1.5rem' }}>
            <li><strong>Emergent Agentic Swarm:</strong> Our AI agents exhibit decentralized consensus. If an agent discovers a high-value article, it broadcasts an alpha signal over a Gossip Network, prompting other agents to autonomously swarm the content and buy read access.</li>
            <li><strong>Circle Programmable Wallets:</strong> Each AI reader agent operates a programmatic on-chain wallet funded with testnet USDC.</li>
            <li><strong>Dynamic Budgeting:</strong> Developers can enforce strict daily spending limits and maximum per-article purchase caps to guarantee agent financial safety.</li>
          </ul>
        </section>

        <section className="glass-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--primary)' }}>5. Technical Stack</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            <strong>Blockchain & Gas:</strong> Arc L1 Testnet (USDC-native gas chain)<br/>
            <strong>On-Chain Custody:</strong> Circle Developer-Controlled Wallets & Circle App Kit<br/>
            <strong>Artificial Intelligence:</strong> OpenAI GPT-4o-mini, LangChain, semantic text embeddings<br/>
            <strong>Backend API & Ledger:</strong> Node.js, Express, SQLite Database, PM2<br/>
            <strong>Dashboard Client:</strong> Next.js 16, Vanilla CSS, React Joyride, Framer Motion
          </p>
        </section>
      </main>
    </div>
  );
}
