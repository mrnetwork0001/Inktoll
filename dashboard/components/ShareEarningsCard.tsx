'use client';

import React, { useEffect, useRef } from 'react';
import { X, Download, Share2 } from 'lucide-react';

interface ShareEarningsCardProps {
  earnings: number;
  reads: number;
  citations: number;
  onClose: () => void;
}

// Renders a downloadable 1200x675 "AI Paid Me" card and an X share-intent link.
// Pure client-side: canvas drawing only, no network calls.
export default function ShareEarningsCard({ earnings, reads, citations, onClose }: ShareEarningsCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const tweetText =
    `My writing has earned $${earnings.toFixed(6)} USDC paid by autonomous AI agents on @getinktoll — ` +
    `${reads} pay-per-read unlocks + ${citations} citation royalties.\n\n` +
    `The first economy where AI pays its sources. 🖋️\n\nhttps://x.com/getinktoll`;
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

  const roundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 1200;
    const H = 675;

    // Background void + warm glow
    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W / 2, H + 150, 60, W / 2, H + 150, 700);
    glow.addColorStop(0, 'rgba(255, 106, 0, 0.35)');
    glow.addColorStop(1, 'rgba(255, 106, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Faint grid for a technical feel
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 60) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y <= H; y += 60) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Card frame
    roundedRect(ctx, 40, 40, W - 80, H - 80, 28);
    ctx.strokeStyle = 'rgba(255, 128, 34, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    roundedRect(ctx, 40, 40, W - 80, H - 80, 28);
    ctx.fillStyle = 'rgba(18, 18, 18, 0.7)';
    ctx.fill();

    // Wordmark
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FF8022';
    ctx.font = '700 34px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('🖋 inktoll', 90, 122);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = '400 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('THE AI KNOWLEDGE ECONOMY', 232, 120);

    // Headline
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '600 30px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('AUTONOMOUS AI AGENTS PAID ME', 90, 218);

    // The number
    ctx.fillStyle = '#FF8022';
    ctx.font = '800 104px "JetBrains Mono", monospace';
    ctx.fillText(`$${earnings.toFixed(6)}`, 84, 330);
    ctx.fillStyle = '#E4C17D';
    ctx.font = '700 42px "JetBrains Mono", monospace';
    ctx.fillText('USDC', 90 + ctx.measureText(' ').width + measureEarnings(ctx, earnings), 330);

    // Breakdown chips
    const chips = [
      `📖  ${reads} pay-per-read unlocks`,
      `✒️  ${citations} citation royalties`,
    ];
    let chipX = 90;
    chips.forEach((chip) => {
      ctx.font = '600 26px "Plus Jakarta Sans", sans-serif';
      const w = ctx.measureText(chip).width + 48;
      roundedRect(ctx, chipX, 380, w, 58, 29);
      ctx.fillStyle = 'rgba(255, 128, 34, 0.12)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 128, 34, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillText(chip, chipX + 24, 418);
      chipX += w + 20;
    });

    // Tagline
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'italic 600 32px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('“Readers pay once. Creators earn forever.”', 90, 512);

    // Footer
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(90, 556);
    ctx.lineTo(W - 90, 556);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '500 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Gasless USDC nanopayments · settled on Arc L1 · powered by Circle', 90, 596);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#FF8022';
    ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('@getinktoll', W - 90, 596);
  }, [earnings, reads, citations]);

  // Width of the rendered earnings figure so the USDC suffix sits right after it
  const measureEarnings = (ctx: CanvasRenderingContext2D, value: number) => {
    const prev = ctx.font;
    ctx.font = '800 104px "JetBrains Mono", monospace';
    const w = ctx.measureText(`$${value.toFixed(6)}`).width;
    ctx.font = prev;
    return w + 24;
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'inktoll-earnings.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-card"
        style={{ maxWidth: '760px', width: '100%', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Share2 size={18} style={{ color: 'var(--primary)' }} /> Share Your AI Earnings
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }}
          >
            <X size={20} />
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
            <Download size={16} /> Download PNG
          </button>
          <a
            href={tweetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textDecoration: 'none' }}
          >
            <Share2 size={16} /> Post on X
          </a>
        </div>
        <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          Tip: download the card and attach it to the pre-filled post for maximum reach.
        </p>
      </div>
    </div>
  );
}
