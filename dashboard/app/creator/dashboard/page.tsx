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
  const paramCreatorId = searchParams.get('creatorId');

  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [connectedType, setConnectedType] = useState<string>('managed');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // 1. Initial Load of creatorId and Wallet Connection state
  useEffect(() => {
    // Sync storage values for wallet
    const addr = localStorage.getItem('inktoll_connected_address');
    const type = localStorage.getItem('inktoll_wallet_type') || 'managed';
    setConnectedAddress(addr);
    setConnectedType(type);

    const loadCreator = async () => {
      if (paramCreatorId) {
        setCreatorId(paramCreatorId);
        localStorage.setItem('inktoll_creator_id', paramCreatorId);
        setLoading(false);
      } else {
        const stored = localStorage.getItem('inktoll_creator_id');
        if (stored) {
          setCreatorId(stored);
          setLoading(false);
        } else if (addr) {
          // If EOA is connected, look it up on backend
          try {
            const res = await fetch(`${API_URL}/api/creators/lookup?wallet=${addr}`);
            if (res.ok) {
              const data = await res.json();
              setCreatorId(data.creatorId);
              localStorage.setItem('inktoll_creator_id', data.creatorId);
            }
          } catch (err) {
            console.warn('Initial creator lookup failed:', err);
          }
          setLoading(false);
        } else {
          setLoading(false);
        }
      }
    };
    loadCreator();

    // Listen to wallet changes
    const handleWalletChange = async () => {
      const a = localStorage.getItem('inktoll_connected_address');
      const t = localStorage.getItem('inktoll_wallet_type') || 'managed';
      setConnectedAddress(a);
      setConnectedType(t);

      // If user just connected a wallet and we don't have creatorId, attempt lookup
      if (a && !localStorage.getItem('inktoll_creator_id')) {
        setLoading(true);
        try {
          const res = await fetch(`${API_URL}/api/creators/lookup?wallet=${a}`);
          if (res.ok) {
            const data = await res.json();
            setCreatorId(data.creatorId);
            localStorage.setItem('inktoll_creator_id', data.creatorId);
          }
        } catch (err) {
          console.warn('Wallet change creator lookup failed:', err);
        }
        setLoading(false);
      } else if (!a) {
        // Clear state if EOA disconnected
        setCreatorId(null);
        localStorage.removeItem('inktoll_creator_id');
      }
    };

    window.addEventListener('wallet-changed', handleWalletChange);
    return () => {
      window.removeEventListener('wallet-changed', handleWalletChange);
    };
  }, [paramCreatorId]);

  // Animate Earnings Counter
  const totalEarnings = stats?.totalEarningsUsdc || 0;
  const animatedEarnings = useAnimatedCount(totalEarnings, 1200);

  // Fetch stats function
  const fetchStats = async (silent = false) => {
    if (!creatorId) return;
    try {
      const res = await fetch(`${API_URL}/api/payments?creatorId=${creatorId}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${res.status}`);
      }
      const data = await res.json();
      setStats(data);
      setError('');
    } catch (err: any) {
      console.error(err);
      if (!silent) {
        if (err.message.includes('Failed to fetch') || err.message.includes('fetch failed')) {
          setError('Could not connect to the backend server. Make sure the server is running on port 3001.');
        } else {
          setError(err.message);
        }
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // 2. Fetch stats when creatorId is present (includes interval polling)
  useEffect(() => {
    if (!creatorId) return;

    fetchStats();

    const interval = setInterval(() => {
      fetchStats(true);
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [creatorId]);

  const handleWithdraw = async () => {
    if (!stats?.walletAddress || stats.balanceUsdc <= 0) return;
    setWithdrawing(true);
    setWithdrawSuccess('');
    setError('');

    try {
      if (!connectedAddress) {
        throw new Error('Please connect your payout wallet (MetaMask) at the top right before initiating a withdrawal.');
      }
      const amt = parseFloat(withdrawAmount);
      if (isNaN(amt) || amt <= 0) {
        throw new Error('Please enter a valid positive withdrawal amount.');
      }
      if (amt > stats.balanceUsdc) {
        throw new Error(`Insufficient balance. You cannot withdraw more than your wallet balance of ${stats.balanceUsdc} USDC.`);
      }

      const dest = connectedAddress;
      const res = await fetch(`${API_URL}/api/creators/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId,
          destinationAddress: dest,
          amount: amt
        })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to withdraw');
      }
      
      const data = await res.json();
      setWithdrawSuccess(`Success! Withdrew ${amt} USDC to ${dest.substring(0, 10)}... (Tx: ${data.txHash.substring(0, 16)}...)`);
      setWithdrawAmount('');
      await fetchStats();
    } catch (err: any) {
      setError('Withdrawal failed: ' + err.message);
    } finally {
      setWithdrawing(false);
    }
  };

  const [fauceting, setFauceting] = useState(false);
  const [faucetSuccess, setFaucetSuccess] = useState('');

  const handleFaucet = async () => {
    if (!stats?.walletAddress) return;
    setFauceting(true);
    setFaucetSuccess('');
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/faucet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: stats.walletAddress,
          type: 'creator',
        }),
      });
      if (!res.ok) throw new Error('Faucet request failed');
      setFaucetSuccess('Success! 5.00 USDC testnet funds requested.');
      await fetchStats();
    } catch (err: any) {
      setError('Faucet failed: ' + err.message);
    } finally {
      setFauceting(false);
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
                        {/* WALLET WIDGET */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1.5rem' }}>
              <div>
                <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Inktoll Wallet Balance
                </h4>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2.5rem', fontWeight: 700, margin: '0.5rem 0' }}>
                  {stats?.balanceUsdc?.toFixed(6) || '0.000000'} <span style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>USDC</span>
                </div>
                
                {/* Copyable Wallet Address Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.25rem 0' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Address:</span>
                  <code style={{ fontSize: '0.8rem', background: 'rgba(0,0,0,0.15)', padding: '0.2rem 0.4rem', borderRadius: '4px', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                    {stats?.walletAddress}
                  </code>
                  <button
                    onClick={() => {
                      if (stats?.walletAddress) {
                        navigator.clipboard.writeText(stats.walletAddress);
                        alert('Address copied to clipboard!');
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent)',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      padding: 0,
                      textDecoration: 'underline'
                    }}
                  >
                    Copy
                  </button>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Blockchain: Arc Testnet (gasless stablecoin native L1)
                </div>
                
                {/* Connected Wallet Payout Destination Info */}
                <div style={{ 
                  marginTop: '0.75rem', 
                  padding: '0.5rem 0.75rem', 
                  background: 'rgba(255,255,255,0.02)', 
                  border: '1px solid var(--border)', 
                  borderRadius: '8px', 
                  fontSize: '0.8rem' 
                }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Payout Destination:</span>
                  <div style={{ marginTop: '0.25rem' }}>
                    {connectedAddress ? (
                      <code style={{ color: 'var(--accent)', fontWeight: 'bold' }}>
                        {connectedAddress.substring(0, 8)}...{connectedAddress.substring(connectedAddress.length - 6)} ({connectedType === 'metamask' ? 'EVM EOA' : 'Circle Passkey'})
                      </code>
                    ) : (
                      <span style={{ color: 'var(--error)', fontStyle: 'italic', fontWeight: 500 }}>
                        No destination wallet connected. Connect your Web3 payout wallet at the top right to enable withdrawals.
                      </span>
                    )}
                  </div>
                </div>

                {/* Withdrawal Amount Input */}
                <div style={{ marginTop: '0.75rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Withdrawal Amount (USDC):
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      min="0.01"
                      max={stats?.balanceUsdc || 0}
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      disabled={withdrawing}
                      style={{
                        flexGrow: 1,
                        background: 'rgba(0,0,0,0.2)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        padding: '0.4rem 0.6rem',
                        fontSize: '0.9rem',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-mono)'
                      }}
                    />
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.8rem', minWidth: 'auto', fontSize: '0.8rem', marginBottom: 0 }}
                      onClick={() => {
                        if (stats?.balanceUsdc) {
                          // Leave a tiny buffer of 0.01 for gas automatically
                          const maxAmount = Math.max(0, parseFloat((stats.balanceUsdc - 0.01).toFixed(6)));
                          setWithdrawAmount(maxAmount.toString());
                        }
                      }}
                      disabled={withdrawing || !stats?.balanceUsdc || stats.balanceUsdc <= 0.01}
                    >
                      MAX
                    </button>
                  </div>
                  {stats?.balanceUsdc > 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      * Leaving a 0.01 USDC buffer for network gas fees is recommended.
                    </div>
                  )}
                </div>
              </div>

              <div>
                {withdrawSuccess && (
                  <div style={{ padding: '0.5rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--success)', borderRadius: '6px', color: 'var(--success)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                    {withdrawSuccess}
                  </div>
                )}
                {faucetSuccess && (
                  <div style={{ padding: '0.5rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--success)', borderRadius: '6px', color: 'var(--success)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                    {faucetSuccess}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {process.env.NEXT_PUBLIC_ARC_MAINNET !== 'true' && (
                    <button 
                      className="btn btn-secondary" 
                      style={{ flexGrow: 1, marginBottom: 0 }}
                      onClick={handleFaucet}
                      disabled={fauceting}
                    >
                      {fauceting ? 'Fauceting...' : '⛲ Faucet'}
                    </button>
                  )}
                  <button 
                    className="btn btn-primary" 
                    style={{ flexGrow: 2, marginBottom: 0 }}
                    onClick={handleWithdraw}
                    disabled={withdrawing || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || !connectedAddress}
                    title={!connectedAddress ? "Please connect a payout wallet to withdraw" : ""}
                  >
                    {withdrawing ? 'Withdrawing...' : 'Withdraw'}
                  </button>
                </div>
              </div>
            </div>    </div>

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
