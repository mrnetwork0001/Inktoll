'use client';

import React, { useState, useEffect, useRef } from 'react';
import Header from '../../../components/Header';
import PasskeyConnector from '../../../components/PasskeyConnector';

export default function ReaderSetup() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Settings Form State
  const [interests, setInterests] = useState('');
  const [maxPrice, setMaxPrice] = useState('0.05');
  const [dailyBudget, setDailyBudget] = useState('1.00');
  
  // Wallet custody model states
  const [custodyType, setCustodyType] = useState<string>('managed');
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);

  useEffect(() => {
    // Sync storage values
    const storedType = localStorage.getItem('inktoll_wallet_type') || 'managed';
    const storedAddr = localStorage.getItem('inktoll_connected_address');
    setCustodyType(storedType);
    setConnectedAddress(storedAddr);

    const handleWalletChange = () => {
      const t = localStorage.getItem('inktoll_wallet_type') || 'managed';
      const a = localStorage.getItem('inktoll_connected_address');
      setCustodyType(t);
      setConnectedAddress(a);
    };

    window.addEventListener('wallet-changed', handleWalletChange);
    return () => window.removeEventListener('wallet-changed', handleWalletChange);
  }, []);

  const handleCustodyChange = (type: string, optAddress?: string) => {
    setCustodyType(type);
    localStorage.setItem('inktoll_wallet_type', type);
    if (type === 'managed') {
      localStorage.removeItem('inktoll_connected_address');
    } else if (optAddress) {
      localStorage.setItem('inktoll_connected_address', optAddress);
    }
    window.dispatchEvent(new Event('wallet-changed'));
  };
  
  // Running loop state
  const [running, setRunning] = useState(false);
  const [runLogs, setRunLogs] = useState<string[]>([]);
  const logTerminalRef = useRef<HTMLDivElement>(null);

  const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:3002';

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

  const fetchAgentStatus = async (silent = false) => {
    try {
      const res = await fetch(`${AGENT_URL}/api/agent/status`, {
        headers: { 'x-user-id': getUserId() }
      });
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
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': getUserId() 
        },
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
        headers: { 'x-user-id': getUserId() }
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
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', justifyContent: 'space-between' }}>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', wordBreak: 'break-all', background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px', flexGrow: 1, border: '1px solid var(--border)' }}>
                        {status?.address}
                      </div>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto', marginBottom: 0 }}
                        onClick={() => {
                          navigator.clipboard.writeText(status?.address || '');
                          alert('Address copied to clipboard!');
                        }}
                      >
                        📋
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {status?.address && (
                      <div style={{ background: '#fff', padding: '0.5rem', borderRadius: '8px', display: 'inline-flex', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${status.address}`}
                          alt="Wallet QR Code"
                          width={100}
                          height={100}
                          style={{ display: 'block' }}
                        />
                      </div>
                    )}
                    <div style={{ flexGrow: 1 }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Agent Wallet USDC Balance</span>
                      <div style={{ fontSize: '2rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)' }}>
                        ${status?.balanceUsdc?.toFixed(6) || '0.000000'}
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Arc Testnet
                      </span>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Budget Spent Today</span>
                    <div style={{ fontSize: '1.15rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                      ${status?.dailySpentUsdc?.toFixed(4)} <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>/ ${status?.dailyBudgetUsdc?.toFixed(2)} limit</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
                <button 
                  className="btn btn-accent" 
                  style={{ flexGrow: 1, marginBottom: 0 }}
                  onClick={handleRunAgent}
                  disabled={running}
                >
                  {running ? 'Running...' : '🚀 Start Loop'}
                </button>
              </div>
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

            {/* Wallet Custody Card */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3>⚜️ Wallet Custody Model</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Choose how your autonomous reader agent signs and pays article tolls.
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.75rem', 
                    padding: '0.75rem', 
                    borderRadius: '8px', 
                    border: '1px solid var(--border)', 
                    cursor: 'pointer',
                    background: custodyType === 'managed' ? 'rgba(0,115,195,0.05)' : 'transparent',
                    borderColor: custodyType === 'managed' ? 'var(--primary)' : 'var(--border)'
                  }}>
                    <input 
                      type="radio" 
                      name="custody" 
                      value="managed" 
                      checked={custodyType === 'managed'}
                      onChange={() => handleCustodyChange('managed')}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>🤖 Inktoll Managed (Circle DCW)</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Background payments without prompts. Ideal for run loops.</div>
                    </div>
                  </label>

                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.75rem', 
                    padding: '0.75rem', 
                    borderRadius: '8px', 
                    border: '1px solid var(--border)', 
                    cursor: 'pointer',
                    background: custodyType === 'metamask' ? 'rgba(245,166,35,0.05)' : 'transparent',
                    borderColor: custodyType === 'metamask' ? 'var(--accent)' : 'var(--border)'
                  }}>
                    <input 
                      type="radio" 
                      name="custody" 
                      value="metamask" 
                      checked={custodyType === 'metamask'}
                      onChange={() => handleCustodyChange('metamask')}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>🦊 Browser Wallet (MetaMask)</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Direct signature verification from your browser extension.</div>
                    </div>
                  </label>

                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.75rem', 
                    padding: '0.75rem', 
                    borderRadius: '8px', 
                    border: '1px solid var(--border)', 
                    cursor: 'pointer',
                    background: custodyType === 'passkey' ? 'rgba(16,185,129,0.05)' : 'transparent',
                    borderColor: custodyType === 'passkey' ? 'var(--success)' : 'var(--border)'
                  }}>
                    <input 
                      type="radio" 
                      name="custody" 
                      value="passkey" 
                      checked={custodyType === 'passkey'}
                      onChange={() => handleCustodyChange('passkey')}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>⚜️ Device Passkey (Smart Account)</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Non-custodial biometrics. Gas-abstracted smart wallet.</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Show Passkey Connector registration if passkey selected */}
              {custodyType === 'passkey' && (
                <PasskeyConnector 
                  onSuccess={(addr) => {
                    handleCustodyChange('passkey', addr);
                  }}
                />
              )}

              {/* Show MetaMask Connect helper if browser wallet selected but none connected */}
              {custodyType === 'metamask' && !connectedAddress && (
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', border: '1px solid var(--accent)' }}>
                  <h4 style={{ margin: 0 }}>🦊 MetaMask Required</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Please click "Connect Wallet" at the top right header to link your MetaMask or EVM account.
                  </p>
                </div>
              )}
            </div>

          </div>

          {/* Running Console logs timeline */}
          <div className="glass-card">
            <h3 style={{ marginBottom: '0.5rem' }}>🤖 Live Execution Timeline</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Observe the agent's decision logic and EIP-3009 nanopayment signature generations as it completes its loop.
            </p>
            
            <div 
              ref={logTerminalRef}
              style={{ 
                maxHeight: '400px', 
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                padding: '0.5rem 1rem',
                borderLeft: '2px solid rgba(255,255,255,0.05)',
                marginLeft: '10px'
              }}
            >
              {runLogs.length > 0 ? (
                runLogs.map((logStr, idx) => {
                  let type = 'info';
                  let icon = 'ℹ️';
                  let color = 'var(--text-secondary)';
                  let text = logStr;

                  if (logStr.startsWith('[Client]')) {
                    type = 'client';
                    icon = '💻';
                    color = 'var(--primary-light)';
                    text = logStr.replace('[Client]', '').trim();
                  } else if (logStr.startsWith('[ERROR]')) {
                    type = 'error';
                    icon = '❌';
                    color = 'var(--error)';
                    text = logStr.replace('[ERROR]', '').trim();
                  } else if (logStr.includes('Evaluating article:')) {
                    type = 'eval';
                    icon = '🔍';
                    color = '#a5b4fc';
                    text = logStr.replace('[Agent Run]', '').trim();
                  } else if (logStr.includes('Decision: BUY')) {
                    type = 'buy';
                    icon = '🪙';
                    color = 'var(--accent)';
                    text = logStr.replace('[Agent Run]', '').trim();
                  } else if (logStr.includes('Decision: SKIP')) {
                    type = 'skip';
                    icon = '⏩';
                    color = 'var(--text-muted)';
                    text = logStr.replace('[Agent Run]', '').trim();
                  } else if (logStr.includes('Payment Succeeded!')) {
                    type = 'success';
                    icon = '✅';
                    color = 'var(--success)';
                    text = logStr.replace('[Agent Run]', '').trim();
                  } else if (logStr.includes('Summary compiled:')) {
                    type = 'summary';
                    icon = '📝';
                    color = '#34d399';
                    text = logStr.replace('[Agent Run]', '').trim();
                  } else if (logStr.startsWith('[Agent Run]')) {
                    type = 'agent';
                    icon = '🤖';
                    color = 'var(--primary-light)';
                    text = logStr.replace('[Agent Run]', '').trim();
                  }

                  const isTech = logStr.includes('nonce') || logStr.includes('signature') || logStr.includes('EIP-3009') || logStr.includes('Tx Hash:') || logStr.includes('Recipient');

                  return (
                    <div 
                      key={idx} 
                      style={{ 
                        display: 'flex', 
                        gap: '1rem', 
                        position: 'relative',
                        alignItems: 'start'
                      }}
                    >
                      {/* Circle Node on line */}
                      <div 
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: 'rgba(17, 24, 39, 0.9)',
                          border: `2px solid ${color}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.9rem',
                          zIndex: 2,
                          flexShrink: 0,
                          boxShadow: idx === runLogs.length - 1 ? `0 0 10px ${color}` : 'none'
                        }}
                      >
                        {icon}
                      </div>

                      {/* Step Card Content */}
                      <div 
                        className="glass-card" 
                        style={{ 
                          flexGrow: 1, 
                          padding: '0.75rem 1rem', 
                          margin: 0,
                          background: idx === runLogs.length - 1 ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.01)',
                          border: idx === runLogs.length - 1 ? '1px solid rgba(255,255,255,0.15)' : '1px solid var(--border)'
                        }}
                      >
                        <div style={{ color: color, fontSize: '0.9rem', fontWeight: 500 }}>
                          {text}
                        </div>
                        
                        {isTech && (
                          <pre 
                            style={{ 
                              marginTop: '0.5rem', 
                              fontSize: '0.75rem', 
                              background: '#040711', 
                              padding: '0.5rem', 
                              borderRadius: '4px', 
                              overflowX: 'auto',
                              fontFamily: 'var(--font-mono)',
                              color: 'var(--text-muted)'
                            }}
                          >
                            {logStr}
                          </pre>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', margin: '3rem auto' }}>
                  Timeline Idle. Click "Start Loop" above to run the AI Reader agent.
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
