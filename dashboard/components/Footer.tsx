'use client';

import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{ backgroundColor: '#000000', color: '#ffffff', padding: '2rem 0 2rem 0', marginTop: 'auto' }}>
      <div className="container" style={{ margin: '0 auto', padding: '0 2rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '3rem', marginBottom: '4rem' }}>
          
          {/* Column 1: Brand */}
          <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              <img src="/logo.png" alt="Inktoll Logo" style={{ height: '100px', objectFit: 'contain' }} />
            </Link>
            <p style={{ color: '#9ca3af', fontSize: '0.85rem', lineHeight: '1.6', maxWidth: '300px', marginTop: '0.5rem' }}>
              Monetizing AI data consumption through instant USDC nanopayments and citation royalties.
            </p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <a href="https://x.com/getinktoll" target="_blank" rel="noreferrer" style={{ color: '#9ca3af', textDecoration: 'none', transition: 'color 0.2s ease' }} onMouseOver={(e) => e.currentTarget.style.color='#ffffff'} onMouseOut={(e) => e.currentTarget.style.color='#9ca3af'}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="https://github.com/mrnetwork0001/Inktoll" target="_blank" rel="noreferrer" style={{ color: '#9ca3af', textDecoration: 'none', transition: 'color 0.2s ease' }} onMouseOver={(e) => e.currentTarget.style.color='#ffffff'} onMouseOut={(e) => e.currentTarget.style.color='#9ca3af'}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.022A9.606 9.606 0 0112 6.82c.85.004 1.705.114 2.504.336 1.909-1.29 2.747-1.022 2.747-1.022.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"/></svg>
              </a>
            </div>
          </div>

          {/* Column 2: Protocol */}
          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 style={{ color: '#ffffff', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Protocol</h4>
            <Link href="/" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.85rem', transition: 'color 0.2s ease' }} onMouseOver={(e) => e.currentTarget.style.color='#ffffff'} onMouseOut={(e) => e.currentTarget.style.color='#9ca3af'}>Features</Link>
            <Link href="/" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.85rem', transition: 'color 0.2s ease' }} onMouseOver={(e) => e.currentTarget.style.color='#ffffff'} onMouseOut={(e) => e.currentTarget.style.color='#9ca3af'}>AI-Shield</Link>
            <Link href="/creator/dashboard" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.85rem', transition: 'color 0.2s ease' }} onMouseOver={(e) => e.currentTarget.style.color='#ffffff'} onMouseOut={(e) => e.currentTarget.style.color='#9ca3af'}>Launch App</Link>
          </div>

          {/* Column 3: Ecosystem */}
          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 style={{ color: '#ffffff', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Ecosystem</h4>
            <a href="#" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.85rem', transition: 'color 0.2s ease' }} onMouseOver={(e) => e.currentTarget.style.color='#ffffff'} onMouseOut={(e) => e.currentTarget.style.color='#9ca3af'}>Circle Explorer</a>
            <a href="#" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.85rem', transition: 'color 0.2s ease' }} onMouseOver={(e) => e.currentTarget.style.color='#ffffff'} onMouseOut={(e) => e.currentTarget.style.color='#9ca3af'}>Arc Blockchain</a>
            <a href="#" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.85rem', transition: 'color 0.2s ease' }} onMouseOver={(e) => e.currentTarget.style.color='#ffffff'} onMouseOut={(e) => e.currentTarget.style.color='#9ca3af'}>Circle Wallets</a>
          </div>

          {/* Column 4: Resources */}
          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 style={{ color: '#ffffff', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Resources</h4>
            <a href="#" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.85rem', transition: 'color 0.2s ease' }} onMouseOver={(e) => e.currentTarget.style.color='#ffffff'} onMouseOut={(e) => e.currentTarget.style.color='#9ca3af'}>Docs</a>
            <a href="#" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.85rem', transition: 'color 0.2s ease' }} onMouseOver={(e) => e.currentTarget.style.color='#ffffff'} onMouseOut={(e) => e.currentTarget.style.color='#9ca3af'}>Contracts</a>
            <a href="#" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.85rem', transition: 'color 0.2s ease' }} onMouseOver={(e) => e.currentTarget.style.color='#ffffff'} onMouseOut={(e) => e.currentTarget.style.color='#9ca3af'}>Inktoll Router</a>
          </div>

        </div>


      </div>
    </footer>
  );
}
