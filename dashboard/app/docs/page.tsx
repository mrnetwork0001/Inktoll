'use client';

import React, { useState } from 'react';
import Header from '../../components/Header';

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState(0);

  const sections = [
    {
      title: '1. Overview',
      id: 'overview',
      content: (
        <>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '1.25rem', color: 'var(--primary)', fontWeight: 700 }}>1. Overview</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '1.25rem', fontSize: '0.95rem' }}>
            Inktoll is a decentralized, gasless settlement protocol designed for the machine-to-human Web3 Knowledge Economy. By combining <strong>Circle Developer-Controlled Wallets</strong> and the <strong>Arc L1 blockchain</strong> (USDC-native gas chain), Inktoll enables autonomous AI agents to crawl, evaluate, and purchase intellectual property directly from creators using sub-cent micropayments.
          </p>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', fontSize: '0.95rem' }}>
            When an agent pulls knowledge from a previously unlocked article to answer a user prompt, the system detects the semantic citation and routes an automatic <strong>Citation Toll ($0.0001 USDC)</strong> directly to the creator's wallet.
          </p>
        </>
      )
    },
    {
      title: '2. Platform Roadmap',
      id: 'roadmap',
      content: (
        <>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '1.25rem', color: 'var(--primary)', fontWeight: 700 }}>2. Content Platform Roadmap</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '1.25rem', fontSize: '0.95rem' }}>
            To protect authorship and prevent plagiarism, Inktoll secures API handshakes with publishing platforms, verifying that payouts route strictly to original content authors.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.01)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '1.25rem' }}>🟢</span>
              <div>
                <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>Ghost (LIVE & Integrated)</strong>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5', display: 'block' }}>Fully functional. Creators onboard by simply pasting their Ghost URL and Content API Key. Inktoll indexes articles and wraps them with x402 paywalls gaslessly.</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.01)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '1.25rem' }}>🔵</span>
              <div>
                <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>X (Twitter) (30% Developed)</strong>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5', display: 'block' }}>Active milestone. Using X OAuth 2.0 and the X API, creators can import and stitch together high-value Twitter threads, monetizing their social alpha.</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.01)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)', opacity: 0.6 }}>
              <span style={{ fontSize: '1.25rem' }}>🟡</span>
              <div>
                <strong style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>WordPress (Coming Soon)</strong>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5', display: 'block' }}>Integration with the WP REST API v2.</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.01)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)', opacity: 0.6 }}>
              <span style={{ fontSize: '1.25rem' }}>🟡</span>
              <div>
                <strong style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Substack (Coming Soon)</strong>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5', display: 'block' }}>Integration with Substack RSS feed syndication.</span>
              </div>
            </div>
          </div>
        </>
      )
    },
    {
      title: '3. Dashboard Features',
      id: 'features',
      content: (
        <>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '1.25rem', color: 'var(--primary)', fontWeight: 700 }}>3. Dashboard Features</h2>
          <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.8', paddingLeft: '1.25rem', fontSize: '0.95rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <li><strong>Onboarding Guide:</strong> A step-by-step interactive tour powered by React Joyride that explains Web3 payout systems (Total Earnings vs Claimable Balances) to traditional Web2 creators.</li>
            <li><strong>Sync Gateway:</strong> A manual gateway sync command that bypasses blockchain latency, pulling pending AI agent payments directly into the creator's claimable on-chain balance.</li>
            <li><strong>Settlement Hub:</strong> Creators can cash out their Claimable Balance directly to MetaMask or any external Web3 wallet on the Arc L1 network.</li>
            <li><strong>Top Agent Fans:</strong> A leaderboard tracking the most active autonomous AI agents reading and citing your work.</li>
          </ul>
        </>
      )
    },
    {
      title: '4. AI Agent Mechanics',
      id: 'agents',
      content: (
        <>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '1.25rem', color: 'var(--primary)', fontWeight: 700 }}>4. AI Agent Mechanics</h2>
          <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.8', paddingLeft: '1.25rem', fontSize: '0.95rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <li><strong>Emergent Agentic Swarm:</strong> Our AI agents exhibit decentralized consensus. If an agent discovers a high-value article, it broadcasts an alpha signal over a Gossip Network, prompting other agents to autonomously swarm the content and buy read access.</li>
            <li><strong>Circle Programmable Wallets:</strong> Each AI reader agent operates a programmatic on-chain wallet funded with testnet USDC.</li>
            <li><strong>Dynamic Budgeting:</strong> Developers can enforce strict daily spending limits and maximum per-article purchase caps to guarantee agent financial safety.</li>
          </ul>
        </>
      )
    },
    {
      title: '5. Technical Stack',
      id: 'stack',
      content: (
        <>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '1.25rem', color: 'var(--primary)', fontWeight: 700 }}>5. Technical Stack</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            <p>
              <strong>Blockchain & Gas:</strong> Arc L1 Testnet (USDC-native gas chain)
            </p>
            <p>
              <strong>On-Chain Custody:</strong> Circle Developer-Controlled Wallets & Circle App Kit
            </p>
            <p>
              <strong>Artificial Intelligence:</strong> OpenAI GPT-4o-mini, LangChain, semantic text embeddings
            </p>
            <p>
              <strong>Backend API & Ledger:</strong> Node.js, Express, SQLite Database, PM2
            </p>
            <p>
              <strong>Dashboard Client:</strong> Next.js 16, Vanilla CSS, React Joyride, Framer Motion
            </p>
          </div>
        </>
      )
    }
  ];

  return (
    <div className="layout-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      
      <main className="main-content" style={{ padding: '4rem 1.5rem', maxWidth: '1000px', margin: '0 auto', width: '100%', flexGrow: 1 }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>Documentation</h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '3rem' }}>
          Welcome to the official Inktoll documentation. Learn how to onboard your publications, explore the roadmap, and understand our autonomous AI reader mechanics.
        </p>

        {/* Responsive Grid Layout */}
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start', width: '100%' }}>
          
          <style>{`
            .mobile-docs-nav {
              display: none !important;
            }
            .desktop-docs-nav {
              display: flex !important;
            }
            @media (max-width: 768px) {
              .mobile-docs-nav {
                display: block !important;
              }
              .desktop-docs-nav {
                display: none !important;
              }
            }
          `}</style>

          {/* Mobile Dropdown Menu (visible only on mobile) */}
          <div className="mobile-docs-nav" style={{ width: '100%', marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Select Section:</label>
            <select
              value={activeSection}
              onChange={(e) => setActiveSection(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '0.85rem 1.25rem',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--bg-active)',
                color: 'var(--text)',
                fontSize: '0.95rem',
                outline: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
              }}
            >
              {sections.map((sec, index) => (
                <option key={sec.id} value={index} style={{ background: '#1c1c1e', color: 'var(--text)' }}>
                  {sec.title}
                </option>
              ))}
            </select>
          </div>

          {/* Left Sidebar Menu */}
          <nav className="desktop-docs-nav" style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'sticky', top: '100px' }}>
            {sections.map((sec, index) => {
              const isActive = index === activeSection;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(index)}
                  style={{
                    textAlign: 'left',
                    padding: '0.85rem 1.25rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: isActive ? 'rgba(255, 107, 0, 0.06)' : 'rgba(255, 255, 255, 0.01)',
                    color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                    fontWeight: isActive ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    borderLeft: isActive ? '3px solid var(--primary)' : '1px solid var(--border)',
                    fontSize: '0.9rem'
                  }}
                  onMouseOver={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  }}
                  onMouseOut={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.01)';
                  }}
                >
                  {sec.title}
                </button>
              );
            })}
          </nav>

          {/* Right Content panel */}
          <div style={{ flex: '3 3 500px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Active Content Card */}
            <div className="glass-card" style={{ padding: '2.5rem', minHeight: '350px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
              <div>
                {sections[activeSection].content}
              </div>

              {/* Prev / Next Navigation Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: '2.5rem' }}>
                {activeSection > 0 ? (
                  <button
                    onClick={() => setActiveSection(activeSection - 1)}
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-secondary)',
                      padding: '0.6rem 1.2rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      transition: 'all 0.2s',
                      fontSize: '0.85rem'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  >
                    ← Previous
                  </button>
                ) : (
                  <div /> // Spacer
                )}

                {activeSection < sections.length - 1 ? (
                  <button
                    onClick={() => setActiveSection(activeSection + 1)}
                    style={{
                      background: 'var(--primary)',
                      border: 'none',
                      color: '#fff',
                      padding: '0.6rem 1.5rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      transition: 'all 0.2s',
                      fontSize: '0.85rem'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                    onMouseOut={(e) => e.currentTarget.style.filter = 'brightness(1)'}
                  >
                    Next →
                  </button>
                ) : (
                  <div /> // Spacer
                )}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
