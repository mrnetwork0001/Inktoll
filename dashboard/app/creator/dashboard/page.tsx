'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '../../../components/Header';

// Custom hook to animate number counting
function useAnimatedCount(targetValue: number, duration: number = 800) {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    // Reset animation on new target
    const startValue = countRef.current;
    startTimeRef.current = null;

    if (startValue === targetValue) return;

    let animationFrameId: number;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      
      // Easing out quadratic
      const easedProgress = progress * (2 - progress);
      const currentValue = startValue + (targetValue - startValue) * easedProgress;
      
      countRef.current = currentValue;
      setCount(currentValue);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [targetValue, duration]);

  return count;
}

import { Suspense } from 'react';

function CreatorDashboardInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const creatorId = searchParams.get('creatorId');

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState('');

  // Animate Earnings Counter
  const totalEarnings = stats?.totalEarningsUsdc || 0;
  const animatedEarnings = useAnimatedCount(totalEarnings, 1200);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Fetch stats function
  const fetchStats = async (silent = false) => {
    if (!creatorId) return;
    try {
      const res = await fetch(`${API_URL}/api/payments?creatorId=${creatorId}`);
      if (!res.ok) {
        throw new Error('Failed to load stats');
      }
      const data = await res.json();
      setStats(data);
      setError('');
    } catch (err: any) {
      console.error(err);
      if (!silent) setError('Could not connect to the backend server. Make sure the server is running.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!creatorId) {
      setLoading(false);
      return;
    }

    fetchStats();

    // Live update polling
    const interval = setInterval(() => {
      fetchStats(true);
    }, 3000);

    return () => clearInterval(interval);
  }, [creatorId]);

  const handleWithdraw = async () => {
    if (!stats?.walletAddress || stats.balanceUsdc <= 0) return;
    setWithdrawing(true);
    setWithdrawSuccess('');

    try {
      // Send withdrawal mock/real request to server
      const mockPersonalWallet = '0xWithdrawTarget' + Math.floor(Math.random() * 100000);
      const res = await fetch(`${API_URL}/api/creators`, { method: 'GET' }); // query list to check connectivity
      
      // Update balance mockingly
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setWithdrawSuccess(`Success! Withdrew ${stats.balanceUsdc} USDC to personal wallet.`);
      await fetchStats();
    } catch (err: any) {
      setError('Withdrawal failed: ' + err.message);
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
          <div className="status-dot pulsing"></div> Loading Creator Dashboard...
        </main>
      </>
    );
  }

  if (!creatorId) {
    return (
      <>
        <Header />
        <main className="container" style={{ padding: '4rem 0', textAlign: 'center', maxWidth: '600px' }}>
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
            <h2>⚠️ No Blog Connected</h2>
            <p>You must connect a Ghost blog to access the creator earnings dashboard.</p>
            <button className="btn btn-primary" onClick={() => router.push('/creator/onboard')}>
              Connect My Blog Now
            </button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main style={{ padding: '3rem 0' }}>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {error && (
            <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--error)', borderRadius: '8px', color: 'var(--error)' }}>
              ⚠️ {error}
            </div>
          )}

          {/* Earnings & Wallet Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            
            {/* LARGE EARNINGS COUNTER */}
            <div className="glass-card earnings-box" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span className="earnings-label">USDC Earnings Counter</span>
              <div className="earnings-value">${animatedEarnings.toFixed(6)}</div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Ticking live as AI agents read and cite your blog
              </p>
            </div>

            {/* WALLET WIDGET */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1.5rem' }}>
              <div>
                <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Inktoll Wallet Balance
                </h4>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2.5rem', fontWeight: 700, margin: '0.5rem 0' }}>
                  {stats?.balanceUsdc?.toFixed(6) || '0.000000'} <span style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>USDC</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Address: <code>{stats?.walletAddress}</code>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Blockchain: Arc Testnet (gasless stablecoin native L1)
                </div>
              </div>

              <div>
                {withdrawSuccess && (
                  <div style={{ padding: '0.5rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--success)', borderRadius: '6px', color: 'var(--success)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                    {withdrawSuccess}
                  </div>
                )}
                <button 
                  className="btn btn-secondary" 
                  style={{ width: '100%' }}
                  onClick={handleWithdraw}
                  disabled={withdrawing || !stats?.balanceUsdc || stats.balanceUsdc <= 0}
                >
                  {withdrawing ? 'Withdrawing...' : 'Withdraw USDC via App Kit'}
                </button>
              </div>
            </div>

          </div>

          {/* Core Metrics Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Reads Count</span>
              <h3 style={{ fontSize: '2rem', margin: '0.5rem 0 0 0' }}>{stats?.readCount || 0}</h3>
            </div>
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Read Revenue (USDC)</span>
              <h3 style={{ fontSize: '2rem', margin: '0.5rem 0 0 0', color: 'var(--primary-light)' }}>${stats?.readRevenueUsdc?.toFixed(4) || '0.0000'}</h3>
            </div>
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Citations</span>
              <h3 style={{ fontSize: '2rem', margin: '0.5rem 0 0 0' }}>{stats?.citationCount || 0}</h3>
            </div>
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Citation Toll Revenue</span>
              <h3 style={{ fontSize: '2rem', margin: '0.5rem 0 0 0', color: 'var(--accent)' }}>${stats?.citationRevenueUsdc?.toFixed(4) || '0.0000'}</h3>
            </div>
          </div>

          {/* Article breakdown */}
          <div className="glass-card">
            <h3>Monetized Articles</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Article Title</th>
                    <th>Price (USDC)</th>
                    <th>Reads</th>
                    <th>Citations</th>
                    <th>Total Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.articles && stats.articles.length > 0 ? (
                    stats.articles.map((art: any) => (
                      <tr key={art.id}>
                        <td style={{ fontWeight: 500 }}>{art.title}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>${art.price_usdc}</td>
                        <td>{art.reads}</td>
                        <td>
                          <span style={{ display: 'inline-flex', gap: '0.25rem', alignItems: 'center' }}>
                            {art.citations}
                            {art.citations > 0 && <span style={{ fontSize: '0.75rem', background: 'rgba(245,166,35,0.15)', color: 'var(--accent)', padding: '2px 6px', borderRadius: '10px', fontWeight: 600 }}>Toll Active</span>}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>${art.revenue.toFixed(4)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        No articles imported yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Payments History */}
          <div className="glass-card">
            <h3>Recent Earnings Transaction Log</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Source Article</th>
                    <th>Payment Type</th>
                    <th>Amount (USDC)</th>
                    <th>Arc Tx Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.history && stats.history.length > 0 ? (
                    stats.history.map((tx: any) => (
                      <tr key={tx.id}>
                        <td>{new Date(tx.created_at).toLocaleTimeString()}</td>
                        <td>{tx.article_title}</td>
                        <td>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            padding: '2px 8px', 
                            borderRadius: '12px', 
                            fontWeight: 600,
                            background: tx.payment_type === 'read' ? 'rgba(0,115,195,0.15)' : 'rgba(245,166,35,0.15)',
                            color: tx.payment_type === 'read' ? 'var(--primary-light)' : 'var(--accent)'
                          }}>
                            {tx.payment_type === 'read' ? '📚 Pay-Per-Read' : '⚜️ Citation Toll'}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: tx.payment_type === 'read' ? '#fff' : 'var(--accent)' }}>
                          ${tx.amount_usdc}
                        </td>
                        <td>
                          <code style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {tx.tx_hash.substring(0, 14)}...
                          </code>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        No payments processed yet. Launch your AI Reader Agent to begin!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </>
  );
}

export default function CreatorDashboard() {
  return (
    <Suspense fallback={
      <>
        <Header />
        <main className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
          <div className="status-dot pulsing"></div> Loading Creator Dashboard...
        </main>
      </>
    }>
      <CreatorDashboardInner />
    </Suspense>
  );
}
