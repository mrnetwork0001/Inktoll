'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<string>('managed'); // 'managed' | 'metamask' | 'passkey'
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    // Client-side initialization
    const storedAddress = localStorage.getItem('inktoll_connected_address');
    const storedType = localStorage.getItem('inktoll_wallet_type') || 'managed';
    if (storedAddress) {
      setWalletAddress(storedAddress);
    }
    setWalletType(storedType);

    // Listen to changes from other pages
    const handleStorageChange = () => {
      const addr = localStorage.getItem('inktoll_connected_address');
      const type = localStorage.getItem('inktoll_wallet_type') || 'managed';
      setWalletAddress(addr);
      setWalletType(type);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('wallet-changed', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('wallet-changed', handleStorageChange);
    };
  }, []);

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  const connectWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts[0]) {
          const addr = accounts[0];
          setWalletAddress(addr);
          setWalletType('metamask');
          localStorage.setItem('inktoll_connected_address', addr);
          localStorage.setItem('inktoll_wallet_type', 'metamask');
          window.dispatchEvent(new Event('wallet-changed'));
        }
      } catch (err: any) {
        console.error('Wallet connection failed:', err);
      }
    } else {
      alert('MetaMask extension not found. Please install MetaMask to connect your wallet.');
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setWalletType('managed');
    localStorage.removeItem('inktoll_connected_address');
    localStorage.setItem('inktoll_wallet_type', 'managed');
    window.dispatchEvent(new Event('wallet-changed'));
    setDropdownOpen(false);
  };

  const switchWalletType = (type: string) => {
    setWalletType(type);
    localStorage.setItem('inktoll_wallet_type', type);
    window.dispatchEvent(new Event('wallet-changed'));
    setDropdownOpen(false);
  };

  return (
    <header className="header">
      <div className="container header-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" className="logo-section" style={{ textDecoration: 'none' }}>
          <span>🔖</span> Inktoll
        </Link>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <nav>
            <ul className="nav-links" style={{ marginBottom: 0 }}>
              <li>
                <Link 
                  href="/creator/dashboard" 
                  className={`nav-link ${isActive('/creator') ? 'active' : ''}`}
                >
                  Creator Panel
                </Link>
              </li>
              <li>
                <Link 
                  href="/reader/feed" 
                  className={`nav-link ${isActive('/reader/feed') ? 'active' : ''}`}
                >
                  Reader Feed
                </Link>
              </li>
              <li>
                <Link 
                  href="/reader/ask" 
                  className={`nav-link ${isActive('/reader/ask') ? 'active' : ''}`}
                >
                  Ask Agent Q&A
                </Link>
              </li>
              <li>
                <Link 
                  href="/reader/setup" 
                  className={`nav-link ${isActive('/reader/setup') ? 'active' : ''}`}
                >
                  🤖 Agent Settings
                </Link>
              </li>
            </ul>
          </nav>

          {/* WALLET BUTTON & DROPDOWN */}
          <div style={{ position: 'relative' }}>
            {walletAddress ? (
              <button 
                className="btn btn-secondary" 
                style={{ 
                  fontSize: '0.85rem', 
                  padding: '0.5rem 1rem', 
                  minHeight: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: 0
                }}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <span style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: walletType === 'metamask' ? '#f5a623' : '#10b981'
                }}></span>
                {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
                <span style={{ fontSize: '0.7rem' }}>▼</span>
              </button>
            ) : (
              <button 
                className="btn btn-primary" 
                style={{ 
                  fontSize: '0.85rem', 
                  padding: '0.5rem 1rem', 
                  minHeight: '38px',
                  marginBottom: 0
                }}
                onClick={connectWallet}
              >
                🦊 Connect Wallet
              </button>
            )}

            {dropdownOpen && walletAddress && (
              <div 
                className="glass-card" 
                style={{ 
                  position: 'absolute', 
                  top: '45px', 
                  right: '0', 
                  width: '240px', 
                  padding: '1rem', 
                  zIndex: 200, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.75rem',
                  border: '1px solid var(--border-hover)'
                }}
              >
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Wallet Model:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <button 
                    style={{ 
                      textAlign: 'left', 
                      background: walletType === 'metamask' ? 'var(--bg-active)' : 'transparent',
                      color: walletType === 'metamask' ? 'var(--accent)' : 'var(--text-primary)',
                      border: 'none', 
                      padding: '0.4rem 0.6rem', 
                      cursor: 'pointer',
                      borderRadius: '6px',
                      fontSize: '0.85rem'
                    }}
                    onClick={() => switchWalletType('metamask')}
                  >
                    🦊 MetaMask (EVM EOA)
                  </button>
                  <button 
                    style={{ 
                      textAlign: 'left', 
                      background: walletType === 'passkey' ? 'var(--bg-active)' : 'transparent',
                      color: walletType === 'passkey' ? 'var(--success)' : 'var(--text-primary)',
                      border: 'none', 
                      padding: '0.4rem 0.6rem', 
                      cursor: 'pointer',
                      borderRadius: '6px',
                      fontSize: '0.85rem'
                    }}
                    onClick={() => switchWalletType('passkey')}
                  >
                    ⚜️ Circle Passkey (SCA)
                  </button>
                  <button 
                    style={{ 
                      textAlign: 'left', 
                      background: walletType === 'managed' ? 'var(--bg-active)' : 'transparent',
                      color: walletType === 'managed' ? 'var(--primary-light)' : 'var(--text-primary)',
                      border: 'none', 
                      padding: '0.4rem 0.6rem', 
                      cursor: 'pointer',
                      borderRadius: '6px',
                      fontSize: '0.85rem'
                    }}
                    onClick={() => switchWalletType('managed')}
                  >
                    🤖 Inktoll Managed (DCW)
                  </button>
                </div>
                
                <hr style={{ border: 'none', borderBottom: '1px solid var(--border)', margin: '0.25rem 0' }} />
                
                <button 
                  className="btn btn-secondary" 
                  style={{ 
                    padding: '0.4rem', 
                    fontSize: '0.8rem', 
                    minHeight: 'auto',
                    width: '100%',
                    marginBottom: 0
                  }}
                  onClick={disconnectWallet}
                >
                  Disconnect Wallet
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}

