'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../../components/Header';

export default function CreatorOnboard() {
  const router = useRouter();
  const [ghostUrl, setGhostUrl] = useState('');
  const [ghostApiKey, setGhostApiKey] = useState('');
  const [price, setPrice] = useState('0.005');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    try {
      const ownerAddress = localStorage.getItem('inktoll_connected_address') || null;

      const response = await fetch(`${API_URL}/api/creators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ghostUrl,
          ghostApiKey,
          defaultPriceUsdc: parseFloat(price),
          ownerAddress
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to connect blog');
      }

      const data = await response.json();
      // Persist the creator ID in localStorage for state retention across tabs
      localStorage.setItem('inktoll_creator_id', data.creatorId);
      // Onboard successful, redirect to dashboard with creator ID
      router.push(`/creator/dashboard?creatorId=${data.creatorId}`);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main style={{ padding: '4rem 0' }}>
        <div className="container" style={{ maxWidth: '600px' }}>
          <div className="glass-card">
            <h2 style={{ marginBottom: '0.5rem' }}>✍️ Onboard Your Blog</h2>
            <p style={{ marginBottom: '2rem', fontSize: '0.95rem' }}>
              Connect your Ghost publication to start earning USDC. We will generate a Circle Programmable Wallet for you, import your articles, and wrap them with an autonomous x402 paywall.
            </p>

            <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Ghost Blog URL</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://your-blog.ghost.io"
                  value={ghostUrl}
                  onChange={(e) => setGhostUrl(e.target.value)}
                  required
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Tip: Use <code>https://mock-blog.com</code> to run in demo/offline mode.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Content API Key (Read-Only)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="43ec8b9..."
                  value={ghostApiKey}
                  onChange={(e) => setGhostApiKey(e.target.value)}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Leave empty if using the mock URL.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Default Price per Article (USDC)</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  max="1.0"
                  className="form-input"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Pricing typically ranges from $0.001 to $0.05 USDC per read.
                </span>
              </div>

              {error && (
                <div style={{ padding: '1rem', background: 'var(--bg-active)', border: '1px solid var(--primary)', borderRadius: '8px', color: 'var(--primary)', fontSize: '0.9rem' }}>
                  ⚠️ {error}
                </div>
              )}

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Connecting & Syncing...' : 'Connect Blog & Import Posts'}
              </button>
            </form>
          </div>
          <div className="glass-card" style={{ marginTop: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-blocks"><rect width="7" height="7" x="14" y="3" rx="1"/><path d="M10 21V8a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H3"/></svg>
              Integrations Roadmap
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Ghost is our primary supported platform for the hackathon. Support for other major content networks is actively being built.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              
              {/* WordPress Card */}
              <div style={{ padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-active)', opacity: 0.7, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(255, 128, 34, 0.2)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                  COMING SOON
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.2rem', marginTop: '0.5rem' }}>WordPress</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>WP REST API v2</div>
              </div>

              {/* Substack Card */}
              <div style={{ padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-active)', opacity: 0.7, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(255, 128, 34, 0.2)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                  COMING SOON
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.2rem', marginTop: '0.5rem' }}>Substack</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>RSS Syndication</div>
              </div>

              {/* Medium Card */}
              <div style={{ padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-active)', opacity: 0.7, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(255, 128, 34, 0.2)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                  COMING SOON
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.2rem', marginTop: '0.5rem' }}>Medium</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Medium API</div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </>
  );
}
