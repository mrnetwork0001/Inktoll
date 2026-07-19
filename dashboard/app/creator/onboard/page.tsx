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
  const [showGuide, setShowGuide] = useState(false);

  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

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
          
          {!selectedPlatform ? (
            <div className="glass-card">
              <h2 style={{ marginBottom: '0.5rem' }}>Select Your Content Platform</h2>
              <p style={{ marginBottom: '2rem', fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                Connect your existing blog to Inktoll. We will import your articles and wrap them in an autonomous x402 paywall for AI agents.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                
                {/* Ghost Card (Active) */}
                <div 
                  onClick={() => setSelectedPlatform('ghost')}
                  style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--primary)', background: 'var(--bg-active)', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 20px rgba(255, 128, 34, 0.1)', position: 'relative', overflow: 'hidden' }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(52, 211, 153, 0.15)', color: '#10b981', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                    LIVE
                  </div>
                  <div style={{ fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--text)' }}>Ghost</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Connect via Content API</div>
                </div>

                {/* X (Twitter) Card (65% Developed) */}
                <div style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.3)', background: 'var(--bg-active)', position: 'relative', overflow: 'hidden', cursor: 'not-allowed' }}>
                  <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                    65% DEVELOPED
                  </div>
                  <div style={{ fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--text)' }}>X (Twitter)</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>OAuth 2.0 & Stitched Threads</div>
                </div>

                {/* WordPress Card (Coming Soon) */}
                <div style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-active)', opacity: 0.6, position: 'relative', overflow: 'hidden', cursor: 'not-allowed' }}>
                  <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(255, 128, 34, 0.2)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                    COMING SOON
                  </div>
                  <div style={{ fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--text)' }}>WordPress</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>WP REST API v2</div>
                </div>

                {/* Substack Card (Coming Soon) */}
                <div style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-active)', opacity: 0.6, position: 'relative', overflow: 'hidden', cursor: 'not-allowed' }}>
                  <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(255, 128, 34, 0.2)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                    COMING SOON
                  </div>
                  <div style={{ fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--text)' }}>Substack</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>RSS Syndication</div>
                </div>

              </div>
              
              <div style={{ marginTop: '2rem', textAlign: 'center', fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                For the current hackathon sprint, Ghost is our fully supported integration. We are actively building integrations for X (Twitter), WordPress, and Substack to onboard more creators into the Machine-to-Machine economy.
              </div>
            </div>
          ) : (
            <div className="glass-card">
              <button 
                onClick={() => setSelectedPlatform(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', padding: 0 }}
              >
                ← Back to Platforms
              </button>
              
              <h2 style={{ marginBottom: '0.5rem' }}>✍️ Onboard Your Ghost Blog</h2>
              <p style={{ marginBottom: '1.5rem', fontSize: '0.95rem', lineHeight: 1.6 }}>
                Connect your Ghost publication to start earning USDC. We will generate a Circle Programmable Wallet for you, import your articles, and wrap them with an autonomous x402 paywall.
                <button
                  type="button"
                  onClick={() => setShowGuide(!showGuide)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    marginLeft: '0.5rem',
                    textDecoration: 'underline',
                    fontSize: '0.95rem',
                    padding: 0,
                    display: 'inline'
                  }}
                >
                  {showGuide ? 'Read Less' : 'Read More'}
                </button>
              </p>

              {/* Onboarding Guide Card */}
              {showGuide && (
                <div style={{
                  background: 'rgba(255, 128, 34, 0.04)',
                  border: '1px solid rgba(255, 128, 34, 0.2)',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  marginBottom: '2.5rem',
                  fontSize: '0.85rem',
                  lineHeight: 1.5,
                  color: 'var(--text-secondary)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>Seamless Ghost Setup Guide</strong>
                  </div>
                  
                  <p style={{ margin: '0 0 1rem 0' }}>
                    Don't have a blog yet? Set up your publication and publish articles on <a href="https://ghost.org" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline' }}>Ghost.org</a>.
                  </p>
                  
                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.75rem' }}>
                    <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.5rem' }}>Retrieving your API Key:</strong>
                    <ol style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <li>Open your Ghost admin dashboard and click the <strong>Settings</strong> icon (bottom left).</li>
                      <li>Under the <strong>Advanced</strong> category, click on <strong>Integrations</strong>.</li>
                      <li>Copy your <strong>Content API Key</strong> (it is completely secure and read-only) and paste it below.</li>
                    </ol>
                  </div>
                </div>
              )}

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
                </div>

                <div className="form-group">
                  <label className="form-label">Content API Key (Read-Only)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="43ec8b9..."
                    value={ghostApiKey}
                    onChange={(e) => setGhostApiKey(e.target.value)}
                    required
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      Your key is securely encrypted. We only request Read-Only access to index your public articles. We cannot edit or delete your content.
                    </span>
                  </div>
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
                  {loading ? 'Connecting & Syncing...' : 'Connect Ghost Blog & Import Posts'}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
