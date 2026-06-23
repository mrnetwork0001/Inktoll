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
          <section style={{ textAlign: 'center', maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Built for Lepton Agents Hackathon (Canteen × Circle)
            </span>
            <h1 style={{ fontSize: '4rem', lineHeight: '1.1', fontWeight: 800 }}>
              The AI-Powered <span style={{ background: 'linear-gradient(135deg, var(--primary-light), var(--primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Knowledge Economy</span>
            </h1>
            <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', maxWidth: '800px', margin: '0 auto', lineHeight: '1.6' }}>
              Inktoll solves the AI copyright crisis through a two-layer settlement protocol built on the Circle Arc Testnet. 
              We enable autonomous AI agents to browse, read, and cite high-quality content—while instantly paying creators in USDC for their work via gasless nanopayments.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
              <Link href="/creator/dashboard" className="btn btn-primary" style={{ padding: '1rem 3rem', fontSize: '1.2rem', fontWeight: 'bold', borderRadius: '50px', boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.4)' }}>
                🚀 Launch App
              </Link>
            </div>
          </section>

          {/* Feature Grid */}
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
            
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontSize: '2.5rem' }}>⚡</div>
              <h3>Layer 1: Pay-Per-Read</h3>
              <p>
                Connect your Ghost or Substack blog and set direct per-article prices (e.g., $0.005 USDC). When an autonomous AI reader agent or a human user discovers your posts, they evaluate it and pay instantly via EIP-3009 gasless transfers.
              </p>
              <ul style={{ color: 'var(--text-secondary)', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem' }}>
                <li>Zero monthly subscription barriers</li>
                <li>Settle nanopayments as small as $0.001</li>
                <li>Off-chain signatures verified gaslessly on Arc</li>
              </ul>
            </div>

            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid rgba(245,166,35,0.3)' }}>
              <div style={{ fontSize: '2.5rem' }}>⚜️</div>
              <h3>Layer 2: Citation Tolls</h3>
              <p>
                The knowledge economy doesn't stop at reading. When an AI agent utilizes your previously purchased articles to generate a response or answer a question, the protocol detects the semantic citation and routes a <strong>Citation Toll ($0.0001 USDC)</strong> back to your wallet.
              </p>
              <ul style={{ color: 'var(--text-secondary)', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem' }}>
                <li>Earn perpetual royalties on AI knowledge retrieval</li>
                <li>Recursive network effects for quality research</li>
                <li>Automated, immutable citation logging</li>
              </ul>
            </div>

            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontSize: '2.5rem' }}>🤖</div>
              <h3>Autonomous Agent Budgets</h3>
              <p>
                Users spawn intelligent agents with specific reading interests, maximum price limits, and daily USDC caps. Your agent acts as an autonomous knowledge consumer, curating feeds and purchasing only the highest quality content.
              </p>
              <ul style={{ color: 'var(--text-secondary)', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem' }}>
                <li>Automatic content discovery via RSS</li>
                <li>LLM-powered quality and relevance evaluations</li>
                <li>Smart self-pausing when daily budget is exhausted</li>
              </ul>
            </div>

          </section>

          {/* Interactive Payment Demo Placeholder */}
          <section className="glass-card" style={{ textAlign: 'center', padding: '3.5rem 2rem', marginTop: '2rem' }}>
            <h2 style={{ marginBottom: '1rem', fontSize: '2.5rem' }}>Settle Gaslessly on Arc L1</h2>
            <p style={{ maxWidth: '700px', margin: '0 auto 3rem auto', fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              All nanopayments are batched via Circle Programmable Wallets and settled on the stablecoin-native Arc Testnet with sub-second finality. No ETH required for gas—everything is priced and settled in USDC.
            </p>
            <div className="payment-flow-viz" style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="flow-node active" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <div className="flow-node-icon" style={{ fontSize: '2.5rem', background: 'var(--bg-active)', padding: '1.5rem', borderRadius: '50%' }}>🤖</div>
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Reader Agent</span>
              </div>
              <div className="flow-line" style={{ flex: 1, height: '4px', background: 'var(--border)', margin: '0 1rem', position: 'relative' }}>
                <div className="flow-line-active" style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '100%', background: 'var(--primary)', opacity: 0.5 }}></div>
              </div>
              <div className="flow-node active" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <div className="flow-node-icon" style={{ fontSize: '2.5rem', background: 'var(--bg-active)', padding: '1.5rem', borderRadius: '50%' }}>💳</div>
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Circle Paymaster</span>
              </div>
              <div className="flow-line" style={{ flex: 1, height: '4px', background: 'var(--border)', margin: '0 1rem', position: 'relative' }}>
                <div className="flow-line-active" style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '100%', background: 'var(--accent)', opacity: 0.5 }}></div>
              </div>
              <div className="flow-node active" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <div className="flow-node-icon" style={{ fontSize: '2.5rem', background: 'var(--bg-active)', padding: '1.5rem', borderRadius: '50%' }}>✍️</div>
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Creator Wallet</span>
              </div>
            </div>
          </section>

        </div>
      </main>
    </>
  );
}
