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

function PaymentFlowAnimation() {
  return (
    <div className="payment-flow-viz" style={{ maxWidth: '800px', margin: '0 auto', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '16px', position: 'relative', overflow: 'hidden' }}>
      
      {/* 1. Animated traveling data pulse */}
      <motion.div
        animate={{ 
          left: ["15%", "50%", "85%"], // Animate left property relative to container
          opacity: [0, 1, 1, 0]
        }}
        transition={{
          duration: 3,
          ease: "linear",
          repeat: Infinity,
        }}
        style={{
          position: 'absolute',
          top: '35px', // Exact center of the 70px icon (ignoring padding for a moment, wait, padding is 2rem = 32px. So 35px + 32px = 67px)
          marginTop: '2rem', // Offset by container padding
          transform: 'translateY(-50%)',
          width: '16px',
          height: '16px',
          background: 'var(--primary)',
          borderRadius: '50%',
          boxShadow: '0 0 20px 8px var(--primary-glow)',
          zIndex: 10
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', padding: '2rem' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '130px', position: 'relative', zIndex: 5 }}>
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }} 
            transition={{ duration: 3, repeat: Infinity, times: [0, 0.1, 1] }}
            className="flow-node-icon" style={{ width: '70px', height: '70px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#fff' }}><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4M8 16h.01M16 16h.01" /></svg>
          </motion.div>
          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Reader Agent</span>
        </div>

        <div style={{ flex: 1, height: '4px', background: 'var(--bg-active)', borderRadius: '2px', position: 'relative', marginTop: '33px' }}>
           <motion.div 
             animate={{ width: ["0%", "100%", "100%"] }} 
             transition={{ duration: 3, repeat: Infinity, times: [0, 0.33, 1] }}
             style={{ height: '100%', background: 'var(--primary)', borderRadius: '2px' }} 
           />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '130px', position: 'relative', zIndex: 5 }}>
          <motion.div 
            animate={{ scale: [1, 1, 1.1, 1] }} 
            transition={{ duration: 3, repeat: Infinity, times: [0, 0.33, 0.43, 1] }}
            className="flow-node-icon" style={{ width: '70px', height: '70px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#fff' }}><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
          </motion.div>
          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Circle Paymaster</span>
        </div>

        <div style={{ flex: 1, height: '4px', background: 'var(--bg-active)', borderRadius: '2px', position: 'relative', marginTop: '33px' }}>
           <motion.div 
             animate={{ width: ["0%", "0%", "100%"] }} 
             transition={{ duration: 3, repeat: Infinity, times: [0, 0.33, 0.66] }}
             style={{ height: '100%', background: 'var(--primary)', borderRadius: '2px' }} 
           />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '130px', position: 'relative', zIndex: 5 }}>
          <motion.div 
            animate={{ scale: [1, 1, 1.1, 1] }} 
            transition={{ duration: 3, repeat: Infinity, times: [0, 0.66, 0.76, 1] }}
            className="flow-node-icon" style={{ width: '70px', height: '70px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#fff' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
          </motion.div>
          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Creator Wallet</span>
        </div>

      </div>
    </div>
  );
}

function TypewriterText({ words }: { words: string[] }) {
  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const word = words[currentWordIdx];
    
    if (!isDeleting && currentText === word) {
      const timeout = setTimeout(() => setIsDeleting(true), 2000);
      return () => clearTimeout(timeout);
    }
    
    if (isDeleting && currentText === '') {
      setIsDeleting(false);
      setCurrentWordIdx((prev) => (prev + 1) % words.length);
      return;
    }
    
    const typingSpeed = isDeleting ? 50 : 120;
    const timeout = setTimeout(() => {
      setCurrentText(word.substring(0, currentText.length + (isDeleting ? -1 : 1)));
    }, typingSpeed);
    
    return () => clearTimeout(timeout);
  }, [currentText, isDeleting, currentWordIdx, words]);

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', minWidth: '220px' }}>
      <span style={{ 
        background: 'var(--primary)', 
        WebkitBackgroundClip: 'text', 
        WebkitTextFillColor: 'transparent',
      }}>
        {currentText}
      </span>
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        style={{ 
          display: 'inline-block',
          width: '5px',
          height: '0.9em',
          backgroundColor: 'var(--primary)',
          marginLeft: '8px',
          borderRadius: '2px'
        }}
      />
    </span>
  );
}

