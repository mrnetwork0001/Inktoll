'use client';

import React from 'react';
import Link from 'next/link';
import Header from '../components/Header';

export default function LandingPage() {
  return (
    <>
      <Header />
      <main style={{ padding: '4rem 0' }}>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
          
          {/* Hero Section */}
          <section style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Built for Lepton Agents Hackathon (Canteen × Circle)
            </span>
            <h1 style={{ fontSize: '3.5rem', lineHeight: '1.1', fontWeight: 800 }}>
              The AI-Powered <span style={{ background: 'linear-gradient(135deg, var(--primary-light), var(--primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Knowledge Economy</span>
            </h1>
            <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>
              A two-layer settlement protocol on Arc Testnet where creators get paid every time their work is read — and every time it is cited.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
              <Link href="/creator/onboard" className="btn btn-accent">
                ✍️ Onboard My Blog
              </Link>
              <Link href="/reader/setup" className="btn btn-primary">
                🤖 Spawn Reader Agent
              </Link>
            </div>
          </section>

          {/* Feature Grid */}
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontSize: '2.5rem' }}>⚡</div>
              <h3>Layer 1: Pay-Per-Read</h3>
              <p>
                Connect your Ghost blog and set per-article prices (e.g. $0.005 USDC). An autonomous AI agent discovers your posts, evaluates them against user interests, and pays gaslessly via EIP-3009.
              </p>
              <ul style={{ color: 'var(--text-secondary)', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem' }}>
                <li>No monthly subscriptions</li>
                <li>Settle nanopayments under $0.01</li>
                <li>Off-chain signatures verified on-chain</li>
              </ul>
            </div>

            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid rgba(245,166,35,0.3)' }}>
              <div style={{ fontSize: '2.5rem' }}>⚜️</div>
              <h3>Layer 2: Citation Tolls</h3>
              <p>
                When an AI agent uses your previously purchased articles to answer reader questions, the agent detects semantic similarity and pays a <strong>Citation Toll ($0.0001 USDC)</strong> back to your wallet.
              </p>
              <ul style={{ color: 'var(--text-secondary)', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem' }}>
                <li>Earn royalties on AI knowledge retrieval</li>
                <li>Recursive earnings for quality research</li>
                <li>Real-time automated citation logging</li>
              </ul>
            </div>

            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontSize: '2.5rem' }}>🤖</div>
              <h3>Autonomous Budgeting</h3>
              <p>
                Set reading interests, max price limits, and daily caps. Your agent acts as an autonomous consumer, running in the background and keeping your learning costs in check.
              </p>
              <ul style={{ color: 'var(--text-secondary)', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem' }}>
                <li>Automatic RSS feed discovery</li>
                <li>GPT-powered quality evaluations</li>
                <li>Self-pausing when budget is exhausted</li>
              </ul>
            </div>

          </section>

          {/* Interactive Payment Demo Placeholder */}
          <section className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
            <h2 style={{ marginBottom: '1rem' }}>Settle Gaslessly on Arc L1</h2>
            <p style={{ maxWidth: '600px', margin: '0 auto 2rem auto' }}>
              All nanopayments are batched via Circle Gateways and settled on the stablecoin-native Arc Testnet with sub-second finality.
            </p>
            <div className="payment-flow-viz" style={{ maxWidth: '600px', margin: '0 auto' }}>
              <div className="flow-node active">
                <div className="flow-node-icon">🤖</div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Reader Agent</span>
              </div>
              <div className="flow-line">
                <div className="flow-line-active"></div>
              </div>
              <div className="flow-node active">
                <div className="flow-node-icon">💳</div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Circle Gateway</span>
              </div>
              <div className="flow-line">
                <div className="flow-line-active"></div>
              </div>
              <div className="flow-node active">
                <div className="flow-node-icon">✍️</div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Creator Wallet</span>
              </div>
            </div>
          </section>

        </div>
      </main>
    </>
  );
}
