'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { createPublicClient } from 'viem';
import { arcTestnet } from 'viem/chains';
import { toWebAuthnAccount, type WebAuthnAccount } from 'viem/account-abstraction';
import {
  WebAuthnMode,
  toCircleSmartAccount,
  toPasskeyTransport,
  toModularTransport,
  toWebAuthnCredential,
} from '@circle-fin/modular-wallets-core';
import { W3SSdk } from '@circle-fin/w3s-pw-web-sdk';

interface LoginResult {
  userToken: string;
  encryptionKey: string;
}

interface OtpTokens {
  deviceToken: string;
  deviceEncryptionKey: string;
  otpToken: string;
}

export default function Header() {
  const pathname = usePathname();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<string>('managed'); // 'managed' | 'metamask' | 'passkey'
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('inktoll_theme') || 'dark';
    setTheme(savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('inktoll_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // Email OTP States
  const sdkRef = React.useRef<W3SSdk | null>(null);
  const [authStep, setAuthStep] = useState<'options' | 'email_input' | 'otp_input' | 'creating'>('options');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [otpTokens, setOtpTokens] = useState<OtpTokens | null>(null);
  const [loginResult, setLoginResult] = useState<LoginResult | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState('');

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

    // Initialize W3S SDK for Email OTP
    const initSdk = async () => {
      try {
        const appId = process.env.NEXT_PUBLIC_CIRCLE_APP_ID;
        if (!appId || appId === 'PLACEHOLDER_APP_ID') return;

        const onLoginComplete = (error: unknown, result: unknown) => {
          if (error) {
            setEmailStatus('Login failed: ' + ((error as Error).message || 'Unknown error'));
            return;
          }
          const loginRes = result as LoginResult;
          setLoginResult(loginRes);
          localStorage.setItem('inktoll_userToken', loginRes.userToken);
          localStorage.setItem('inktoll_encryptionKey', loginRes.encryptionKey);
          setEmailStatus('Email verified! Initializing wallet...');
          // Trigger the next step automatically
          handleInitializeUser(loginRes.userToken);
        };

        if (sdkRef.current) return;

        const sdk = new W3SSdk({ appSettings: { appId } }, onLoginComplete);
        sdkRef.current = sdk;

        const storedDeviceId = localStorage.getItem('inktoll_deviceId');
        if (storedDeviceId) {
          setDeviceId(storedDeviceId);
        } else {
          const id = await sdk.getDeviceId();
          setDeviceId(id);
          localStorage.setItem('inktoll_deviceId', id);
        }

        const storedUserToken = localStorage.getItem('inktoll_userToken');
        const storedEncryptionKey = localStorage.getItem('inktoll_encryptionKey');
        if (storedUserToken && storedEncryptionKey) {
          setLoginResult({ userToken: storedUserToken, encryptionKey: storedEncryptionKey });
        }
      } catch (err) {
        console.error('Failed to init W3S Web SDK:', err);
      }
    };
    initSdk();

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

  const connectPasskey = async () => {
    try {
      setIsAuthenticating(true);
      const clientKey = process.env.NEXT_PUBLIC_CIRCLE_CLIENT_KEY as string;
      const clientUrl = process.env.NEXT_PUBLIC_CIRCLE_CLIENT_URL as string;
      
      if (!clientKey || !clientUrl) {
        throw new Error(`Missing Env vars! Key: ${!!clientKey}, URL: ${!!clientUrl}`);
      }

      const passkeyTransport = toPasskeyTransport(clientUrl, clientKey);
      const modularTransport = toModularTransport(`${clientUrl}/arcTestnet`, clientKey);
      
      const client = createPublicClient({
        chain: arcTestnet,
        transport: modularTransport,
      });

      // Try login first, fallback to register if it fails
      let credential;
      try {
        credential = await toWebAuthnCredential({
          transport: passkeyTransport,
          mode: WebAuthnMode.Login,
        });
      } catch (err: any) {
        if (err.name === 'NotAllowedError' || err.message.includes('not found')) {
          credential = await toWebAuthnCredential({
            transport: passkeyTransport,
            mode: WebAuthnMode.Register,
            username: 'InktollCreator_' + Math.floor(Math.random() * 10000),
          });
        } else {
          throw err;
        }
      }

      const account = await toCircleSmartAccount({
        client,
        owner: toWebAuthnAccount({ credential }) as WebAuthnAccount,
      });

      const addr = account.address;
      setWalletAddress(addr);
      setWalletType('passkey');
      localStorage.setItem('inktoll_connected_address', addr);
      localStorage.setItem('inktoll_wallet_type', 'passkey');
      window.dispatchEvent(new Event('wallet-changed'));
    } catch (err: any) {
      console.error('Passkey authentication failed:', err);
      alert('Passkey authentication failed: ' + err.message);
    } finally {
      setIsAuthenticating(false);
      setDropdownOpen(false);
    }
  };

  // -------------------------------------------------------------
  // EMAIL OTP FLOW
  // -------------------------------------------------------------
  const handleRequestOtp = async () => {
    if (!email || !email.includes('@')) {
      setEmailStatus('Please enter a valid email.');
      return;
    }
    setEmailStatus('Sending OTP...');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/wallet/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to request OTP');

      setOtpTokens({
        deviceToken: data.deviceToken,
        deviceEncryptionKey: data.deviceEncryptionKey,
        otpToken: data.otpToken,
      });

      sdkRef.current?.updateConfigs({
        appSettings: { appId: process.env.NEXT_PUBLIC_CIRCLE_APP_ID as string },
        loginConfigs: {
          deviceToken: data.deviceToken,
          deviceEncryptionKey: data.deviceEncryptionKey,
          otpToken: data.otpToken,
        },
      });
      setAuthStep('otp_input');
      setEmailStatus('');
    } catch (err: any) {
      setEmailStatus(err.message);
    }
  };

  const handleVerifyOtp = () => {
    if (!sdkRef.current || !otpTokens) return;
    setAuthStep('creating');
    setEmailStatus('Awaiting OTP verification in the Circle window...');
    sdkRef.current.verifyOtp();
  };

  const handleInitializeUser = async (uToken: string) => {
    try {
      setEmailStatus('Initializing user...');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/wallet/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userToken: uToken }),
      });
      const data = await response.json();

      if (data.code === 155106) {
        // User already initialized, we just need their wallet
        setEmailStatus('Welcome back! Wallet loaded.');
        setWalletAddress('Email-Wallet-Loaded'); // TODO: call listWallets
        setWalletType('managed');
        localStorage.setItem('inktoll_wallet_type', 'managed');
        setShowAuthModal(false);
        setAuthStep('options');
        return;
      }

      if (!response.ok) throw new Error(data.error || 'Failed to initialize user');
      
      handleCreateWallet(data.challengeId, uToken);
    } catch (err: any) {
      setEmailStatus(err.message);
    }
  };

  const handleCreateWallet = (cId: string, uToken: string) => {
    const sdk = sdkRef.current;
    if (!sdk || !cId) return;

    setEmailStatus('Creating wallet...');
    sdk.setAuthentication({
      userToken: uToken,
      encryptionKey: localStorage.getItem('inktoll_encryptionKey') as string,
    });

    sdk.execute(cId, (error) => {
      if (error) {
        setEmailStatus('Failed: ' + ((error as Error).message || 'Unknown error'));
        return;
      }
      setEmailStatus('Wallet Created Successfully!');
      setWalletAddress('New-Email-Wallet'); // TODO: call listWallets
      setWalletType('managed');
      localStorage.setItem('inktoll_wallet_type', 'managed');
      setShowAuthModal(false);
      setAuthStep('options');
    });
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
    if (type === 'passkey') {
      setShowAuthModal(true);
      setDropdownOpen(false);
      return;
    }
    setWalletType(type);
    localStorage.setItem('inktoll_wallet_type', type);
    window.dispatchEvent(new Event('wallet-changed'));
    setDropdownOpen(false);
  };

  return (
    <header className="header">
      <div className="container header-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" className="logo-section" style={{ textDecoration: 'none' }}>
          <img src={theme === 'dark' ? '/logo-dark.png' : '/logo.png'} alt="Inktoll Logo" style={{ height: '80px', objectFit: 'contain' }} />
        </Link>
        
        {/* Desktop Navigation Group */}
        <div className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <button 
            onClick={toggleTheme}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              borderRadius: '50%',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              marginBottom: 0
            }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {pathname !== '/' && (
            <nav>
              <ul className="nav-links" style={{ marginBottom: 0 }}>
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
                    Agent Settings
                  </Link>
                </li>
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
                    href="/leaderboard" 
                    className={`nav-link ${isActive('/leaderboard') ? 'active' : ''}`}
                  >
                    Leaderboard
                  </Link>
                </li>
              </ul>
            </nav>
          )}

          {/* WALLET BUTTON & DROPDOWN */}
          {pathname !== '/' && (
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
                    background: 'var(--primary)'
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
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  Connect Wallet
                </button>
              )}

              {dropdownOpen && (
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
                        color: walletType === 'metamask' ? 'var(--primary)' : 'var(--text-primary)',
                        border: 'none', 
                        padding: '0.4rem 0.6rem', 
                        cursor: 'pointer',
                        borderRadius: '6px',
                        fontSize: '0.85rem'
                      }}
                      onClick={connectWallet}
                    >
                      MetaMask (EVM EOA)
                    </button>
                    <button 
                      style={{ 
                        textAlign: 'left', 
                        background: walletType === 'passkey' ? 'var(--bg-active)' : 'transparent',
                        color: walletType === 'passkey' ? 'var(--primary)' : 'var(--text-primary)',
                        border: 'none', 
                        padding: '0.4rem 0.6rem', 
                        cursor: 'pointer',
                        borderRadius: '6px',
                        fontSize: '0.85rem'
                      }}
                      onClick={() => switchWalletType('passkey')}
                    >
                      Circle Wallet
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
          )}
        </div>

        {/* Mobile Navigation controls */}
        {pathname !== '/' && (
          <button 
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            )}
          </button>
        )}

        {/* Mobile Dropdown Panel Menu */}
        {pathname !== '/' && (
          <div className={`mobile-nav-menu ${mobileMenuOpen ? 'open' : ''}`}>
            <Link 
              href="/reader/feed" 
              className={`nav-link ${isActive('/reader/feed') ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Reader Feed
            </Link>
            <Link 
              href="/reader/ask" 
              className={`nav-link ${isActive('/reader/ask') ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Ask Agent Q&A
            </Link>
            <Link 
              href="/reader/setup" 
              className={`nav-link ${isActive('/reader/setup') ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Agent Settings
            </Link>
            <Link 
              href="/creator/dashboard" 
              className={`nav-link ${isActive('/creator') ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Creator Panel
            </Link>
            <Link 
              href="/leaderboard" 
              className={`nav-link ${isActive('/leaderboard') ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Leaderboard
            </Link>

            <button 
              onClick={toggleTheme}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                textAlign: 'left',
                marginTop: '0.5rem'
              }}
            >
              {theme === 'dark' ? '☀️ Switch to Light Mode' : '🌙 Switch to Dark Mode'}
            </button>

            <hr style={{ border: 'none', borderBottom: '1px solid var(--border)', margin: '0.5rem 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.25rem 0.75rem' }}>
              {walletAddress ? (
                <>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ 
                      width: '8px', 
                      height: '8px', 
                      borderRadius: '50%', 
                      background: 'var(--primary)'
                    }}></span>
                    Connected: {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)} ({walletType})
                  </div>
                  <button 
                    className="btn btn-secondary" 
                    style={{ width: '100%', minHeight: '38px', fontSize: '0.85rem', marginBottom: 0 }}
                    onClick={() => {
                      disconnectWallet();
                      setMobileMenuOpen(false);
                    }}
                  >
                    Disconnect Wallet
                  </button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    Connect Wallet options:
                  </div>
                  <button 
                    className="btn btn-secondary" 
                    style={{ width: '100%', minHeight: '38px', fontSize: '0.85rem', marginBottom: 0, justifyContent: 'flex-start' }}
                    onClick={() => {
                      connectWallet();
                      setMobileMenuOpen(false);
                    }}
                  >
                    MetaMask (EVM EOA)
                  </button>
                  <button 
                    className="btn btn-primary" 
                    style={{ width: '100%', minHeight: '38px', fontSize: '0.85rem', marginBottom: 0, justifyContent: 'flex-start' }}
                    onClick={() => {
                      switchWalletType('passkey');
                      setMobileMenuOpen(false);
                    }}
                  >
                    Circle Wallet (Passkey)
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CIRCLE AUTH MODAL */}
      {showAuthModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setShowAuthModal(false)}
        >
          <div 
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              width: '90%',
              maxWidth: '400px',
              padding: '2rem 1.5rem',
              position: 'relative',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              color: '#1a1a1a',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              onClick={() => setShowAuthModal(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'transparent',
                border: 'none',
                fontSize: '1.2rem',
                color: '#6b7280',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>

            {/* Icon */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 0L26.5 18.5L48 24L26.5 29.5L24 48L21.5 29.5L0 24L21.5 18.5L24 0Z" fill="currentColor" style={{color: '#2563eb'}} />
                <circle cx="24" cy="24" r="3" fill="#ffffff" />
              </svg>
            </div>

            {/* Headers */}
            <h2 style={{ textAlign: 'center', margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: '700' }}>
              Log in to Inktoll
            </h2>
            <p style={{ textAlign: 'center', color: '#6b7280', margin: '0 0 2rem 0', fontSize: '0.95rem' }}>
              Connect a wallet to hire agents and settle in USDC.
            </p>

            {/* Options List */}
            {authStep === 'options' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Email Option */}
                <button 
                  onClick={() => {
                    const appId = process.env.NEXT_PUBLIC_CIRCLE_APP_ID;
                    if (!appId || appId === 'PLACEHOLDER_APP_ID') {
                      alert('You must add your Circle App ID to .env.local first!');
                      return;
                    }
                    setAuthStep('email_input');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    padding: '1rem',
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                >
                  <div style={{ marginRight: '1rem', color: 'var(--primary)', background: '#eff6ff', padding: '0.6rem', borderRadius: '8px' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
                      <path d="M2 4l10 8 10-8"></path>
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '1rem', color: '#1f2937' }}>Email</div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>One-time code to your inbox. Gasless, no ...</div>
                  </div>
                  <div style={{ color: '#9ca3af' }}>›</div>
                </button>

                {/* Passkey Option */}
                <button 
                  onClick={() => {
                    setShowAuthModal(false);
                    connectPasskey();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    padding: '1rem',
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                >
                  <div style={{ marginRight: '1rem', color: 'var(--primary)', background: '#eff6ff', padding: '0.6rem', borderRadius: '8px' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '1rem', color: '#1f2937' }}>Passkey</div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Face ID or fingerprint on this device. Gasl...</div>
                  </div>
                  <div style={{ color: '#9ca3af' }}>›</div>
                </button>
              </div>
            )}

            {/* Email Input Step */}
            {authStep === 'email_input' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input 
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    fontSize: '1rem',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                />
                {emailStatus && <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{emailStatus}</div>}
                <button 
                  onClick={handleRequestOtp}
                  style={{
                    padding: '0.75rem',
                    background: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Send One-Time Passcode
                </button>
                <button onClick={() => setAuthStep('options')} style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.85rem' }}>
                  ← Back
                </button>
              </div>
            )}

            {/* OTP Verify Step */}
            {authStep === 'otp_input' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'center' }}>
                <p style={{ fontSize: '0.9rem', color: '#4b5563' }}>We sent an email to <b>{email}</b>. Please click Verify to enter the code.</p>
                {emailStatus && <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{emailStatus}</div>}
                <button 
                  onClick={handleVerifyOtp}
                  style={{
                    padding: '0.75rem',
                    background: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Verify Code
                </button>
              </div>
            )}

            {/* Creating Step */}
            {authStep === 'creating' && (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--primary)' }}>
                <p>{emailStatus}</p>
                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
                  <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeDasharray="30 30" strokeLinecap="round" opacity="0.3"></circle>
                    <path d="M12 2A10 10 0 0 1 22 12" stroke="currentColor" strokeWidth="4" strokeLinecap="round"></path>
                  </svg>
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid #f3f4f6', paddingTop: '1rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.05em', color: '#9ca3af', fontFamily: 'monospace' }}>
                GASLESS ON ARC • SECURED BY CIRCLE
              </span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

