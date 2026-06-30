'use client';

import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';

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
  const [stats, setStats] = useState<LeaderboardStats | null>(null);
  const [creators, setCreators] = useState<CreatorRow[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBalances, setShowBalances] = useState(true);

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
                🏆 Ecosystem Leaderboard
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
              {showBalances ? '👁️ Hide My View' : '🙈 Show My View'}
            </button>
          </div>

          {error && (
            <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--error)', borderRadius: '8px', color: 'var(--error)' }}>
              ⚠️ {error}
            </div>
          )}

          {/* Global KPI Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '3px solid var(--accent)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Global USDC Circulated</span>
              <h3 style={{ fontSize: '2rem', margin: '0.5rem 0 0 0', color: 'var(--accent)' }}>
                {loading ? '...' : (showBalances ? `$${(stats?.totalVolumeUsdc || 0).toFixed(4)}` : '$ ••••••')}
              </h3>
            </div>
            <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '3px solid var(--primary-light)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Articles Indexed</span>
              <h3 style={{ fontSize: '2rem', margin: '0.5rem 0 0 0' }}>
                {loading ? '...' : (stats?.totalArticles || 0)}
              </h3>
            </div>
            <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '3px solid var(--success)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Active Reader Agents</span>
              <h3 style={{ fontSize: '2rem', margin: '0.5rem 0 0 0', color: 'var(--success)' }}>
                {loading ? '...' : (stats?.activeAgents || 0)}
              </h3>
            </div>
            <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '3px solid #3b82f6' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Settlement Network</span>
              <h3 style={{ fontSize: '1.5rem', margin: '0.55rem 0 0 0', color: '#3b82f6', fontWeight: 600 }}>
                Arc Testnet
              </h3>
            </div>
          </div>

          {/* Table & Feed Two-Column Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '2rem', alignItems: 'start' }}>
            
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
                        const rankMedals = ['🥇', '🥈', '🥉'];
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
                            <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
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
                <span className="status-dot pulsing" style={{ width: '8px', height: '8px', background: 'var(--success)' }}></span>
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
                              <a 
                                href={`https://testnet.arcscan.app/tx/${act.tx_hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: 'var(--primary-light)', textDecoration: 'underline', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}
                              >
                                (Receipt)
                              </a>
                            )}
                          </div>
                          <span style={{ 
                            fontSize: '0.7rem', 
                            padding: '1px 6px', 
                            borderRadius: '4px', 
                            background: act.payment_type === 'read' ? 'rgba(0,115,195,0.1)' : 'rgba(245,166,35,0.1)',
                            color: act.payment_type === 'read' ? 'var(--primary-light)' : 'var(--accent)'
                          }}>
                            {act.payment_type === 'read' ? 'Read Fee' : 'Citation Toll'}
                          </span>
                        </div>
                        
                        <div style={{ color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                          Reader Agent <code style={{ fontSize: '0.75rem', background: 'rgba(0,0,0,0.15)', padding: '1px 3px', borderRadius: '3px' }}>
                            {act.reader_agent_id.substring(0, 6)}...{act.reader_agent_id.substring(act.reader_agent_id.length - 4)}
                          </code> paid{' '}
                          <strong style={{ color: 'var(--accent)' }}>
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
      </main>
    </>
  );
}
