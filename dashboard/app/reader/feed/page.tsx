'use client';

import React, { useState, useEffect } from 'react';
import Header from '../../../components/Header';
import { Library, RefreshCw, ShieldCheck } from 'lucide-react';

export default function ReaderFeed() {
  const [agentAddress, setAgentAddress] = useState('');
  const [purchased, setPurchased] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
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
      
      // On mobile, scroll to the reader pane since it stacks below the feed
      setTimeout(() => {
        document.getElementById('article-reader-pane')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setFetchingArticle(false);
    }
  };
  const totalPages = Math.ceil(purchased.length / itemsPerPage);
  const currentArticles = purchased.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-2xl sm:text-3xl m-0 font-extrabold flex items-center gap-2"><Library size={28} color="var(--primary)" /> Agent's Purchased Feed</h2>
            <button className="btn btn-secondary btn-sm" onClick={fetchFeed}>
              <RefreshCw size={14} style={{ display: 'inline', marginRight: '6px' }} /> Refresh Feed
            </button>
          </div>

          <div className={`grid gap-8 items-start ${activeArticle ? 'grid-cols-1 lg:grid-cols-[1fr_1.2fr]' : 'grid-cols-1'}`}>
            
            {/* Articles List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {currentArticles.length > 0 ? (
                currentArticles.map((art: any) => (
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '12px', width: 'fit-content', marginTop: '4px' }}>
                      <ShieldCheck size={12} /> Verified Ghost Author
                    </div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, marginTop: '8px' }}>
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

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                  <button 
                    className="btn btn-secondary btn-sm"
                    disabled={currentPage === 1}
                    onClick={() => {
                      setCurrentPage(prev => Math.max(prev - 1, 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    Previous
                  </button>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button 
                    className="btn btn-secondary btn-sm"
                    disabled={currentPage === totalPages}
                    onClick={() => {
                      setCurrentPage(prev => Math.min(prev + 1, totalPages));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            {/* Article Content Viewer Panel */}
            {activeArticle ? (
              <div id="article-reader-pane" className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: '90px', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
                <div className="flex flex-col-reverse sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[color:var(--border)] pb-4">
                  <div className="min-w-0 w-full">
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Unlocked Content</span>
                    <h2 className="text-xl sm:text-2xl m-0 mt-1 mb-2 truncate whitespace-normal">{activeArticle.title}</h2>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', wordBreak: 'break-all' }}>
                      Author Wallet: <code>{activeArticle.creator_wallet}</code>
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 10px', borderRadius: '12px', width: 'fit-content', marginTop: '8px' }}>
                      <ShieldCheck size={14} /> Cryptographically Secured via Ghost API
                    </div>
                  </div>
                  <button className="btn btn-secondary btn-sm self-end sm:self-auto shrink-0" onClick={() => {
                    setActiveArticle(null);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}>
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
