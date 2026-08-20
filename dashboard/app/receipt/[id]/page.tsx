'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '../../../components/Header';
import { BookOpen, PenTool, BadgeCheck, ExternalLink, Copy, Share2, Bot, ReceiptText, Clock, X } from 'lucide-react';
import { useNotification } from '../../../components/NotificationProvider';

interface Receipt {
  id: string;
  amount_usdc: number;
  payment_type: 'read' | 'citation';
  tx_hash: string;
  status: string;
  created_at: string;
  reader_agent_id: string;
  article_title: string;
  ghost_slug: string;
  ghost_url: string;
  platform: string;
  platform_verified: boolean;
  creator_wallet: string;
  onchain: boolean;
  explorerUrl: string | null;
}

export default function ReceiptPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useNotification();

  const handleClose = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/graph');
    }
  };
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const getDomainName = (urlStr: string) => {
    try {
      const url = new URL(urlStr);
      let name = url.hostname;
      if (name.startsWith('www.')) name = name.substring(4);
      return name;
    } catch {
      return urlStr;
    }
  };

  useEffect(() => {
    if (!params?.id) return;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/receipts/${encodeURIComponent(params.id)}`);
        if (res.status === 404) throw new Error('No receipt exists with this ID.');
        if (!res.ok) throw new Error('Failed to load the receipt.');
        const data = await res.json();
        setReceipt(data.receipt);
      } catch (err: any) {
        setError(err.message || 'Failed to load the receipt.');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id]);

  const agentName = (id: string) => {
    const seed = id?.startsWith('0x') ? id.substring(2, 6) : (id || '').replace(/^mcp-/, '').substring(0, 4);
    return `Agent_${seed.toUpperCase()}`;
  };

  const formatWhen = (iso: string) => {
    const d = new Date(iso.includes('Z') || iso.includes('+') ? iso : iso + 'Z');
    return isNaN(d.getTime()) ? iso : d.toUTCString();
  };

  const isCitation = receipt?.payment_type === 'citation';
  const shareText = receipt
    ? `An AI agent just ${isCitation ? 'cited' : 'read'} "${receipt.article_title}" and paid the author $${Number(receipt.amount_usdc).toFixed(4)} USDC — settled gaslessly on @arc via @getinktoll. Verifiable receipt:`
    : '';

  return (
    <>
      <Header />
      <main style={{ padding: '2rem 0' }}>
        <div className="container" style={{ maxWidth: '480px' }}>

          {loading && (
            <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              Loading receipt…
            </div>
          )}

          {!loading && error && (
            <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
              <ReceiptText size={36} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>⚠️ {error}</p>
            </div>
          )}

          {!loading && receipt && (
            <div className="glass-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>

              {/* Close */}
              <button
                onClick={handleClose}
                title="Close receipt"
                style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '5px', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', outline: 'none' }}
              >
                <X size={16} />
              </button>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', paddingRight: '2rem' }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ReceiptText size={17} style={{ color: 'var(--primary)' }} /> USDC Nanopayment Receipt
                  </h1>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>#{receipt.id}</span>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.62rem', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', whiteSpace: 'nowrap', background: isCitation ? 'rgba(228, 193, 125, 0.15)' : 'var(--primary-glow)', color: isCitation ? '#E4C17D' : 'var(--primary)' }}>
                  {isCitation ? <><PenTool size={11} /> CITATION TOLL</> : <><BookOpen size={11} /> PAY-PER-READ</>}
                </span>
              </div>

              {/* Amount */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.9rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>
                  ${Number(receipt.amount_usdc).toFixed(4)}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>USDC · paid by an autonomous AI agent</div>
              </div>

              {/* Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Article</span>
                  <span style={{ color: 'var(--text-primary)', textAlign: 'right', fontWeight: 600 }}>{receipt.article_title}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Author</span>
                  <span style={{ color: 'var(--text-primary)', textAlign: 'right', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    {getDomainName(receipt.ghost_url)}
                    {receipt.platform === 'paragraph' && receipt.platform_verified && (
                      <span title="Verified Paragraph Author" style={{ color: '#10b981', display: 'inline-flex' }}><BadgeCheck size={14} /></span>
                    )}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Author payout wallet</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{receipt.creator_wallet}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Paid by</span>
                  <span style={{ color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Bot size={14} style={{ color: '#4ADE80' }} /> {agentName(receipt.reader_agent_id)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Timestamp</span>
                  <span style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Clock size={13} /> {formatWhen(receipt.created_at)}
                  </span>
                </div>
              </div>

              {/* Settlement proof */}
              <div style={{ background: 'rgba(255, 128, 34, 0.05)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem 1.25rem' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Settlement</div>
                {receipt.onchain && receipt.explorerUrl ? (
                  <a href={receipt.explorerUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none' }}>
                    <ExternalLink size={14} /> Verify on Arcscan
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                      {receipt.tx_hash.substring(0, 10)}…{receipt.tx_hash.substring(56)}
                    </span>
                  </a>
                ) : (
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Settled off-chain via <strong>Circle Gateway</strong> — nanopayments are batched and net-settled on Arc L1 to stay gasless.
                  </span>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    showToast('Receipt link copied!', 'success');
                  }}
                >
                  <Copy size={15} /> Copy Link
                </button>
                <a
                  className="btn btn-primary"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textDecoration: 'none' }}
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Share2 size={15} /> Share on X
                </a>
              </div>

              <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Every payment on Inktoll has a public receipt. Don't trust the graph — audit it.
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
