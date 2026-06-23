'use client';

import React from 'react';
import Link from 'next/link';
import Header from '../components/Header';

export default function LandingPage() {
  return (
    <>
      <Header />
      <main style={{ padding: '4rem 0' }}>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '6rem', paddingBottom: '4rem' }}>
          
          {/* 1. Hero Section */}
          <section style={{ textAlign: 'center', maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingTop: '2rem' }}>
            <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Built for Lepton Agents Hackathon (Canteen × Circle)
            </span>
            <h1 style={{ fontSize: '4.5rem', lineHeight: '1.1', fontWeight: 800 }}>
              The AI-Powered <span style={{ background: 'linear-gradient(135deg, var(--primary-light), var(--primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Knowledge Economy</span>
            </h1>
            <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', maxWidth: '800px', margin: '0 auto', lineHeight: '1.6' }}>
              Inktoll solves the AI copyright crisis through a two-layer settlement protocol built on the Circle Arc Testnet. 
              We enable autonomous AI agents to browse, read, and cite high-quality content—while instantly paying creators in USDC for their work via gasless nanopayments.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
              <Link href="/creator/dashboard" className="btn btn-primary" style={{ padding: '1rem 3.5rem', fontSize: '1.3rem', fontWeight: 'bold', borderRadius: '50px', boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.4)' }}>
                🚀 Launch App
              </Link>
            </div>
          </section>

          {/* 2. The Problem */}
          <section className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '4rem 2rem', gap: '1.5rem', border: '1px solid rgba(239,68,68,0.2)', background: 'linear-gradient(to bottom, rgba(239,68,68,0.05), transparent)' }}>
            <h2 style={{ fontSize: '2.5rem' }}>The AI Copyright Crisis</h2>
            <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: '800px', lineHeight: '1.7' }}>
              Large Language Models are crawling the web and consuming creators' content for free. In response, publishers are putting up paywalls and blocking AI bots. The open internet is fracturing. <strong>Inktoll bridges this gap by creating an economy where agents can pay for what they consume.</strong>
            </p>
          </section>

          {/* 3. Layer 1: Pay-Per-Read */}
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '4rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ fontSize: '3rem', background: 'var(--bg-active)', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '20px' }}>⚡</div>
              <h2 style={{ fontSize: '2.5rem' }}>Layer 1: Pay-Per-Read</h2>
              <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                Connect your Ghost or Substack blog and set direct per-article prices (e.g., $0.005 USDC). When an autonomous AI reader agent or a human user discovers your posts, they evaluate it and pay instantly via EIP-3009 gasless transfers.
              </p>
              <ul style={{ color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '1.1rem', marginTop: '1rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><span style={{ color: 'var(--success)' }}>✓</span> Zero monthly subscription barriers</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><span style={{ color: 'var(--success)' }}>✓</span> Settle nanopayments as small as $0.001</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><span style={{ color: 'var(--success)' }}>✓</span> Off-chain signatures verified gaslessly on Arc</li>
              </ul>
            </div>
            <div className="glass-card" style={{ padding: '3rem', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'center', borderRadius: '24px' }}>
              <h3 style={{ color: 'var(--text-secondary)' }}>Live Transaction Preview</h3>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--success)' }}>+ $0.005 USDC</div>
              <p style={{ color: 'var(--text-secondary)' }}>Agent "ResearchBot_99" purchased access to your article: "The Future of AI Settlement"</p>
            </div>
          </section>

          {/* 4. Layer 2: Citation Tolls */}
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '4rem', alignItems: 'center', direction: 'rtl' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', direction: 'ltr' }}>
              <div style={{ fontSize: '3rem', background: 'var(--bg-active)', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '20px' }}>⚜️</div>
              <h2 style={{ fontSize: '2.5rem' }}>Layer 2: Citation Tolls</h2>
              <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                The knowledge economy doesn't stop at reading. When an AI agent utilizes your previously purchased articles to generate a response or answer a user's question, the protocol detects the semantic citation and routes a <strong>Citation Toll ($0.0001 USDC)</strong> back to your wallet.
              </p>
              <ul style={{ color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '1.1rem', marginTop: '1rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><span style={{ color: 'var(--accent)' }}>✓</span> Earn perpetual royalties on AI knowledge retrieval</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><span style={{ color: 'var(--accent)' }}>✓</span> Recursive network effects for quality research</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><span style={{ color: 'var(--accent)' }}>✓</span> Automated, immutable citation logging</li>
              </ul>
            </div>
            <div className="glass-card" style={{ padding: '3rem', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left', borderRadius: '24px', direction: 'ltr', border: '1px solid rgba(245,166,35,0.3)' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agent Response</div>
              <p style={{ fontStyle: 'italic', color: 'var(--text-primary)' }}>"According to recent research on decentralized protocols, the future of content monetization lies in nanopayments..."</p>
              <hr style={{ border: 'none', borderBottom: '1px solid var(--border)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Citation Toll Paid:</span>
                <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>$0.0001 USDC</span>
              </div>
            </div>
          </section>

          {/* 5. For Readers: Autonomous Budgets */}
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '4rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ fontSize: '3rem', background: 'var(--bg-active)', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '20px' }}>🤖</div>
              <h2 style={{ fontSize: '2.5rem' }}>Autonomous Agent Budgets</h2>
              <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                Users spawn intelligent agents with specific reading interests, maximum price limits, and daily USDC caps. Your agent acts as an autonomous knowledge consumer, curating feeds and purchasing only the highest quality content without draining your wallet.
              </p>
              <ul style={{ color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '1.1rem', marginTop: '1rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><span style={{ color: 'var(--primary)' }}>✓</span> Automatic content discovery via RSS</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><span style={{ color: 'var(--primary)' }}>✓</span> LLM-powered quality and relevance evaluations</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><span style={{ color: 'var(--primary)' }}>✓</span> Smart self-pausing when daily budget is exhausted</li>
              </ul>
            </div>
            <div className="glass-card" style={{ padding: '3rem', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', gap: '1.5rem', borderRadius: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Daily Spending Cap</span>
                <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>$1.00 USDC</span>
              </div>
              <div style={{ height: '8px', background: 'var(--bg-active)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '45%', background: 'var(--primary)' }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <span>$0.45 Spent (90 Articles)</span>
                <span>$0.55 Remaining</span>
              </div>
            </div>
          </section>

          {/* 6. Interactive Payment Demo Placeholder */}
          <section className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem', marginTop: '2rem', border: '1px solid var(--border)' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '2.5rem' }}>Settled Gaslessly on Arc Testnet</h2>
            <p style={{ maxWidth: '800px', margin: '0 auto 4rem auto', fontSize: '1.2rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              All nanopayments are batched via Circle Programmable Wallets and settled on the stablecoin-native Arc Testnet with sub-second finality. No ETH required for gas—everything is priced and settled purely in USDC.
            </p>
            <div className="payment-flow-viz" style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="flow-node active" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '120px' }}>
                <div className="flow-node-icon" style={{ fontSize: '3rem', background: 'var(--bg-active)', padding: '2rem', borderRadius: '50%', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>🤖</div>
                <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>Reader Agent</span>
              </div>
              <div className="flow-line" style={{ flex: 1, height: '6px', background: 'var(--border)', margin: '0 1rem', position: 'relative', borderRadius: '3px' }}>
                <div className="flow-line-active" style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '100%', background: 'linear-gradient(90deg, var(--primary), var(--accent))', opacity: 0.8, borderRadius: '3px' }}></div>
              </div>
              <div className="flow-node active" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '120px' }}>
                <div className="flow-node-icon" style={{ fontSize: '3rem', background: 'var(--bg-active)', padding: '2rem', borderRadius: '50%', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>💳</div>
                <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>Circle Paymaster</span>
              </div>
              <div className="flow-line" style={{ flex: 1, height: '6px', background: 'var(--border)', margin: '0 1rem', position: 'relative', borderRadius: '3px' }}>
                <div className="flow-line-active" style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '100%', background: 'linear-gradient(90deg, var(--accent), var(--success))', opacity: 0.8, borderRadius: '3px' }}></div>
              </div>
              <div className="flow-node active" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '120px' }}>
                <div className="flow-node-icon" style={{ fontSize: '3rem', background: 'var(--bg-active)', padding: '2rem', borderRadius: '50%', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>✍️</div>
                <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>Creator Wallet</span>
              </div>
            </div>
          </section>

          {/* 7. FAQ Section */}
          <section style={{ maxWidth: '800px', margin: '4rem auto 0 auto', display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
            <h2 style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '2rem' }}>Frequently Asked Questions</h2>
            
            <details className="glass-card faq-item" style={{ padding: '1.5rem', marginBottom: '0.5rem' }}>
              <summary className="faq-summary">
                <span>What exactly is Inktoll?</span>
                <span className="faq-icon">+</span>
              </summary>
              <div className="faq-content">
                Inktoll is a decentralized settlement protocol that allows AI agents and human users to pay creators instantly in USDC when reading or citing their content. We solve the AI copyright crisis by creating a direct, frictionless payment layer.
              </div>
            </details>

            <details className="glass-card faq-item" style={{ padding: '1.5rem', marginBottom: '0.5rem' }}>
              <summary className="faq-summary">
                <span>How do "gasless" nanopayments work?</span>
                <span className="faq-icon">+</span>
              </summary>
              <div className="faq-content">
                By leveraging Circle Programmable Wallets and EIP-3009 off-chain signatures, payments as small as $0.001 USDC can be batched and settled on the stablecoin-native Arc Testnet. This means you don't need to hold or pay any network gas fees (like ETH) to interact with the protocol!
              </div>
            </details>

            <details className="glass-card faq-item" style={{ padding: '1.5rem', marginBottom: '0.5rem' }}>
              <summary className="faq-summary">
                <span>What is a Citation Toll?</span>
                <span className="faq-icon">+</span>
              </summary>
              <div className="faq-content">
                The knowledge economy doesn't stop at reading. When an AI agent uses your previously purchased content to generate an answer for a user, Inktoll's semantic tracking detects the citation and automatically routes a micro-royalty (e.g. $0.0001) back to your wallet.
              </div>
            </details>

            <details className="glass-card faq-item" style={{ padding: '1.5rem', marginBottom: '0.5rem' }}>
              <summary className="faq-summary">
                <span>Do I need to be a crypto expert to use this?</span>
                <span className="faq-icon">+</span>
              </summary>
              <div className="faq-content">
                Not at all! We use Circle's WebAuthn Passkeys so you can create a secure onchain wallet using just FaceID or your fingerprint—no seed phrases, extensions, or crypto knowledge required.
              </div>
            </details>

            <details className="glass-card faq-item" style={{ padding: '1.5rem', marginBottom: '0.5rem' }}>
              <summary className="faq-summary">
                <span>How do agents avoid spending all my money?</span>
                <span className="faq-icon">+</span>
              </summary>
              <div className="faq-content">
                Users can set strict daily USDC spending caps and maximum per-article prices for their agents. Once your agent hits its budget, it pauses automatically until the next day, ensuring complete financial safety while curating your feed.
              </div>
            </details>
          </section>

        </div>
      </main>
    </>
  );
}
