'use client';

import React, { useState, useEffect } from 'react';
import Header from '../../../components/Header';

export default function ReaderFeed() {
  const [agentAddress, setAgentAddress] = useState('');
  const [purchased, setPurchased] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Article viewer state
  const [activeArticle, setActiveArticle] = useState<any>(null);
  const [fetchingArticle, setFetchingArticle] = useState(false);

  const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:3002';
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const getUserId = () => {
    // Tie identity to EOA wallet if connected, supporting cross-device recovery
    const connectedAddr = localStorage.getItem('inktoll_connected_address');
    if (connectedAddr) {
      return connectedAddr.toLowerCase();
    }
    let id = localStorage.getItem('inktoll_user_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('inktoll_user_id', id);
    }
    return id;
  };

  const fetchFeed = async () => {
    try {
      // 1. Get agent wallet address
      const statusRes = await fetch(`${AGENT_URL}/api/agent/status`, {
        headers: { 'x-user-id': getUserId() }
      });
      if (!statusRes.ok) throw new Error('Agent service is offline');
      const status = await statusRes.json();
      setAgentAddress(status.address);

      // 2. Get purchased articles list
      const feedRes = await fetch(`${API_URL}/api/payments?agentWallet=${status.address}`);
      if (!feedRes.ok) throw new Error('Server stats endpoint offline');
      const feedData = await feedRes.json();
      setPurchased(feedData.purchasedArticles || []);
      setError('');
    } catch (err: any) {
      console.error(err);
      setError('Could not connect to backend services. Ensure both server (port 3001) and agent (port 3002) are running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();

    const handleWalletChange = () => {
      fetchFeed();
    };

    window.addEventListener('wallet-changed', handleWalletChange);
    return () => window.removeEventListener('wallet-changed', handleWalletChange);
  }, []);

  const handleOpenArticle = async (slug: string) => {
    setFetchingArticle(true);
    setActiveArticle(null);
    try {
      // Query individual article. In this flow, we fetch from local DB.
      // Since it was already paid by this agent, the server will retrieve it.
      // For simplicity in the demo UI client, the server allows listing paid contents
      // or we can request with a bypass header/agent authorization.
      // Let's pass the authorization header using a mock signature to satisfy the server's x402Middleware
      const authPayload = {
        fromAddress: agentAddress,
        signature: 'mock-client-bypass',
        nonce: crypto.randomUUID(),
        deadline: Math.floor(Date.now() / 1000) + 3600
      };

      const res = await fetch(`${API_URL}/api/articles/${slug}`, {
        headers: {
          'X-Payment-Authorization': JSON.stringify(authPayload)
        }
      });

      if (!res.ok) {
        throw new Error('Failed to retrieve full article content');
      }

      const data = await res.json();
      setActiveArticle(data.article);
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setFetchingArticle(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
          <div className="status-dot pulsing"></div> Loading Purchased Feed...
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
            <div style={{ padding: '1rem', background: 'var(--bg-active)', border: '1px solid var(--primary)', borderRadius: '8px', color: 'var(--primary)' }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>📚 Agent's Purchased Feed</h2>
            <button className="btn btn-secondary btn-sm" onClick={fetchFeed}>
              🔄 Refresh Feed
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: activeArticle ? '1fr 1.2fr' : '1fr', gap: '2rem', alignItems: 'start' }}>
            
            {/* Articles List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {purchased.length > 0 ? (
                purchased.map((art: any) => (
                  <div 
                    key={art.id} 
                    className={`glass-card ${activeArticle?.ghost_slug === art.ghost_slug ? 'gradient-border-hover' : ''}`}
                    style={{ cursor: 'pointer', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', border: activeArticle?.ghost_slug === art.ghost_slug ? '1px solid var(--primary)' : '1px solid var(--border)' }}
                    onClick={() => handleOpenArticle(art.ghost_slug)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Purchased: {new Date(art.purchased_at).toLocaleDateString()}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, background: 'var(--primary-glow)', padding: '2px 8px', borderRadius: '10px' }}>
                        Paid {art.price_usdc} USDC
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: 0 }}>{art.title}</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
                      {art.excerpt}
                    </p>
                  </div>
                ))
              ) : (
                <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    No purchased articles in feed. Start the agent in the Control Panel to discover and buy articles autonomously!
                  </p>
                </div>
              )}
            </div>

            {/* Article Content Viewer Panel */}
            {activeArticle ? (
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: '90px', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Unlocked Content</span>
                    <h2 style={{ fontSize: '1.5rem', margin: '0.25rem 0' }}>{activeArticle.title}</h2>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Author Wallet: <code>{activeArticle.creator_wallet}</code>
                    </span>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => setActiveArticle(null)}>
                    ✕ Close
                  </button>
                </div>

                <div 
                  className="article-full-html"
                  style={{ 
                    lineHeight: '1.6', 
                    fontSize: '1rem',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}
                  dangerouslySetInnerHTML={{ __html: activeArticle.full_html }}
                />
              </div>
            ) : (
              fetchingArticle && (
                <div className="glass-card" style={{ textAlign: 'center', padding: '5rem' }}>
                  <div className="status-dot pulsing" style={{ marginRight: '0.5rem' }}></div>
                  Decrypting article payload and checking signatures...
                </div>
              )
            )}

          </div>

        </div>
      </main>
    </>
  );
}
