'use client';

import React, { useState, useEffect, useRef } from 'react';
import Header from '../../../components/Header';

export default function ReaderSetup() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Settings Form State
  const [interests, setInterests] = useState('');
  const [maxPrice, setMaxPrice] = useState('0.05');
  const [dailyBudget, setDailyBudget] = useState('1.00');
  
  // Running loop state
  const [running, setRunning] = useState(false);
  const [runLogs, setRunLogs] = useState<string[]>([]);
  const logTerminalRef = useRef<HTMLDivElement>(null);

  const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:3002';

  const fetchAgentStatus = async (silent = false) => {
    try {
      const res = await fetch(`${AGENT_URL}/api/agent/status`);
      if (!res.ok) throw new Error('Agent service is offline');
      const data = await res.json();
      setStatus(data);
      if (!silent) {
        setInterests(data.interests.join(', '));
        setMaxPrice(data.maxPricePerArticle.toString());
        setDailyBudget(data.dailyBudgetUsdc.toString());
      }
      setError('');
    } catch (err: any) {
      console.error(err);
      if (!silent) setError('Could not connect to the Inktoll AI Agent microservice. Make sure it is running on port 3002.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgentStatus();
  }, []);

  useEffect(() => {
    if (logTerminalRef.current) {
      logTerminalRef.current.scrollTop = logTerminalRef.current.scrollHeight;
    }
  }, [runLogs]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const formattedInterests = interests.split(',').map(s => s.trim()).filter(Boolean);
      const res = await fetch(`${AGENT_URL}/api/agent/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interests: formattedInterests,
          maxPricePerArticle: parseFloat(maxPrice),
          dailyBudgetUsdc: parseFloat(dailyBudget),
        }),
      });

      if (!res.ok) throw new Error('Failed to update agent settings');
      
      await fetchAgentStatus(true);
      alert('Agent settings saved successfully!');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRunAgent = async () => {
    setRunning(true);
    setRunLogs(['[Client] Launching autonomous agent loop...', '[Client] Agent started.']);
    
    try {
      const res = await fetch(`${AGENT_URL}/api/agent/run`, {
        method: 'POST',
      });
      
      if (!res.ok) throw new Error('Agent run failed');
      const data = await res.json();
      
      // Load logs returned from the run
      if (data.logs && Array.isArray(data.logs)) {
        setRunLogs(prev => [...prev, ...data.logs, `[Client] Completed run. Purchased ${data.articlesPurchased} articles.`]);
      } else {
        setRunLogs(prev => [...prev, '[Client] Loop completed. No new purchases.']);
      }
      
      await fetchAgentStatus(true);
    } catch (err: any) {
      setRunLogs(prev => [...prev, `[ERROR] Run failed: ${err.message}`]);
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
          <div className="status-dot pulsing"></div> Connecting to AI Agent Service...
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            
            {/* Agent Status Card */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1.5rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3>🤖 AI Reader Agent</h3>
                  <span style={{ fontSize: '0.8rem', display: 'inline-flex', gap: '0.4rem', alignItems: 'center', background: 'rgba(16,185,129,0.15)', color: 'var(--success)', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
                    <span className="status-dot pulsing"></span> Active
                  </span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Agent Wallet Address</span>
                    <div style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{status?.address}</div>
                  </div>
                  
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>USDC Faucet Balance</span>
                    <div style={{ fontSize: '2rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>${status?.balanceUsdc?.toFixed(6) || '0.000000'}</div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Budget Spent Today</span>
                    <div style={{ fontSize: '1.25rem', fontFamily: 'var(--font-mono)' }}>${status?.dailySpentUsdc?.toFixed(4)} / ${status?.dailyBudgetUsdc?.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              <button 
                className="btn btn-accent" 
                style={{ width: '100%' }}
                onClick={handleRunAgent}
                disabled={running}
              >
                {running ? 'Agent Running...' : '🚀 Trigger Autonomous Run Loop'}
              </button>
            </div>

            {/* Profile Settings Form */}
            <div className="glass-card">
              <h3>⚙️ Agent Preferences</h3>
              <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Reader Interests (Comma separated)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={interests}
                    onChange={(e) => setInterests(e.target.value)}
                    required
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Topics the agent evaluates articles for.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Max Price Limit per Article (USDC)</label>
                  <input
                    type="number"
                    step="0.001"
                    className="form-input"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Daily Spending Limit (USDC)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={dailyBudget}
                    onChange={(e) => setDailyBudget(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-secondary">
                  Save Preferences
                </button>
              </form>
            </div>

          </div>

          {/* Running Console logs terminal */}
          <div className="glass-card">
            <h3>🤖 Real-Time Execution Console</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Observe the agent's decision logic and EIP-3009 nanopayment signature generations as it completes its loop.
            </p>
            <div 
              ref={logTerminalRef}
              style={{ 
                background: '#040711', 
                border: '1px solid var(--border)', 
                borderRadius: '8px', 
                height: '300px', 
                overflowY: 'auto',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                padding: '1rem',
                color: '#22c55e',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.8)'
              }}
            >
              {runLogs.length > 0 ? (
                runLogs.map((logStr, i) => (
                  <div key={i} style={{ 
                    color: logStr.startsWith('[ERROR]') ? 'var(--error)' : 
                           logStr.includes('Decision: BUY') ? 'var(--accent)' : 
                           logStr.includes('Payment Succeeded!') ? '#fff' : '#22c55e' 
                  }}>
                    {logStr}
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', margin: 'auto' }}>
                  Terminal Idle. Click "Trigger Autonomous Run Loop" to boot the reader loop.
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
