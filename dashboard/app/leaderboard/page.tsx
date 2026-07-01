'use client';

import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { useNotification } from '../../components/NotificationProvider';
import { Eye, EyeOff, Trophy, ReceiptText, BookOpen, BadgeCheck, Copy } from 'lucide-react';

interface LeaderboardStats {
  totalVolumeUsdc: number;
  totalArticles: number;
  activeAgents: number;
}

interface CreatorRow {
  id: string;
  ghost_url: string;
  wallet_address: string;
  articles_count: number;
  reads_count: number;
  citations_count: number;
  total_earnings: number;
}

interface ActivityRow {
  id: string;
  amount_usdc: number;
  payment_type: 'read' | 'citation';
  created_at: string;
  tx_hash: string;
  article_title: string;
  ghost_url: string;
  reader_agent_id: string;
}

export default function Leaderboard() {
  const { showToast } = useNotification();
  const [stats, setStats] = useState<LeaderboardStats | null>(null);
  const [creators, setCreators] = useState<CreatorRow[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBalances, setShowBalances] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Extract clean domain name from Ghost URL
  const getDomainName = (urlStr: string) => {
    try {
      const url = new URL(urlStr);
      let name = url.hostname;
      if (name.startsWith('www.')) name = name.substring(4);
      return name;
    } catch {
      return urlStr;
    }
  };

  const fetchLeaderboardData = async () => {
    try {
      const res = await fetch(`${API_URL}/api/stats/leaderboard`);
      if (!res.ok) {
        throw new Error('Failed to load leaderboard data.');
      }
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setCreators(data.creators);
        setActivity(data.activity);
      }
    } catch (err: any) {
      console.error('Error fetching leaderboard:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Sync privacy view state
  useEffect(() => {
    const val = localStorage.getItem('inktoll_show_balances');
    if (val === 'false') {
      setShowBalances(false);
    }
    
    fetchLeaderboardData();

    // Live update stats every 5 seconds to feel dynamic and alive
    const interval = setInterval(fetchLeaderboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Header />
      <main style={{ padding: '3rem 0' }}>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Header Title Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Ecosystem Leaderboard
              </h1>
              <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)' }}>
                Real-time economic metrics and top performing Web3 creators on Inktoll.
              </p>
            </div>
            
            <button
              onClick={() => {
                const nextVal = !showBalances;
                setShowBalances(nextVal);
                localStorage.setItem('inktoll_show_balances', String(nextVal));
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                outline: 'none'
              }}
            >
              {showBalances ? <><EyeOff size={16} /> Hide My View</> : <><Eye size={16} /> Show My View</>}
            </button>
          </div>

          {error && (
            <div style={{ padding: '1rem', background: 'var(--bg-active)', border: '1px solid var(--primary)', borderRadius: '8px', color: 'var(--primary)' }}>
              ⚠️ {error}
            </div>
          )}

          {/* Global KPI Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '3px solid var(--primary)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Global USDC Circulated</span>
              <h3 style={{ fontSize: '2rem', margin: '0.5rem 0 0 0', color: 'var(--primary)' }}>
                {loading ? '...' : (showBalances ? `$${(stats?.totalVolumeUsdc || 0).toFixed(4)}` : '$ ••••••')}
              </h3>
            </div>
            <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '3px solid var(--primary-light)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Articles Indexed</span>
              <h3 style={{ fontSize: '2rem', margin: '0.5rem 0 0 0' }}>
                {loading ? '...' : (stats?.totalArticles || 0)}
              </h3>
            </div>
            <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '3px solid var(--primary)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Active Reader Agents</span>
              <h3 style={{ fontSize: '2rem', margin: '0.5rem 0 0 0', color: 'var(--primary)' }}>
                {loading ? '...' : (stats?.activeAgents || 0)}
              </h3>
            </div>
            <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '3px solid var(--primary)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Settlement Network</span>
              <h3 style={{ fontSize: '1.5rem', margin: '0.55rem 0 0 0', color: 'var(--primary)', fontWeight: 600 }}>
                Arc Testnet
              </h3>
            </div>
          </div>

          {/* Table & Feed Two-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-8 items-start">
            
            {/* Left Column: Top Creators Leaderboard */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Top Performing Creators
              </h2>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Loading rankings...
                </div>
              ) : creators.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No creators found. Connect a Ghost blog to get started!
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem' }}>Rank</th>
                        <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem' }}>Creator Blog</th>
                        <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem' }}>Articles</th>
                        <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem' }}>Reads</th>
                        <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem' }}>Citations</th>
                        <th style={{ textAlign: 'right', padding: '0.75rem 0.5rem' }}>Total Earnings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creators.map((c, index) => {
                        const domain = getDomainName(c.ghost_url);
                        const isTop3 = index < 3;
                        const rankMedals = [<Trophy key={1} size={18} color="#FFD700" style={{ display: 'inline' }} />, <Trophy key={2} size={18} color="#C0C0C0" style={{ display: 'inline' }} />, <Trophy key={3} size={18} color="#CD7F32" style={{ display: 'inline' }} />];
                        return (
                          <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>
                              {isTop3 ? rankMedals[index] : `${index + 1}th`}
                            </td>
                            <td style={{ padding: '1rem 0.5rem' }}>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <a 
                                  href={c.ghost_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  style={{ color: 'var(--primary-light)', fontWeight: 600, textDecoration: 'none' }}
                                >
                                  {domain}
                                </a>
                                <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                  {c.wallet_address.substring(0, 8)}...{c.wallet_address.substring(c.wallet_address.length - 6)}
                                </code>
                              </div>
                            </td>
                            <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                              {c.articles_count}
                            </td>
                            <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                              {c.reads_count}
                            </td>
                            <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                              {c.citations_count}
                            </td>
                            <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>
                              {showBalances ? `$${c.total_earnings.toFixed(4)}` : '$ ••••••'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right Column: Live Economy Feed */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="status-dot pulsing" style={{ width: '8px', height: '8px', background: 'var(--primary)' }}></span>
                Live Activity Feed
              </h2>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Loading feed...
                </div>
              ) : activity.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No recent activities recorded yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '480px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                  {activity.map((act) => {
                    const blogDomain = getDomainName(act.ghost_url);
                    const formattedTime = new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    return (
                      <div 
                        key={act.id} 
                        style={{ 
                          padding: '0.75rem', 
                          background: 'rgba(255, 255, 255, 0.02)', 
                          border: '1px solid var(--border)', 
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.25rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>{formattedTime}</span>
                            {act.tx_hash && (
                              <button 
                                onClick={() => setSelectedReceipt(act)}
                                title="Click to view Circle Gateway Receipt"
                                style={{ 
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--primary-light)', 
                                  textDecoration: 'underline', 
                                  fontSize: '0.7rem', 
                                  fontFamily: 'var(--font-mono)',
                                  cursor: 'pointer',
                                  padding: 0,
                                  outline: 'none'
                                }}
                              >
                                (Receipt)
                              </button>
                            )}
                          </div>
                          <span style={{ 
                            fontSize: '0.7rem', 
                            padding: '1px 6px', 
                            borderRadius: '4px', 
                            background: act.payment_type === 'read' ? 'rgba(0,115,195,0.1)' : 'var(--primary-glow)',
                            color: act.payment_type === 'read' ? 'var(--primary-light)' : 'var(--primary)'
                          }}>
                            {act.payment_type === 'read' ? 'Read Fee' : 'Citation Toll'}
                          </span>
                        </div>
                        
                        <div style={{ color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                          Reader Agent <code style={{ fontSize: '0.75rem', background: 'rgba(0,0,0,0.15)', padding: '1px 3px', borderRadius: '3px' }}>
                            {act.reader_agent_id.substring(0, 6)}...{act.reader_agent_id.substring(act.reader_agent_id.length - 4)}
                          </code> paid{' '}
                          <strong style={{ color: 'var(--primary)' }}>
                            {showBalances ? `$${act.amount_usdc.toFixed(4)}` : '$ ••••••'}
                          </strong>{' '}
                          to <strong style={{ color: 'var(--primary-light)' }}>{blogDomain}</strong>
                        </div>
                        
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', borderLeft: '2px solid rgba(255,255,255,0.1)', paddingLeft: '0.5rem', marginTop: '0.15rem' }}>
                          "{act.article_title}"
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>

        {selectedReceipt && (() => {
          const creatorInfo = creators.find(c => c.ghost_url === selectedReceipt.ghost_url);
          const recipientAddress = creatorInfo?.wallet_address || '';
          const blogDomain = getDomainName(selectedReceipt.ghost_url);
          return (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 99999,
              animation: 'fadeIn 0.2s ease-out'
            }}>
              <div className="glass-card" style={{
                width: '90%',
                maxWidth: '520px',
                padding: '2.5rem 2rem 2rem 2rem',
                borderRadius: '20px',
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
                position: 'relative'
              }}>
                <button 
                  onClick={() => setSelectedReceipt(null)}
                  style={{
                    position: 'absolute',
                    top: '1.25rem',
                    right: '1.25rem',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    fontSize: '1.25rem',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  ✕
                </button>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}><ReceiptText size={48} color="var(--text-primary)" /></div>
                  <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    USDC Nanopayment Receipt
                  </h3>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Circle Gateway Settlement Verified
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Payment Type:</span>
                    <span style={{ fontWeight: 600, color: selectedReceipt.payment_type === 'read' ? 'var(--primary-light)' : 'var(--primary)' }}>
                      {selectedReceipt.payment_type === 'read' ? <><BookOpen size={14} style={{ display: 'inline', marginRight: '4px' }} /> Pay-Per-Read Fee</> : <><BadgeCheck size={14} style={{ display: 'inline', marginRight: '4px' }} /> Citation Toll</>}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Amount:</span>
                    <span style={{ fontWeight: 700, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                      {showBalances ? `$${parseFloat(selectedReceipt.amount_usdc).toFixed(4)}` : '$ ••••••'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Date & Time:</span>
                    <span style={{ color: 'var(--text-primary)' }}>
                      {new Date(selectedReceipt.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Payer Agent Address:</span>
                    <code style={{ background: 'var(--bg-active)', color: 'var(--text-primary)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                      {selectedReceipt.reader_agent_id || '0x44978b7f924c0c6bed1E2acCa887338Dc47C4539'}
                    </code>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Recipient Creator ({blogDomain}):</span>
                    <code style={{ background: 'var(--bg-active)', color: 'var(--text-primary)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                      {recipientAddress || '0xcd0a2370f2dc12c1802707b7d9ab3fec891e3c02'}
                    </code>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Circle Transfer ID (UUID):</span>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <code style={{ flex: 1, background: 'var(--bg-active)', padding: '6px 10px', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--primary)', wordBreak: 'break-all', fontFamily: 'var(--font-mono)' }}>
                        {selectedReceipt.tx_hash}
                      </code>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(selectedReceipt.tx_hash);
                          showToast('Transfer ID copied to clipboard!', 'success');
                        }}
                        title="Copy Transfer ID"
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          outline: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Copy size={14} style={{ marginRight: '4px' }} /> Copy
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ 
                  fontSize: '0.75rem', 
                  color: 'var(--text-muted)', 
                  lineHeight: '1.5',
                  background: 'rgba(245, 158, 11, 0.05)',
                  border: '1px solid rgba(245, 158, 11, 0.15)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem'
                }}>
                  💡 <strong>Circle x402 Nanopayment Batching:</strong> To achieve sub-cent transactions with <strong>zero gas fees</strong>, Inktoll batches transfer signatures off-chain. Individual payments are net-settled in batch transactions on-chain.
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <button
                    className="btn"
                    onClick={() => setSelectedReceipt(null)}
                    style={{
                      flex: 1,
                      padding: '0.8rem',
                      borderRadius: '50px',
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      color: 'var(--text-secondary)',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    Close
                  </button>
                  <a
                    href={`https://testnet.arcscan.app/address/${recipientAddress || recipientAddress === '' ? recipientAddress : '0xcd0a2370f2dc12c1802707b7d9ab3fec891e3c02'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex: 1.5,
                      padding: '0.8rem',
                      borderRadius: '50px',
                      background: 'var(--primary)',
                      border: 'none',
                      color: '#fff',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      textDecoration: 'none',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    Verify on ArcScan ↗
                  </a>
                </div>
              </div>
            </div>
          );
        })()}
      </main>
    </>
  );
}
