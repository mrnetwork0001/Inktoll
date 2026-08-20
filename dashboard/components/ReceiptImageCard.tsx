'use client';

import React, { useEffect, useRef } from 'react';
import { X, Download, Share2 } from 'lucide-react';

interface ReceiptImageCardProps {
  receipt: {
    id: string;
    amount_usdc: number;
    payment_type: 'read' | 'citation';
    tx_hash: string;
    created_at: string;
    reader_agent_id: string;
    article_title: string;
    ghost_url: string;
    platform: string;
    platform_verified: boolean;
    creator_wallet: string;
    onchain: boolean;
  };
  onClose: () => void;
}

// Renders a downloadable 1200x675 branded receipt card. Pure client-side canvas
// drawing (same approach as ShareEarningsCard) — no extra dependencies.
export default function ReceiptImageCard({ receipt, onClose }: ReceiptImageCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isCitation = receipt.payment_type === 'citation';

  const hostOf = (urlStr: string) => {
    try {
      const u = new URL(urlStr);
      return u.hostname.replace(/^www\./, '');
    } catch {
      return urlStr;
    }
  };

  const agentName = (id: string) => {
    const seed = id?.startsWith('0x') ? id.substring(2, 6) : (id || '').replace(/^mcp-/, '').substring(0, 4);
    return `Agent_${seed.toUpperCase()}`;
  };

  const shortWallet = (w: string) => (w && w.length > 14 ? `${w.substring(0, 8)}…${w.substring(w.length - 6)}` : w);

  const formatWhen = (iso: string) => {
    const d = new Date(iso.includes('Z') || iso.includes('+') ? iso : iso + 'Z');
    return isNaN(d.getTime()) ? iso : d.toUTCString().replace('GMT', 'UTC');
  };

  const shareUrl = typeof window !== 'undefined' ? window.location.href : 'https://inktoll.xyz';
  const tweetText =
    `An AI agent just ${isCitation ? 'cited' : 'read'} "${receipt.article_title}" and paid the author ` +
    `$${Number(receipt.amount_usdc).toFixed(4)} USDC — settled gaslessly on @arc via @getinktoll. Verifiable receipt:`;
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareUrl)}`;

  const roundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  const truncateToWidth = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
    return t + '…';
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 1200;
    const H = 675;
    const accent = isCitation ? '#E4C17D' : '#FF8022';

    // Background
    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W / 2, H + 140, 60, W / 2, H + 140, 680);
    glow.addColorStop(0, 'rgba(255, 128, 34, 0.30)');
    glow.addColorStop(1, 'rgba(255, 128, 34, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Faint grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Card frame
    roundedRect(ctx, 40, 40, W - 80, H - 80, 26);
    ctx.fillStyle = 'rgba(18, 18, 18, 0.72)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 128, 34, 0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Wordmark
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FF8022';
    ctx.font = '700 30px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('🖋 inktoll', 84, 110);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = '400 17px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('USDC NANOPAYMENT RECEIPT', 232, 108);

    // Type pill (right aligned)
    const pillLabel = isCitation ? 'CITATION TOLL' : 'PAY-PER-READ';
    ctx.font = '700 16px "JetBrains Mono", monospace';
    const pillW = ctx.measureText(pillLabel).width + 36;
    roundedRect(ctx, W - 84 - pillW, 84, pillW, 38, 19);
    ctx.fillStyle = isCitation ? 'rgba(228, 193, 125, 0.14)' : 'rgba(255, 128, 34, 0.14)';
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.textAlign = 'center';
    ctx.fillText(pillLabel, W - 84 - pillW / 2, 109);

    // Amount
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('AMOUNT PAID TO THE AUTHOR', 84, 182);
    ctx.fillStyle = accent;
    ctx.font = '800 92px "JetBrains Mono", monospace';
    const amountText = `$${Number(receipt.amount_usdc).toFixed(4)}`;
    ctx.fillText(amountText, 80, 268);
    const amountW = ctx.measureText(amountText).width;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '700 30px "JetBrains Mono", monospace';
    ctx.fillText('USDC', 96 + amountW, 268);

    // Divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(84, 306);
    ctx.lineTo(W - 84, 306);
    ctx.stroke();

    // Detail rows
    const rows: [string, string][] = [
      ['ARTICLE', receipt.article_title],
      ['AUTHOR', hostOf(receipt.ghost_url) + (receipt.platform === 'paragraph' && receipt.platform_verified ? '  ✓ verified' : '')],
      ['PAYOUT WALLET', shortWallet(receipt.creator_wallet)],
      ['PAID BY', agentName(receipt.reader_agent_id) + '  (autonomous AI agent)'],
      ['SETTLED', formatWhen(receipt.created_at)],
    ];
    let y = 352;
    rows.forEach(([label, value]) => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
      ctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(label, 84, y);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.font = '500 21px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(truncateToWidth(ctx, value, W - 84 - 300), 300, y);
      y += 46;
    });

    // Settlement note
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '400 16px "Plus Jakarta Sans", sans-serif';
    const note = receipt.onchain
      ? 'Verified onchain on Arc L1 · gasless settlement'
      : 'Settled via Circle Gateway batching on Arc L1 · gasless';
    ctx.fillText(note, 84, y + 8);

    // Footer
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
    ctx.beginPath();
    ctx.moveTo(84, H - 96);
    ctx.lineTo(W - 84, H - 96);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = '500 17px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`Receipt #${receipt.id.substring(0, 18)}`, 84, H - 58);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#FF8022';
    ctx.font = '700 19px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('inktoll.xyz', W - 84, H - 58);
  }, [receipt, isCitation]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `inktoll-receipt-${receipt.id.substring(0, 8)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-card"
        style={{ maxWidth: '720px', width: '100%', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={17} style={{ color: 'var(--primary)' }} /> Receipt Card
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }}>
            <X size={19} />
          </button>
        </div>

        <canvas
          ref={canvasRef}
          width={1200}
          height={675}
          style={{ width: '100%', height: 'auto', borderRadius: '12px', border: '1px solid var(--border)' }}
        />

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={handleDownload} className="btn btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <Download size={15} /> Download PNG
          </button>
          <a href={tweetUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <Share2 size={15} /> Post on X
          </a>
        </div>
        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          Tip: download the card and attach it to your post — the receipt link goes in the text.
        </p>
      </div>
    </div>
  );
}
