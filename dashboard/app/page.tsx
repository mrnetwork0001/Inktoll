'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '../components/Header';
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion';

function InteractiveGlassCard({ children, className, style, hoverScale = 1.02 }: any) {
  let mouseX = useMotionValue(0);
  let mouseY = useMotionValue(0);
  const [isHovered, setIsHovered] = useState(false);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    let { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <motion.div
      className={`glass-card ${className || ''}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -5, scale: hoverScale, boxShadow: "0 25px 45px -10px var(--primary-glow)" }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      style={{ ...style, position: 'relative', overflow: 'hidden' }}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px"
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        style={{
          background: useMotionTemplate`
            radial-gradient(
              400px circle at ${mouseX}px ${mouseY}px,
              var(--primary-glow),
              transparent 80%
            )
          `,
          zIndex: 0,
          borderRadius: 'inherit'
        }}
      />
      <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', gap: style?.gap }}>
        {children}
      </div>
    </motion.div>
  );
}

export default function LandingPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Live simulation variables for the isometric card
  const [mockPayments, setMockPayments] = useState([
    { id: 1, type: 'read', amount: '$0.0050', label: 'ResearchBot_99 purchased: "AI Settlement Paradigm"', time: 'Just now' },
    { id: 2, type: 'toll', amount: '$0.0001', label: 'Citation Toll: "OpenWeb Research" referenced Section 4', time: '1m ago' },
    { id: 3, type: 'read', amount: '$0.0080', label: 'AgenticAlpha read: "The Future of Content Networks"', time: '3m ago' },
  ]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_URL}/api/stats/leaderboard`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setStats(data.stats);
          }
        }
      } catch (err) {
        console.error('Failed to load landing stats:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
    const interval = setInterval(fetchStats, 5000);

    // Dynamic rotation of mock payments in the isometric log card to make it look alive
    const paymentInterval = setInterval(() => {
      setMockPayments((prev) => {
        const next = [...prev];
        const last = next.pop()!;
        const updated = {
          ...last,
          id: Date.now(),
          time: 'Just now',
          amount: Math.random() > 0.5 ? '$0.0050' : '$0.0001',
          label: Math.random() > 0.5 
            ? `Agent_${Math.floor(Math.random() * 100)} read: "USDC Monetization Tiers"`
            : `Citation Toll: "MetaReader" cited Reference #${Math.floor(Math.random() * 10)}`
        };
        // Update older timers
        next.forEach(p => {
          if (p.time === 'Just now') p.time = '1m ago';
          else if (p.time === '1m ago') p.time = '4m ago';
        });
        return [updated, ...next];
      });
    }, 4500);

    return () => {
      clearInterval(interval);
      clearInterval(paymentInterval);
    };
  }, []);

  return (
    <>
      <Header />
      <main style={{ padding: '3rem 0', position: 'relative', overflow: 'hidden' }}>
        
        {/* Full-bleed 3D Glass Background Element (Nexora Aesthetic) */}
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '60vw',
          height: '120vh',
          backgroundImage: 'url(/hero-3d.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'left center',
          backgroundRepeat: 'no-repeat',
          zIndex: -1,
          maskImage: 'linear-gradient(to right, transparent, black 30%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 30%)'
        }}></div>

        <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '8rem', paddingBottom: '4rem' }}>
          
          {/* 1. HERO SECTION */}
          <section style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
            gap: '5rem', 
            alignItems: 'center',
            paddingTop: '3rem'
          }}>
            {/* Left Column: Headline and Call-to-Action */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', textAlign: 'left' }}>
              <div>

                
                <h1 style={{ 
                  fontSize: 'clamp(3rem, 7vw, 5.5rem)', 
                  lineHeight: '1.05', 
                  fontWeight: 800, 
                  letterSpacing: '-0.04em',
                  margin: 0
                }}>
                  Monetize Content in the <br />
                  <span style={{ 
                    background: 'var(--primary)', 
                    WebkitBackgroundClip: 'text', 
                    WebkitTextFillColor: 'transparent',
                    fontWeight: 800
                  }}>
                    Agentic Economy
                  </span>
                </h1>
              </div>

              <p style={{ 
                fontSize: '1.15rem', 
                color: 'var(--text-secondary)', 
                lineHeight: '1.7', 
                maxWidth: '580px',
                margin: 0
              }}>
                Inktoll solves the AI copyright crisis through a two-layer monetization protocol settled on Circle Arc L1. We enable autonomous AI agents to read, evaluate, and cite high-quality content—while instantly paying creators in USDC gaslessly.
              </p>

              {/* Progress/Pill Flow */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '0.5rem 1rem', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: 'var(--shadow-soft)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                  Blog Import
                </div>
                <span style={{ color: 'var(--text-muted)' }}>➔</span>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '0.5rem 1rem', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: 'var(--shadow-soft)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4M8 16h.01M16 16h.01" /></svg>
                  AI Agent Scan
                </div>
                <span style={{ color: 'var(--text-muted)' }}>➔</span>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '0.5rem 1rem', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: 'var(--shadow-soft)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="6" x2="12" y2="18" /><path d="M17 9H12.5a3 3 0 1 0 0 6H17" /></svg>
                  Instant USDC
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                <Link href="/creator/dashboard" className="btn btn-primary" style={{ padding: '0.9rem 2.5rem', fontSize: '1rem', textDecoration: 'none' }}>
                  Launch App
                </Link>
                <Link href="#features" className="btn btn-secondary" style={{ padding: '0.9rem 2rem', fontSize: '1rem', textDecoration: 'none' }}>
                  Learn More
                </Link>
              </div>
            </div>

            {/* Right Column: Isometric 3D Payout Logs Card */}
            <div style={{
              perspective: '2000px',
              display: 'flex',
              justifyContent: 'center',
              position: 'relative'
            }}>
              {/* Blur background orb */}
              <div style={{ position: 'absolute', width: '80%', height: '80%', top: '10%', left: '10%', background: 'radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)', filter: 'blur(40px)', zIndex: 0 }}></div>
              
              {/* 3D Rotated Card */}
              <div 
                className="glass-card" 
                style={{
                  width: '100%',
                  maxWidth: '440px',
                  background: 'var(--bg-card)',
                  transform: 'rotateX(8deg) rotateY(-14deg) rotateZ(3deg)',
                  transformStyle: 'preserve-3d',
                  transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  boxShadow: 'var(--shadow-hover)',
                  padding: '2rem',
                  borderRadius: '24px',
                  border: '1px solid var(--border)',
                  zIndex: 1
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'rotateX(4deg) rotateY(-6deg) rotateZ(1deg) translateY(-8px)';
                  e.currentTarget.style.boxShadow = '0 25px 45px -10px var(--primary-glow)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'rotateX(8deg) rotateY(-14deg) rotateZ(3deg)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-hover)';
                }}
              >
                {/* Simulated Ledger Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>Live Payout Network</h4>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Circle Gateway Aggregation</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--primary)', background: 'var(--primary-glow)', padding: '4px 10px', borderRadius: '50px', fontWeight: 700 }}>
                    ACTIVE
                  </span>
                </div>

                {/* Simulated Transactions List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {mockPayments.map((p) => (
                    <div 
                      key={p.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        padding: '0.75rem', 
                        background: 'var(--bg-primary)', 
                        border: '1px solid var(--border)', 
                        borderRadius: '12px',
                        animation: 'fadeIn 0.5s ease-out'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', maxWidth: '75%' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.label}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{p.time}</span>
                      </div>
                      <span style={{ 
                        fontSize: '0.8rem', 
                        fontWeight: 700, 
                        color: p.type === 'read' ? 'var(--primary)' : 'var(--primary)',
                        fontFamily: 'var(--font-mono)' 
                      }}>
                        {p.amount}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Micro educational summary */}
                <div style={{ marginTop: '1.5rem', padding: '0.75rem', background: 'var(--bg-active)', borderRadius: '10px', fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  <strong>How it works:</strong> Nanopayments are settled off-chain immediately and batched onto Arc L1 to maintain zero gas requirements.
                </div>
              </div>
            </div>
          </section>

          {/* 2. ECOSYSTEM STATS GRID */}
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1.25rem', marginTop: '-2rem' }}>
            <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Global USDC Volume</span>
              <h3 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', margin: '0.5rem 0 0 0', color: 'var(--primary)', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
                {loading ? '...' : `$${(stats?.totalVolumeUsdc || 0).toFixed(4)}`}
              </h3>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Micro-settlements routed</span>
            </div>
            <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Articles Indexed</span>
              <h3 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', margin: '0.5rem 0 0 0', color: 'var(--primary)', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
                {loading ? '...' : (stats?.totalArticles || 0)}
              </h3>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Feeds parsed by agent loop</span>
            </div>
            <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Active Reader Agents</span>
              <h3 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', margin: '0.5rem 0 0 0', color: 'var(--primary)', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
                {loading ? '...' : (stats?.activeAgents || 0)}
              </h3>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Self-governed crawlers active</span>
            </div>
            <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Settlement Layer</span>
              <h3 style={{ fontSize: 'clamp(1.25rem, 3.5vw, 1.75rem)', margin: '0.75rem 0 0 0', color: 'var(--text-primary)', fontWeight: 800 }}>
                Arc Testnet
              </h3>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Gas-abstracted stablecoin L1</span>
            </div>
          </section>

          {/* 3. THE PROBLEM SECTION */}
          <motion.section 
            id="features" 
            className="glass-card" 
            initial={{ opacity: 0, y: 30 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true, margin: "-100px" }} 
            transition={{ duration: 0.6 }}
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              textAlign: 'center', 
              padding: '4rem 2rem', 
              gap: '1.5rem', 
              border: '1px solid var(--bg-active)', 
              background: 'var(--primary), transparent)',
              borderRadius: '24px'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-active)', padding: '1rem', borderRadius: '50%', color: 'var(--bg-active)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="22" /><line x1="5" y1="7" x2="19" y2="7" /><path d="M5 9c0 3 1.5 5 5 5s5-2 5-5M19 9c0 3-1.5 5-5 5s-5-2-5-5" /></svg>
            </span>
            <h2 style={{ fontSize: '2.25rem', margin: 0 }}>The Publisher vs. AI Crisis</h2>
            <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', maxWidth: '800px', lineHeight: '1.7', margin: 0 }}>
              Large Language Models scrape content continuously for free. In response, publishers block bot access or implement strict paywalls, breaking web indexing. <strong>Inktoll builds an cooperative economy:</strong> AI reader agents get complete access to read, while creators receive instant, gasless royalties.
            </p>
          </motion.section>

          {/* 4. LAYER 1: PAY-PER-READ */}
          <motion.section 
            initial={{ opacity: 0, y: 30 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true, margin: "-100px" }} 
            transition={{ duration: 0.6 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '5rem', alignItems: 'center' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ background: 'var(--primary-glow)', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px', color: 'var(--primary)', boxShadow: 'var(--shadow-soft)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
              </div>
              <h2 style={{ fontSize: '2.25rem', margin: 0 }}>Layer 1: Pay-Per-Read</h2>
              <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: '1.7', margin: 0 }}>
                Connect your Ghost or Substack feed and set custom per-article prices (e.g., $0.005 USDC). When an autonomous crawler reads your post, the protocol initiates a secure, gasless EIP-3009 transfer.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>✓</span> Settle micro-transactions as small as $0.001
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>✓</span> Gasless payouts settled dynamically on-chain
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>✓</span> No user subscription boundaries
                </div>
              </div>
            </div>
            <InteractiveGlassCard style={{ padding: '3rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'center', borderRadius: '24px' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>Ledger Event</span>
              <div style={{ fontSize: '2.75rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>+ $0.005 USDC</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                Agent <strong>"FinanceEvaluator"</strong> unlocked access to article: <br />
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>"The Future of AI Settlement Nodes"</span>
              </p>
            </InteractiveGlassCard>
          </motion.section>

          {/* 5. LAYER 2: CITATION TOLLS */}
          <motion.section 
            initial={{ opacity: 0, y: 30 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true, margin: "-100px" }} 
            transition={{ duration: 0.6 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '5rem', alignItems: 'center' }}
          >
            <InteractiveGlassCard style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', borderRadius: '24px', border: '1px solid var(--primary-glow)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Semantic Output</div>
              <p style={{ fontStyle: 'italic', color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
                "As analyzed in recent decentralization literature, content monetization models must shift from monthly aggregates to sub-cent queries..."
              </p>
              <hr style={{ border: 'none', borderBottom: '1px solid var(--border)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Citation Toll Routed:</span>
                <span style={{ color: 'var(--primary)', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>+ $0.0001 USDC</span>
              </div>
            </InteractiveGlassCard>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ background: 'var(--primary-glow)', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px', color: 'var(--primary)', boxShadow: 'var(--shadow-soft)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
              </div>
              <h2 style={{ fontSize: '2.25rem', margin: 0 }}>Layer 2: Citation Tolls</h2>
              <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: '1.7', margin: 0 }}>
                The content economy doesn't stop at reading. When an AI agent leverages your content to generate output, the protocol detects the citation, logs the query event, and automatically routes a <strong>Citation Toll royalty ($0.0001 USDC)</strong> back to your wallet.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>✓</span> Earn perpetual royalties on LLM references
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>✓</span> Automated, immutable citation audit trail
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>✓</span> Incentivizes detailed quantitative research
                </div>
              </div>
            </div>
          </motion.section>

          {/* 6. FOR READERS: AUTONOMOUS BUDGETS */}
          <motion.section 
            initial={{ opacity: 0, y: 30 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true, margin: "-100px" }} 
            transition={{ duration: 0.6 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '5rem', alignItems: 'center' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ background: 'var(--primary-glow)', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px', color: 'var(--primary)', boxShadow: 'var(--shadow-soft)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4M8 16h.01M16 16h.01" /></svg>
              </div>
              <h2 style={{ fontSize: '2.25rem', margin: 0 }}>Autonomous Budgets</h2>
              <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: '1.7', margin: 0 }}>
                Spawn agents with custom reading interests, price thresholds, and daily budgets. The agent discovery loop operates independently, purchasing only relevant insights while enforcing your financial rules.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>✓</span> Automatic RSS feed discovery and parser
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>✓</span> Evaluation scoring thresholds set by the user
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>✓</span> Self-pauses when daily budget is exhausted
                </div>
              </div>
            </div>
            
            <InteractiveGlassCard style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', borderRadius: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Daily Spending Cap</span>
                <span style={{ fontWeight: 800, fontSize: '1.25rem', fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>$1.00 USDC</span>
              </div>
              <div style={{ height: '10px', background: 'var(--bg-primary)', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                <motion.div 
                  initial={{ width: 0 }} 
                  whileInView={{ width: '45%' }} 
                  transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                  style={{ height: '100%', background: 'var(--primary)' }}
                ></motion.div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <span>$0.45 Spent (90 Articles)</span>
                <span>$0.55 Remaining</span>
              </div>
            </InteractiveGlassCard>
          </motion.section>

          {/* 7. INTERACTIVE PAYMENT FLOW */}
          <section className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem', borderRadius: '24px' }}>
            <h2 style={{ fontSize: '2.25rem', marginBottom: '1rem' }}>Gasless Architecture on Arc</h2>
            <p style={{ maxWidth: '780px', margin: '0 auto 3.5rem auto', fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              Nanopayments are facilitated via Circle Programmable API Wallets and settled on the stablecoin-native Arc Testnet. No ETH required—transactions are fully dollar-denominated.
            </p>
            <div className="payment-flow-viz" style={{ maxWidth: '800px', margin: '0 auto', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '16px' }}>
              <div className="flow-node active" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '130px' }}>
                <div className="flow-node-icon" style={{ width: '70px', height: '70px' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#fff' }}><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4M8 16h.01M16 16h.01" /></svg>
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Reader Agent</span>
              </div>
              <div className="flow-line" style={{ flex: 1 }}>
                <div className="flow-line-active"></div>
              </div>
              <div className="flow-node active" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '130px' }}>
                <div className="flow-node-icon" style={{ width: '70px', height: '70px' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#fff' }}><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Circle Paymaster</span>
              </div>
              <div className="flow-line" style={{ flex: 1 }}>
                <div className="flow-line-active"></div>
              </div>
              <div className="flow-node active" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '130px' }}>
                <div className="flow-node-icon" style={{ width: '70px', height: '70px' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#fff' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Creator Wallet</span>
              </div>
            </div>
          </section>

          {/* 8. FAQ SECTION */}
          <section style={{ maxWidth: '800px', margin: '2rem auto 0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
            <h2 style={{ textAlign: 'center', fontSize: '2.25rem', marginBottom: '2.5rem' }}>Frequently Asked Questions</h2>
            
            <details name="faq" className="glass-card faq-item" style={{ padding: '1.5rem', borderRadius: '16px', background: 'var(--bg-card)' }}>
              <summary className="faq-summary">
                <span>What exactly is Inktoll?</span>
                <span className="faq-icon">+</span>
              </summary>
              <div className="faq-content">
                Inktoll is a decentralized settlement protocol that allows AI agents and human users to pay creators instantly in USDC when reading or citing their content. We solve the AI copyright crisis by creating a direct, frictionless payment layer.
              </div>
            </details>

            <details name="faq" className="glass-card faq-item" style={{ padding: '1.5rem', borderRadius: '16px', background: 'var(--bg-card)' }}>
              <summary className="faq-summary">
                <span>How do "gasless" nanopayments work?</span>
                <span className="faq-icon">+</span>
              </summary>
              <div className="faq-content">
                By leveraging Circle Programmable Wallets and EIP-3009 off-chain signatures, payments as small as $0.001 USDC can be batched and settled on the stablecoin-native Arc Testnet. This means you don't need to hold or pay any network gas fees (like ETH) to interact with the protocol!
              </div>
            </details>

            <details name="faq" className="glass-card faq-item" style={{ padding: '1.5rem', borderRadius: '16px', background: 'var(--bg-card)' }}>
              <summary className="faq-summary">
                <span>What is a Citation Toll?</span>
                <span className="faq-icon">+</span>
              </summary>
              <div className="faq-content">
                The knowledge economy doesn't stop at reading. When an AI agent uses your previously purchased content to generate an answer for a user, Inktoll's semantic tracking detects the citation and automatically routes a micro-royalty (e.g. $0.0001) back to your wallet.
              </div>
            </details>

            <details name="faq" className="glass-card faq-item" style={{ padding: '1.5rem', borderRadius: '16px', background: 'var(--bg-card)' }}>
              <summary className="faq-summary">
                <span>Do I need to be a crypto expert to use this?</span>
                <span className="faq-icon">+</span>
              </summary>
              <div className="faq-content">
                Not at all! We use Circle's WebAuthn Passkeys so you can create a secure onchain wallet using just FaceID or your fingerprint—no seed phrases, extensions, or crypto knowledge required.
              </div>
            </details>

            <details name="faq" className="glass-card faq-item" style={{ padding: '1.5rem', borderRadius: '16px', background: 'var(--bg-card)' }}>
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