function HeroPillFlow() {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIdx(prev => (prev + 1) % 4);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  const pills = [
    {
      label: 'Blog Import',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'inherit' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
    },
    {
      label: 'AI Agent Scan',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'inherit' }}><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4M8 16h.01M16 16h.01" /></svg>
    },
    {
      label: 'Instant USDC',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'inherit' }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="6" x2="12" y2="18" /><path d="M17 9H12.5a3 3 0 1 0 0 6H17" /></svg>
    }
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
      {pills.map((pill, idx) => {
        const isActive = activeIdx === idx;
        const isPassed = activeIdx > idx && activeIdx !== 3;
        
        return (
          <React.Fragment key={pill.label}>
            <motion.div 
              animate={{
                borderColor: isActive ? 'var(--primary)' : 'var(--border)',
                boxShadow: isActive ? '0 0 15px rgba(255, 128, 34, 0.4)' : 'var(--shadow-soft)',
                color: isActive ? 'var(--primary)' : (isPassed ? 'var(--text-primary)' : 'var(--text-secondary)'),
                scale: isActive ? 1.05 : 1,
                y: isActive ? -2 : 0
              }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{ 
                background: 'var(--bg-card)', 
                border: '1px solid var(--border)', 
                padding: '0.5rem 1rem', 
                borderRadius: '50px', 
                fontSize: '0.8rem', 
                fontWeight: 600, 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.4rem', 
                boxShadow: 'var(--shadow-soft)' 
              }}
            >
              {pill.icon}
              {pill.label}
            </motion.div>
            
            {idx < pills.length - 1 && (
              <motion.span 
                animate={{
                  color: (isActive || activeIdx === idx + 1) ? 'var(--primary)' : 'var(--text-muted)',
                  x: isActive ? 3 : 0
                }}
                transition={{ duration: 0.3 }}
                style={{ color: 'var(--text-muted)' }}
              >
                ➔
              </motion.span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 }
  }
};

const staggerItem = {
  hidden: { opacity: 0, x: -15 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4 } }
};

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
                  Get Paid When AI <br />
                  <TypewriterText words={['Reads', 'Analyzes', 'Cites', 'Scrapes']} /> <br />
                  Your Work
                </h1>
              </div>

              <p style={{ 
                fontSize: '1.15rem', 
                color: 'var(--text-secondary)', 
                lineHeight: '1.7', 
                maxWidth: '580px',
                margin: 0
              }}>
                Inktoll solves the AI copyright crisis. We allow autonomous agents to read and cite your content, paying you instant, gasless USDC royalties on Arc L1.
              </p>

              <HeroPillFlow />

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
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Creators</span>
              <h3 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', margin: '0.5rem 0 0 0', color: 'var(--primary)', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
                {loading ? '...' : (stats?.totalCreators || 0)}
              </h3>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Publishers earning USDC</span>
            </div>
            <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Protocol Revenue</span>
              <h3 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', margin: '0.5rem 0 0 0', color: 'var(--primary)', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
                {loading ? '...' : `$${(stats?.protocolRevenue || 0).toFixed(4)}`}
              </h3>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>1% Withdrawal Fee</span>
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
              <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                <motion.div variants={staggerItem} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>✓</span> Settle micro-transactions as small as $0.001
                </motion.div>
                <motion.div variants={staggerItem} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>✓</span> Gasless payouts settled dynamically on-chain
                </motion.div>
                <motion.div variants={staggerItem} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>✓</span> No user subscription boundaries
                </motion.div>
              </motion.div>
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
              <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                <motion.div variants={staggerItem} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>✓</span> Earn perpetual royalties on LLM references
                </motion.div>
                <motion.div variants={staggerItem} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>✓</span> Automated, immutable citation audit trail
                </motion.div>
                <motion.div variants={staggerItem} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>✓</span> Incentivizes detailed quantitative research
                </motion.div>
              </motion.div>
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
              <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                <motion.div variants={staggerItem} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>✓</span> Automatic RSS feed discovery and parser
                </motion.div>
                <motion.div variants={staggerItem} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>✓</span> Evaluation scoring thresholds set by the user
                </motion.div>
                <motion.div variants={staggerItem} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>✓</span> Self-pauses when daily budget is exhausted
                </motion.div>
              </motion.div>
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
                  transition={{ duration: 1.5, delay: 0.3 }}
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
            <PaymentFlowAnimation />
          </section>

          {/* 8. FAQ SECTION */}
          <section style={{ maxWidth: '800px', margin: '2rem auto 0 auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
            <h2 style={{ textAlign: 'center', fontSize: '2.25rem', marginBottom: '2.5rem' }}>Frequently Asked Questions</h2>
            
            <details name="faq" className="glass-card faq-item" style={{ padding: '0.85rem 1.25rem', borderRadius: '16px', background: 'var(--bg-card)' }}>
              <summary className="faq-summary">
                <span>What exactly is Inktoll?</span>
                <span className="faq-icon">+</span>
              </summary>
              <div className="faq-content">
                Inktoll is a decentralized settlement protocol that allows AI agents and human users to pay creators instantly in USDC when reading or citing their content. We solve the AI copyright crisis by creating a direct, frictionless payment layer.
              </div>
            </details>

            <details name="faq" className="glass-card faq-item" style={{ padding: '0.85rem 1.25rem', borderRadius: '16px', background: 'var(--bg-card)' }}>
              <summary className="faq-summary">
                <span>How do "gasless" nanopayments work?</span>
                <span className="faq-icon">+</span>
              </summary>
              <div className="faq-content">
                By leveraging Circle Programmable Wallets and EIP-3009 off-chain signatures, payments as small as $0.001 USDC can be batched and settled on the stablecoin-native Arc Testnet. This means you don't need to hold or pay any network gas fees (like ETH) to interact with the protocol!
              </div>
            </details>

            <details name="faq" className="glass-card faq-item" style={{ padding: '0.85rem 1.25rem', borderRadius: '16px', background: 'var(--bg-card)' }}>
              <summary className="faq-summary">
                <span>What is a Citation Toll?</span>
                <span className="faq-icon">+</span>
              </summary>
              <div className="faq-content">
                The knowledge economy doesn't stop at reading. When an AI agent uses your previously purchased content to generate an answer for a user, Inktoll's semantic tracking detects the citation and automatically routes a micro-royalty (e.g. $0.0001 USDC) back to your wallet.
              </div>
            </details>

            <details name="faq" className="glass-card faq-item" style={{ padding: '0.85rem 1.25rem', borderRadius: '16px', background: 'var(--bg-card)' }}>
              <summary className="faq-summary">
                <span>Do I need to be a crypto expert to use this?</span>
                <span className="faq-icon">+</span>
              </summary>
              <div className="faq-content">
                Not at all! We use Circle's WebAuthn Passkeys so you can create a secure onchain wallet using just FaceID or your fingerprint—no seed phrases, extensions, or crypto knowledge required.
              </div>
            </details>

            <details name="faq" className="glass-card faq-item" style={{ padding: '0.85rem 1.25rem', borderRadius: '16px', background: 'var(--bg-card)' }}>
              <summary className="faq-summary">
                <span>How do agents avoid spending all my money?</span>
                <span className="faq-icon">+</span>
              </summary>
              <div className="faq-content">
                Users can set strict daily USDC spending caps and maximum per-article prices for their agents. Once your agent hits its budget, it pauses automatically until the next day, ensuring complete financial safety while curating your feed.
              </div>
            </details>

            <details name="faq" className="glass-card faq-item" style={{ padding: '0.85rem 1.25rem', borderRadius: '16px', background: 'var(--bg-card)' }}>
              <summary className="faq-summary">
                <span>How does Ghost onboarding work?</span>
                <span className="faq-icon">+</span>
              </summary>
              <div className="faq-content">
                Creators can connect their Ghost blogs in seconds by copying their Content API Key from their Ghost Settings. Inktoll handles importing, indexing, and wrapping the articles in paywalls automatically.
              </div>
            </details>

            <details name="faq" className="glass-card faq-item" style={{ padding: '0.85rem 1.25rem', borderRadius: '16px', background: 'var(--bg-card)' }}>
              <summary className="faq-summary">
                <span>What is the Arc Testnet?</span>
                <span className="faq-icon">+</span>
              </summary>
              <div className="faq-content">
                Arc is an EVM-compatible L1 blockchain optimized for sub-second, low-cost stablecoin transactions. It uses USDC as its native gas token, eliminating the volatile gas fees found on main chains.
              </div>
            </details>

            <details name="faq" className="glass-card faq-item" style={{ padding: '0.85rem 1.25rem', borderRadius: '16px', background: 'var(--bg-card)' }}>
              <summary className="faq-summary">
                <span>Why are some platform integrations listed as "Coming Soon"?</span>
                <span className="faq-icon">+</span>
              </summary>
              <div className="faq-content">
                Ghost is our fully operational launch integration. We are actively developing secure handshakes for X (Twitter), WordPress, and Substack to expand the Inktoll creator ecosystem.
              </div>
            </details>

            <details name="faq" className="glass-card faq-item" style={{ padding: '0.85rem 1.25rem', borderRadius: '16px', background: 'var(--bg-card)' }}>
              <summary className="faq-summary">
                <span>How secure are my Ghost API keys?</span>
                <span className="faq-icon">+</span>
              </summary>
              <div className="faq-content">
                Your Ghost Content API Key is securely encrypted. We only request Read-Only access to index public articles; the protocol cannot edit, modify, or delete your content.
              </div>
            </details>

            <details name="faq" className="glass-card faq-item" style={{ padding: '0.85rem 1.25rem', borderRadius: '16px', background: 'var(--bg-card)' }}>
              <summary className="faq-summary">
                <span>Where does the name "Inktoll" come from?</span>
                <span className="faq-icon">+</span>
              </summary>
              <div className="faq-content">
                "Ink" represents the creative writing and content produced by authors. "Toll" represents the autonomous settlement gate that AI agents must pass through, paying authors for their intelligence.
              </div>
            </details>
          </section>

        </div>
      </main>
    </>
  );
}
