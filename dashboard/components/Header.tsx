'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="header">
      <div className="container header-container">
        <Link href="/" className="logo-section">
          <span>🔖</span> Inktoll
        </Link>
        <nav>
          <ul className="nav-links">
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
      </div>
    </header>
  );
}
