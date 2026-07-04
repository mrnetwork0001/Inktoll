'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '../../../components/Header';
import { useNotification } from '../../../components/NotificationProvider';
import { Eye, EyeOff, BookOpen, ReceiptText, BadgeCheck, Info, Bot, Star, RefreshCw } from 'lucide-react';

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
  const { showAlert, showPrompt, showToast } = useNotification();
  const searchParams = useSearchParams();
  const router = useRouter();
  const paramCreatorId = searchParams.get('creatorId');

  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState<{message: string, txHash?: string, url?: string} | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [connectedType, setConnectedType] = useState<string>('managed');
  const [binding, setBinding] = useState(false);
  const [payoutAddress, setPayoutAddress] = useState<string>('');
  const [isEditingPayout, setIsEditingPayout] = useState(false);
  const [showBalances, setShowBalances] = useState<boolean>(true);
  const [logsPage, setLogsPage] = useState<number>(1);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncingGateway, setSyncingGateway] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Load showBalances from localStorage
  useEffect(() => {
    const val = localStorage.getItem('inktoll_show_balances');
    if (val === 'false') {
      setShowBalances(false);
    }
  }, []);

  // 1. Initial Load of creatorId and Wallet Connection state
  useEffect(() => {
    // Sync storage values for wallet
    const addr = localStorage.getItem('inktoll_connected_address');
    const type = localStorage.getItem('inktoll_wallet_type') || 'managed';
    setConnectedAddress(addr);
    setConnectedType(type);
    if (addr) setPayoutAddress(addr);

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
      if (a) setPayoutAddress(a);

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

  const handleBindWallet = async () => {
    if (!creatorId || !connectedAddress) return;
    setBinding(true);
    setError('');
    try {
      const timestamp = Date.now();
      const message = `Bind my Inktoll creator profile for this blog to wallet ${connectedAddress.toLowerCase()} at timestamp ${timestamp}`;
      
      let signature = '';
      if (connectedType === 'metamask' && typeof window !== 'undefined' && (window as any).ethereum) {
        signature = await (window as any).ethereum.request({
          method: 'personal_sign',
          params: [message, connectedAddress]
        });
      } else {
        // Mock signature for smart account / Circle Passkey wallet login
        signature = 'mock-passkey-signature';
      }

      const res = await fetch(`${API_URL}/api/creators/bind`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId,
          walletAddress: connectedAddress,
          message,
          signature
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to bind wallet');
      }

      showToast('Successfully bound Ghost blog account to your wallet!', 'success');
      await fetchStats();
    } catch (err: any) {
      setError('Binding failed: ' + err.message);
    } finally {
      setBinding(false);
    }
  };

  const handleWithdraw = async () => {
    if (!stats?.walletAddress || stats.balanceUsdc <= 0) return;
    setWithdrawing(true);
    setWithdrawSuccess(null);
    setError('');

    try {
      const dest = payoutAddress.trim();
      if (!dest) {
        throw new Error('Please specify a destination wallet address to withdraw your funds.');
      }
      if (!/^0x[a-fA-F0-9]{40}$/.test(dest)) {
        throw new Error('Invalid Ethereum wallet address format. Please check the spelling.');
      }
      const amt = parseFloat(withdrawAmount);
      if (isNaN(amt) || amt <= 0) {
        throw new Error('Please enter a valid positive withdrawal amount.');
      }
      if (amt > stats.balanceUsdc) {
        throw new Error(`Insufficient balance. You cannot withdraw more than your wallet balance of ${stats.balanceUsdc} USDC.`);
      }
      if (stats.balanceUsdc - amt < 0.01) {
        throw new Error('Please leave at least a 0.01 USDC buffer in your balance to cover network gas fees.');
      }

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
      setWithdrawSuccess({
        message: `Success! Withdrew ${amt} USDC to ${dest.substring(0, 10)}... (Tx: ${data.txHash.substring(0, 16)}...)`,
        txHash: data.txHash,
        url: `https://testnet.arcscan.app/tx/${data.txHash}`
      });
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
            <h2>⚠️ No Content Platform Connected</h2>
            <p>You must connect a content platform to access the creator earnings dashboard.</p>
            <button className="btn btn-primary" onClick={() => router.push('/creator/onboard')}>
              Connect My Content Platform Now
            </button>
          </div>
        </main>
      </>
    );
  }
  const handleSync = async () => {
    if (!creatorId || syncing) return;
    setSyncing(true);
    try {
      const res = await fetch(`${API_URL}/api/creators/${creatorId}/sync`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync feed');
      showToast(`Successfully imported ${data.articlesImported} new articles from Ghost!`, 'success');
      await fetchStats(true);
    } catch (err: any) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncGateway = async () => {
    if (!creatorId || syncingGateway || !stats) return;
    const amountToWithdraw = stats.totalEarningsUsdc - (stats.balanceUsdc || 0);
    if (amountToWithdraw <= 0.01) {
      showToast('No new earnings in the Gateway to sync.', 'info');
      return;
    }
    setSyncingGateway(true);
    try {
      showToast('Syncing Gateway balance... this may take 30-60 seconds on-chain.', 'info');
      const res = await fetch(`${API_URL}/api/creators/sync-gateway`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId, amount: amountToWithdraw.toFixed(6) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync gateway');
      showToast(`Success! Pulled ${amountToWithdraw.toFixed(6)} USDC from Gateway.`, 'success');
      await fetchStats(true);
    } catch (err: any) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setSyncingGateway(false);
    }
  };

  return (
    <>
      <Header />
      <main style={{ padding: '3rem 0' }}>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                 {error && (
            <div style={{ padding: '1rem', background: 'var(--bg-active)', border: '1px solid var(--primary)', borderRadius: '8px', color: 'var(--primary)' }}>
              ⚠️ {error}
            </div>
          )}

          {/* Header Title Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Creator Dashboard
              </h1>
              <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)' }}>
                Manage your monetized blog feeds, payouts, and on-chain earnings.
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
                transition: 'all 0.2s',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              {showBalances ? <><EyeOff size={16} /> Hide Balances</> : <><Eye size={16} /> Show Balances</>}
            </button>
          </div>

          {/* Top Row KPI Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            {/* 1. All-Time Accumulated Earnings */}
            <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '3px solid var(--primary)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                All-Time Earnings
                <span title="Cumulative USDC earned by your blog from purchases and citation tolls. This number only goes up." style={{ cursor: 'help', opacity: 0.6 }}><Info size={12} /></span>
              </span>
              <h3 style={{ fontSize: '1.75rem', margin: '0.5rem 0 0 0', color: 'var(--primary)', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
                {showBalances ? `$${animatedEarnings.toFixed(6)}` : '$ ••••••'}
              </h3>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>Ticking live via reader agents</span>
            </div>

            {/* 2. Claimable Wallet Balance */}
            <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '3px solid var(--primary-light)', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  Claimable Balance
                  <span title="The claimable USDC balance sitting in your blog's custodial wallet right now. This decreases when you withdraw." style={{ cursor: 'help', opacity: 0.6 }}><Info size={12} /></span>
                </span>
                <button 
                  onClick={handleSyncGateway} 
                  disabled={syncingGateway}
                  className="btn btn-secondary btn-sm" 
                  style={{ padding: '4px 8px', fontSize: '0.7rem', minHeight: 'auto', marginBottom: 0 }}
                  title="Pull funds from Gateway Unified Balance into your wallet"
                >
                  <RefreshCw size={12} style={{ display: 'inline', marginRight: '4px' }} className={syncingGateway ? 'spin' : ''} />
                  {syncingGateway ? 'Syncing...' : 'Sync Gateway'}
                </button>
              </div>
              <h3 style={{ fontSize: '1.75rem', margin: '0.5rem 0 0 0', color: 'var(--primary-light)', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
                {showBalances ? `$${(stats?.balanceUsdc || 0).toFixed(6)}` : '$ ••••••'}
              </h3>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>USDC on Arc L1 network</span>
            </div>

            {/* 3. Monetized Content */}
            <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '3px solid var(--primary)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Monetized Articles</span>
              <h3 style={{ fontSize: '1.75rem', margin: '0.5rem 0 0 0', color: 'var(--primary)', fontWeight: 800 }}>
                {stats?.articles?.length || 0}
              </h3>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>Indexed from Ghost RSS feed</span>
            </div>

            {/* 4. Total Reads & Citations */}
            <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '3px solid var(--primary)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Reads & Citations</span>
              <h3 style={{ fontSize: '1.75rem', margin: '0.5rem 0 0 0', color: 'var(--primary)', fontWeight: 800 }}>
                {stats?.readCount || 0} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 400 }}>/</span> {stats?.citationCount || 0}
              </h3>
<span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>Reads vs semantic citations</span>
            </div>
          </div>

          {/* Main Workspace two-column grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '2rem', alignItems: 'start' }}>
            
            {/* Left Column: Wallet & Settlement Hub */}
            <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-primary)' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                  Settlement & Payout Hub
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Manage custodial storage and transfer rewards to your private address.
                </p>
              </div>

              {/* Custodial Wallet address */}
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Custodial Storage Wallet</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--primary)', background: 'var(--primary-glow)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>Arc L1</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <code style={{ flex: 1, fontSize: '0.75rem', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: '8px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                    {stats?.walletAddress}
                  </code>
                  <button
                    onClick={() => {
                      if (stats?.walletAddress) {
                        navigator.clipboard.writeText(stats.walletAddress);
                        showToast('Address copied to clipboard!', 'success');
                      }
                    }}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      outline: 'none',
                      transition: 'all 0.2s',
                      fontWeight: 600
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary)';
                      e.currentTarget.style.color = 'var(--primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Payout Destination */}
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.6rem' }}>
                  Payout Destination Address
                </span>
                {!isEditingPayout ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: '8px' }}>
                    <code style={{ fontSize: '0.75rem', color: payoutAddress ? 'var(--primary)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {payoutAddress ? `${payoutAddress.substring(0, 12)}...${payoutAddress.substring(payoutAddress.length - 10)}` : 'None specified'}
                    </code>
                    <button
                      onClick={() => setIsEditingPayout(true)}
                      disabled={withdrawing}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--primary)',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: 0
                      }}
                    >
                      Edit
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="0x... (EVM EOA Address)"
                      value={payoutAddress}
                      onChange={(e) => setPayoutAddress(e.target.value)}
                      disabled={withdrawing}
                      style={{
                        flexGrow: 1,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.8rem',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-primary)',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                      onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                    />
                    <button
                      onClick={async () => {
                        const val = payoutAddress.trim();
                        if (val && !/^0x[a-fA-F0-9]{40}$/.test(val)) {
                          await showAlert('Invalid Ethereum wallet address format. Please check the spelling.', { title: 'Address Validation' });
                          return;
                        }
                        setIsEditingPayout(false);
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.75rem', minHeight: 'auto', marginBottom: 0, borderRadius: '8px' }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setPayoutAddress(connectedAddress || '');
                        setIsEditingPayout(false);
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.75rem', minHeight: 'auto', marginBottom: 0, opacity: 0.7, borderRadius: '8px' }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Secure / Bind Account Panel */}
              {connectedAddress && (!stats?.ownerAddress || stats.ownerAddress.toLowerCase() !== connectedAddress.toLowerCase()) && (
                <div style={{ 
                  padding: '1rem', 
                  background: 'var(--primary-glow)', 
                  border: '1px solid var(--border)', 
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  <div style={{ fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                    Bind Ghost blog to connected wallet
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    Bind your blog account to enable passwordless wallet authentication and secure logins.
                  </div>
                  <button 
                    className="btn btn-primary"
                    style={{ padding: '0.6rem', fontSize: '0.8rem', minHeight: 'auto', marginBottom: 0, width: '100%', borderRadius: '8px' }}
                    onClick={handleBindWallet}
                    disabled={binding}
                  >
                    {binding ? 'Binding account...' : 'Bind Account to Wallet'}
                  </button>
                </div>
              )}

              {connectedAddress && stats?.ownerAddress && stats.ownerAddress.toLowerCase() === connectedAddress.toLowerCase() && (
                <div style={{ 
                  padding: '0.75rem 1rem', 
                  background: 'var(--primary-glow)', 
                  border: '1px solid rgba(46, 204, 138, 0.25)', 
                  borderRadius: '12px', 
                  fontSize: '0.8rem',
                  color: 'var(--primary)',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  Blog Account Bound to Wallet
                </div>
              )}

              {/* Withdraw Form block */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
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
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '0.6rem 0.75rem',
                      fontSize: '0.9rem',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                    onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                  />
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.6rem 1rem', minWidth: 'auto', fontSize: '0.8rem', marginBottom: 0, borderRadius: '8px', fontWeight: 700 }}
                    onClick={() => {
                      if (stats?.balanceUsdc) {
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
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    * Leaving a 0.01 USDC buffer for network gas fees is recommended.
                  </div>
                )}
                
                {withdrawSuccess && (
                  <div style={{ padding: '0.5rem 0.75rem', background: 'var(--primary-glow)', border: '1px solid var(--primary)', borderRadius: '6px', color: 'var(--primary)', fontSize: '0.75rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      {withdrawSuccess.message}
                      {withdrawSuccess.url && (
                        <span style={{ marginLeft: '0.5rem' }}>
                          <a href={withdrawSuccess.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline', fontWeight: 600 }}>View on Explorer</a>
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={() => setWithdrawSuccess(null)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '0 4px', fontSize: '1rem', lineHeight: 1 }}
                    >
                      &times;
                    </button>
                  </div>
                )}
                {faucetSuccess && (
                  <div style={{ padding: '0.5rem 0.75rem', background: 'var(--primary-glow)', border: '1px solid var(--primary)', borderRadius: '6px', color: 'var(--primary)', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                    {faucetSuccess}
                  </div>
                )}

                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', padding: '0.9rem', borderRadius: '50px', fontWeight: 'bold', marginTop: '0.75rem', fontSize: '0.95rem' }}
                  onClick={handleWithdraw}
                  disabled={withdrawing || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || !payoutAddress}
                  title={!payoutAddress ? "Please specify a destination wallet address to withdraw" : ""}
                >
                  {withdrawing ? 'Withdrawing...' : 'Withdraw Funds'}
                </button>
              </div>
            </div>

            {/* Right Column: Monetized Content Hub */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BookOpen size={20} color="var(--primary)" /> Monetized Content Hub
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Detailed earnings breakdown of articles scraped and evaluated by reader agents.
                  </p>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleSync}
                  disabled={syncing}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto', marginBottom: 0 }}
                >
                  <RefreshCw size={14} className={syncing ? 'spin' : ''} />
                  {syncing ? 'Syncing...' : 'Sync Feed'}
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem' }}>Article Title</th>
                      <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem' }}>Price</th>
                      <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem' }}>Reads</th>
                      <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem' }}>Citations</th>
                      <th style={{ textAlign: 'right', padding: '0.75rem 0.5rem' }}>Total Earnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats?.articles && stats.articles.length > 0 ? (
                      stats.articles.map((art: any) => (
                        <tr key={art.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>{art.title}</td>
                          <td style={{ padding: '1rem 0.5rem', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>${art.price_usdc}</td>
                          <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>{art.reads}</td>
                          <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                            <span style={{ display: 'inline-flex', gap: '0.25rem', alignItems: 'center' }}>
                              {art.citations}
                              {art.citations > 0 && <span style={{ fontSize: '0.7rem', background: 'var(--primary-glow)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '10px', fontWeight: 600 }}>Toll Active</span>}
                            </span>
                          </td>
                          <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)' }}>
                            {showBalances ? `$${art.revenue.toFixed(4)}` : '$ ••••••'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No articles imported yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Agent Spenders Leaderboard */}
            <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Star size={20} color="var(--primary)" fill="var(--primary)" /> Top Agent Fans
                </h3>
              </div>
              <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                These autonomous reader agents have spent the most USDC unlocking your content and citing your work.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flexGrow: 1 }}>
                {stats?.topAgents && stats.topAgents.length > 0 ? (
                  stats.topAgents.map((agent: any, index: number) => (
                    <div key={agent.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-primary)', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ fontWeight: 800, color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : 'var(--text-muted)', width: '20px' }}>
                          #{index + 1}
                        </div>
                        <div style={{ background: 'var(--primary-glow)', padding: '6px', borderRadius: '50%', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Bot size={18} />
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }} title={agent.wallet}>{agent.name}</span>
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)', fontSize: '0.9rem' }}>
                        {showBalances ? `$${agent.spent.toFixed(2)}` : '$ ••••••'}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', background: 'var(--bg-primary)', borderRadius: '12px', border: '1px dashed var(--border)', flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    No agent interactions yet. Wait for AI reader agents to discover your content!
                  </div>
                )}
              </div>
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
                    stats.history.slice((logsPage - 1) * 10, logsPage * 10).map((tx: any) => (
                      <tr key={tx.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {new Intl.DateTimeFormat('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: 'numeric',
                            hour12: true
                          }).format(new Date(tx.created_at.includes('T') ? tx.created_at : tx.created_at.replace(' ', 'T') + 'Z'))}
                        </td>
                        <td>{tx.article_title}</td>
                        <td>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            padding: '2px 8px', 
                            borderRadius: '12px', 
                            fontWeight: 600,
                            background: tx.payment_type === 'read' ? 'rgba(0,115,195,0.15)' : 'var(--primary-glow)',
                            color: tx.payment_type === 'read' ? 'var(--primary-light)' : 'var(--primary)'
                          }}>
                            {tx.payment_type === 'read' ? <><BookOpen size={12} style={{ display: 'inline', marginRight: '4px' }} /> Pay-Per-Read</> : <><BadgeCheck size={12} style={{ display: 'inline', marginRight: '4px' }} /> Citation Toll</>}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: tx.payment_type === 'read' ? 'var(--text-primary)' : 'var(--primary)' }}>
                          {showBalances ? `$${tx.amount_usdc}` : '$ ••••••'}
                        </td>
                        <td>
                          {tx.tx_hash ? (
                            <button 
                              onClick={() => setSelectedReceipt(tx)}
                              title="Click to view Circle Gateway Receipt"
                              style={{ 
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--primary-light)', 
                                textDecoration: 'underline', 
                                fontSize: '0.8rem', 
                                fontFamily: 'var(--font-mono)',
                                cursor: 'pointer',
                                padding: 0,
                                outline: 'none'
                              }}
                            >
                              {tx.tx_hash.substring(0, 13)}...
                            </button>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )}
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
            {stats?.history && stats.history.length > 10 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', padding: '0 0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Page <strong>{logsPage}</strong> of <strong>{Math.ceil(stats.history.length / 10)}</strong> ({stats.history.length} total logs)
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setLogsPage(prev => Math.max(1, prev - 1))}
                    disabled={logsPage === 1}
                    style={{ padding: '4px 12px', fontSize: '0.75rem', minHeight: 'auto', marginBottom: 0 }}
                  >
                    Previous
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setLogsPage(prev => Math.min(Math.ceil(stats.history.length / 10), prev + 1))}
                    disabled={logsPage === Math.ceil(stats.history.length / 10)}
                    style={{ padding: '4px 12px', fontSize: '0.75rem', minHeight: 'auto', marginBottom: 0 }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
        </div>

        {selectedReceipt && (
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
                    {selectedReceipt.payment_type === 'read' ? <><BookOpen size={14} style={{ display: 'inline', marginRight: '4px' }} /> Pay-Per-Read</> : <><BadgeCheck size={14} style={{ display: 'inline', marginRight: '4px' }} /> Citation Toll</>}
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
                  <span style={{ color: 'var(--text-secondary)' }}>Payer Agent:</span>
                  <code style={{ background: 'var(--bg-active)', color: 'var(--text-primary)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                    {selectedReceipt.reader_agent_id || '0x44978b7f924c0c6bed1E2acCa887338Dc47C4539'}
                  </code>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Recipient Creator:</span>
                  <code style={{ background: 'var(--bg-active)', color: 'var(--text-primary)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                    {stats?.walletAddress || '0xcd0a2370f2dc12c1802707b7d9ab3fec891e3c02'}
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
                      📋 Copy
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
                  href={`https://testnet.arcscan.app/address/${stats?.walletAddress || ''}`}
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
        )}
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
