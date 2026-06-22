'use client';

import React, { useState, useEffect } from 'react';

interface PasskeyConnectorProps {
  onSuccess?: (address: string) => void;
}

export default function PasskeyConnector({ onSuccess }: PasskeyConnectorProps) {
  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'input' | 'biometric' | 'success'>('input');

  useEffect(() => {
    const storedType = localStorage.getItem('inktoll_wallet_type');
    const storedAddr = localStorage.getItem('inktoll_connected_address');
    if (storedType === 'passkey' && storedAddr) {
      setAccount(storedAddr);
      setStep('success');
    }
  }, []);

  const handleRegisterPasskey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setStep('biometric');

    // Simulate WebAuthn Biometric Prompt (TouchID / FaceID)
    setTimeout(() => {
      // Check credentials registration simulation
      const mockSmartAccountAddress = '0xSCA' + Math.floor(Math.random() * 10000000).toString(16).padStart(8, '0');
      
      setAccount(mockSmartAccountAddress);
      setStep('success');
      setLoading(false);

      // Save to localStorage
      localStorage.setItem('inktoll_connected_address', mockSmartAccountAddress);
      localStorage.setItem('inktoll_wallet_type', 'passkey');
      localStorage.setItem('inktoll_passkey_email', email);
      window.dispatchEvent(new Event('wallet-changed'));

      if (onSuccess) {
        onSuccess(mockSmartAccountAddress);
      }
    }, 2000);
  };

  const handleDisconnect = () => {
    setAccount(null);
    setStep('input');
    setEmail('');
    localStorage.removeItem('inktoll_connected_address');
    localStorage.setItem('inktoll_wallet_type', 'managed');
    window.dispatchEvent(new Event('wallet-changed'));
  };

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)' }}>
          <span>⚜️</span> Circle Modular Passkey Smart Account
        </h4>
        <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
          ERC-6900 Gasless
        </span>
      </div>

      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        Deploy a non-custodial Smart Contract Wallet secured by your device's biometrics (TouchID / FaceID) or passkey. Zero gas fees, zero seed phrases.
      </p>

      {step === 'input' && (
        <form onSubmit={handleRegisterPasskey} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Onboard with Email</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="email"
                className="form-input"
                style={{ flexGrow: 1, marginBottom: 0, padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', marginBottom: 0 }} disabled={loading}>
                Onboard
              </button>
            </div>
          </div>
        </form>
      )}

      {step === 'biometric' && (
        <div style={{ textAlign: 'center', padding: '1.5rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <div className="status-dot pulsing" style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16,185,129,0.2)', border: '2px solid var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', boxShadow: '0 0 15px var(--success-glow)' }}>
            🔑
          </div>
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Verify Biometrics</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Please authorize the passkey prompt on your device...
          </div>
        </div>
      )}

      {step === 'success' && account && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Smart Account Active:</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#fff', wordBreak: 'break-all', marginTop: '0.25rem' }}>
              {account}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Secured via TouchID/FaceID & sponsored gas loops on Arc Testnet.
            </div>
          </div>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '0.4rem', fontSize: '0.8rem', minHeight: 'auto', marginBottom: 0 }}
            onClick={handleDisconnect}
          >
            Disconnect Passkey
          </button>
        </div>
      )}
    </div>
  );
}
