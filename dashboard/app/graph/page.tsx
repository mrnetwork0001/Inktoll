'use client';

import React, { useState, useEffect, useRef } from 'react';
import Header from '../../components/Header';
import { Network, Activity, BookOpen, Bot, PenTool, Zap } from 'lucide-react';

interface GraphCreator {
  id: string;
  ghost_url: string;
  wallet_address: string;
  articles_count: number;
  total_earnings: number;
}

interface GraphArticle {
  id: string;
  creator_id: string;
  ghost_slug: string;
  title: string;
  price_usdc: number;
  reads_count: number;
  citations_count: number;
  revenue: number;
}

interface GraphAgent {
  id: string;
  wallet_address: string | null;
  payments_count: number;
  total_spent: number;
  reads_count: number;
  citations_count: number;
}

interface GraphEdge {
  agent_id: string;
  article_id: string;
  payment_type: 'read' | 'citation';
  count: number;
  total_usdc: number;
  last_at: string;
}

interface RecentPayment {
  id: string;
  agent_id: string;
  article_id: string;
  payment_type: 'read' | 'citation';
  amount_usdc: number;
  created_at: string;
  article_title: string;
}

// Physics node used by the canvas simulation (kept outside React state)
interface SimNode {
  key: string;
  type: 'creator' | 'article' | 'agent';
  label: string;
  sub: string;
  radius: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  freq: number;
  data: any;
}

interface SimEdge {
  source: string;
  target: string;
  kind: 'ownership' | 'read' | 'citation';
  strength: number;
}

interface Pulse {
  source: string;
  target: string;
  start: number;
  duration: number;
  color: string;
  amount: number;
}

const NODE_COLORS: Record<string, string> = {
  creator: '#FF8022',
  article: '#E4C17D',
  agent: '#4ADE80',
};

export default function RoyaltyGraph() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [counts, setCounts] = useState({ creators: 0, articles: 0, agents: 0, payments: 0, volume: 0 });
  const [feed, setFeed] = useState<RecentPayment[]>([]);
  const [hovered, setHovered] = useState<{ node: SimNode; x: number; y: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Map<string, SimNode>>(new Map());
  const edgesRef = useRef<SimEdge[]>([]);
  const pulsesRef = useRef<Pulse[]>([]);
  const seenPaymentsRef = useRef<Set<string>>(new Set());
  const firstLoadRef = useRef(true);
  const dragRef = useRef<string | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

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

  const agentName = (agent: GraphAgent) => {
    const source = agent.wallet_address || agent.id || '';
    const seed = source.startsWith('0x') ? source.substring(2, 6) : source.substring(0, 4);
    return `Agent_${seed.toUpperCase()}`;
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso.includes('Z') || iso.includes('+') ? iso : iso + 'Z').getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const upsertNode = (key: string, node: Omit<SimNode, 'x' | 'y' | 'vx' | 'vy' | 'phase' | 'freq'>, anchor?: SimNode) => {
    const map = nodesRef.current;
    const existing = map.get(key);
    if (existing) {
      Object.assign(existing, node);
      return existing;
    }
    const canvas = canvasRef.current;
    const w = canvas ? canvas.clientWidth : 800;
    const h = canvas ? canvas.clientHeight : 600;
    // Spawn near the linked node (or center) so new nodes drift in organically
    const baseX = anchor ? anchor.x : w / 2;
    const baseY = anchor ? anchor.y : h / 2;
    const created: SimNode = {
      ...node,
      x: baseX + (Math.random() - 0.5) * 120,
      y: baseY + (Math.random() - 0.5) * 120,
      vx: 0,
      vy: 0,
      // Per-node rhythm for the perpetual drift/breathing animation
      phase: Math.random() * Math.PI * 2,
      freq: 0.4 + Math.random() * 0.6,
    };
    map.set(key, created);
    return created;
  };

  const fetchGraph = async () => {
    try {
      const res = await fetch(`${API_URL}/api/graph`);
      if (!res.ok) throw new Error('Failed to load graph data.');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load graph data.');

      const creators: GraphCreator[] = data.nodes.creators;
      const articles: GraphArticle[] = data.nodes.articles;
      const agents: GraphAgent[] = data.nodes.agents;
      const edges: GraphEdge[] = data.edges;
      const recent: RecentPayment[] = data.recent;

      creators.forEach((c) => {
        upsertNode(`c:${c.id}`, {
          key: `c:${c.id}`,
          type: 'creator',
          label: getDomainName(c.ghost_url),
          sub: `${c.articles_count} articles · $${Number(c.total_earnings).toFixed(4)} earned`,
          radius: Math.min(26, 14 + Math.sqrt(Number(c.total_earnings) * 1000) * 2),
          data: c,
        });
      });

      articles.forEach((a) => {
        const anchor = nodesRef.current.get(`c:${a.creator_id}`);
        upsertNode(`a:${a.id}`, {
          key: `a:${a.id}`,
          type: 'article',
          label: a.title.length > 28 ? a.title.substring(0, 27) + '…' : a.title,
          sub: `${a.reads_count} reads · ${a.citations_count} citations · $${Number(a.revenue).toFixed(4)}`,
          radius: Math.min(16, 7 + Math.sqrt(a.reads_count + a.citations_count) * 1.5),
          data: a,
        }, anchor);
      });

      agents.forEach((g) => {
        upsertNode(`g:${g.id}`, {
          key: `g:${g.id}`,
          type: 'agent',
          label: agentName(g),
          sub: `${g.reads_count} reads · ${g.citations_count} citations · $${Number(g.total_spent).toFixed(4)} spent`,
          radius: Math.min(20, 10 + Math.sqrt(Number(g.total_spent) * 1000)),
          data: g,
        });
      });

      const simEdges: SimEdge[] = [];
      articles.forEach((a) => {
        if (nodesRef.current.has(`c:${a.creator_id}`)) {
          simEdges.push({ source: `a:${a.id}`, target: `c:${a.creator_id}`, kind: 'ownership', strength: 1 });
        }
      });
      edges.forEach((e) => {
        if (nodesRef.current.has(`g:${e.agent_id}`) && nodesRef.current.has(`a:${e.article_id}`)) {
          simEdges.push({
            source: `g:${e.agent_id}`,
            target: `a:${e.article_id}`,
            kind: e.payment_type,
            strength: Math.min(3, e.count),
          });
        }
      });
      edgesRef.current = simEdges;

      // Fire money pulses for payments we have not seen yet (skip the initial page load)
      recent.forEach((p) => {
        if (seenPaymentsRef.current.has(p.id)) return;
        seenPaymentsRef.current.add(p.id);
        if (firstLoadRef.current) return;
        const now = performance.now();
        const color = p.payment_type === 'citation' ? '#E4C17D' : '#FF8022';
        pulsesRef.current.push({ source: `g:${p.agent_id}`, target: `a:${p.article_id}`, start: now, duration: 1200, color, amount: p.amount_usdc });
        const article = articles.find((a) => a.id === p.article_id);
        if (article) {
          pulsesRef.current.push({ source: `a:${p.article_id}`, target: `c:${article.creator_id}`, start: now + 1200, duration: 1200, color, amount: p.amount_usdc });
        }
      });
      firstLoadRef.current = false;

      setCounts({
        creators: creators.length,
        articles: articles.length,
        agents: agents.length,
        payments: edges.reduce((s, e) => s + Number(e.count), 0),
        volume: edges.reduce((s, e) => s + Number(e.total_usdc), 0),
      });
      setFeed(recent.slice(0, 8));
      setError('');
    } catch (err: any) {
      console.error('Error fetching graph:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
    const interval = setInterval(fetchGraph, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Canvas force simulation + render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    let raf = 0;
    let textColor = 'rgba(255,255,255,0.7)';
    let faintColor = 'rgba(255,255,255,0.1)';

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const refreshThemeColors = () => {
      const styles = getComputedStyle(document.documentElement);
      textColor = styles.getPropertyValue('--text-secondary').trim() || textColor;
      faintColor = styles.getPropertyValue('--border').trim() || faintColor;
    };
    refreshThemeColors();

    const tick = () => {
      frame++;
      if (frame % 60 === 0) refreshThemeColors();

      const now = performance.now();
      const tSec = now * 0.001;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const nodes = Array.from(nodesRef.current.values());
      const edges = edgesRef.current;

      // --- Physics ---
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let distSq = dx * dx + dy * dy;
          if (distSq < 1) { distSq = 1; dx = 1; dy = 0; }
          const dist = Math.sqrt(distSq);
          const repulse = 2600 / distSq;
          const fx = (dx / dist) * repulse;
          const fy = (dy / dist) * repulse;
          a.vx -= fx; a.vy -= fy;
          b.vx += fx; b.vy += fy;
        }
      }
      edges.forEach((e) => {
        const a = nodesRef.current.get(e.source);
        const b = nodesRef.current.get(e.target);
        if (!a || !b) return;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const ideal = e.kind === 'ownership' ? 90 : 150;
        const force = ((dist - ideal) / dist) * 0.02 * e.strength;
        a.vx += dx * force; a.vy += dy * force;
        b.vx -= dx * force; b.vy -= dy * force;
      });
      nodes.forEach((n) => {
        // Perpetual organic drift so the graph never freezes at equilibrium
        n.vx += Math.sin(tSec * n.freq + n.phase) * 0.018;
        n.vy += Math.cos(tSec * n.freq * 0.85 + n.phase * 1.3) * 0.018;
        // Gentle gravity toward center keeps disconnected clusters on screen
        n.vx += (w / 2 - n.x) * 0.0015;
        n.vy += (h / 2 - n.y) * 0.0015;
        if (dragRef.current === n.key) {
          n.x = mouseRef.current.x;
          n.y = mouseRef.current.y;
          n.vx = 0; n.vy = 0;
          return;
        }
        n.vx *= 0.85; n.vy *= 0.85;
        n.x += Math.max(-4, Math.min(4, n.vx));
        n.y += Math.max(-4, Math.min(4, n.vy));
        n.x = Math.max(n.radius, Math.min(w - n.radius, n.x));
        n.y = Math.max(n.radius, Math.min(h - n.radius, n.y));
      });

      // --- Draw ---
      ctx.clearRect(0, 0, w, h);

      edges.forEach((e) => {
        const a = nodesRef.current.get(e.source);
        const b = nodesRef.current.get(e.target);
        if (!a || !b) return;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        if (e.kind === 'citation') {
          ctx.strokeStyle = 'rgba(228, 193, 125, 0.5)';
          ctx.setLineDash([4, 4]);
          ctx.lineWidth = 1.2;
        } else if (e.kind === 'read') {
          ctx.strokeStyle = 'rgba(255, 128, 34, 0.35)';
          ctx.setLineDash([]);
          ctx.lineWidth = Math.min(2.5, 0.8 + e.strength * 0.5);
        } else {
          ctx.strokeStyle = faintColor;
          ctx.setLineDash([]);
          ctx.lineWidth = 1;
        }
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Continuous energy flow along edges — money visibly circulating at all times.
      // Read/citation dots travel agent -> article; ownership dots article -> creator.
      edges.forEach((e, i) => {
        const a = nodesRef.current.get(e.source);
        const b = nodesRef.current.get(e.target);
        if (!a || !b) return;
        const isOwnership = e.kind === 'ownership';
        const dots = isOwnership ? 1 : Math.min(3, Math.ceil(e.strength));
        const speed = isOwnership ? 0.05 : 0.11;
        const edgePhase = (i * 0.618) % 1;
        for (let d = 0; d < dots; d++) {
          const t = (tSec * speed + edgePhase + d / dots) % 1;
          const x = a.x + (b.x - a.x) * t;
          const y = a.y + (b.y - a.y) * t;
          ctx.beginPath();
          ctx.arc(x, y, isOwnership ? 1.2 : 1.8, 0, Math.PI * 2);
          ctx.fillStyle = e.kind === 'citation'
            ? 'rgba(228, 193, 125, 0.5)'
            : e.kind === 'read'
              ? 'rgba(255, 128, 34, 0.45)'
              : 'rgba(255, 255, 255, 0.16)';
          ctx.fill();
        }
      });

      // Money pulses travelling along edges
      pulsesRef.current = pulsesRef.current.filter((p) => now < p.start + p.duration);
      pulsesRef.current.forEach((p) => {
        if (now < p.start) return;
        const a = nodesRef.current.get(p.source);
        const b = nodesRef.current.get(p.target);
        if (!a || !b) return;
        const t = (now - p.start) / p.duration;
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      nodes.forEach((n) => {
        const color = NODE_COLORS[n.type];

        // Breathing halo on creators and agents
        if (n.type !== 'article') {
          const breath = 0.5 + 0.5 * Math.sin(tSec * 1.4 + n.phase);
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + 4 + breath * 4, 0, Math.PI * 2);
          ctx.strokeStyle = color + Math.round(24 + breath * 40).toString(16).padStart(2, '0');
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = color + '26';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = color;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(n.x, n.y, Math.max(2.5, n.radius * 0.35), 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        if (n.type !== 'article') {
          ctx.font = '11px "JetBrains Mono", monospace';
          ctx.fillStyle = textColor;
          ctx.textAlign = 'center';
          ctx.fillText(n.label, n.x, n.y + n.radius + 14);
        }
      });

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const pickNode = (mx: number, my: number) => {
      const nodes = Array.from(nodesRef.current.values());
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        const dx = mx - n.x;
        const dy = my - n.y;
        if (dx * dx + dy * dy <= (n.radius + 6) * (n.radius + 6)) return n;
      }
      return null;
    };

    const onMove = (ev: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = ev.clientX - rect.left;
      const my = ev.clientY - rect.top;
      mouseRef.current = { x: mx, y: my };
      const node = pickNode(mx, my);
      canvas.style.cursor = node ? 'grab' : 'default';
      setHovered(node ? { node, x: mx, y: my } : null);
    };
    const onDown = (ev: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const node = pickNode(ev.clientX - rect.left, ev.clientY - rect.top);
      if (node) dragRef.current = node.key;
    };
    const onUp = () => { dragRef.current = null; };

    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const isEmpty = !loading && counts.creators === 0 && counts.agents === 0;

  return (
    <>
      <Header />
      <main style={{ padding: '3rem 0' }}>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
            <h1 style={{ margin: 0, fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Network size={28} style={{ color: 'var(--primary)' }} />
              Knowledge Royalty Graph
            </h1>
            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)' }}>
              A live map of the machine-to-creator economy. Every read and citation pulses USDC from agent to article to author.
            </p>
          </div>

          {error && (
            <div style={{ padding: '1rem', background: 'var(--bg-active)', border: '1px solid var(--primary)', borderRadius: '8px', color: 'var(--primary)' }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>

            {/* Graph canvas */}
            <div className="card" style={{ flex: '3 1 560px', position: 'relative', padding: 0, overflow: 'hidden', minHeight: '620px' }}>
              <canvas ref={canvasRef} style={{ width: '100%', height: '620px', display: 'block' }} />

              {/* Live badge */}
              <div style={{ position: 'absolute', top: '1rem', left: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: '999px', padding: '4px 12px', fontSize: '0.75rem', color: 'var(--text-secondary)', backdropFilter: 'blur(8px)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ADE80', boxShadow: '0 0 8px #4ADE80', animation: 'pulse 2s infinite' }} />
                LIVE · refreshes every 5s
              </div>

              {/* Legend */}
              <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 14px', fontSize: '0.72rem', color: 'var(--text-secondary)', backdropFilter: 'blur(8px)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: NODE_COLORS.creator }} /> Creator</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: NODE_COLORS.article }} /> Article</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: NODE_COLORS.agent }} /> AI Agent</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 16, height: 2, background: 'rgba(255,128,34,0.6)' }} /> Read</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 16, height: 0, borderTop: '2px dashed rgba(228,193,125,0.8)' }} /> Citation</span>
              </div>

              {/* Hover tooltip */}
              {hovered && (
                <div style={{ position: 'absolute', left: Math.min(hovered.x + 16, 9999), top: hovered.y + 16, pointerEvents: 'none', background: 'var(--bg-secondary)', border: '1px solid var(--border-hover)', borderRadius: '8px', padding: '10px 14px', maxWidth: '260px', boxShadow: 'var(--shadow-soft)', zIndex: 5 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: NODE_COLORS[hovered.node.type], marginBottom: 2 }}>
                    {hovered.node.type === 'creator' ? 'CREATOR' : hovered.node.type === 'article' ? 'ARTICLE' : 'AI READER AGENT'}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                    {hovered.node.type === 'article' ? hovered.node.data.title : hovered.node.label}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                    {hovered.node.sub}
                  </div>
                </div>
              )}

              {isEmpty && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: 'var(--text-secondary)' }}>
                  <Network size={40} style={{ opacity: 0.4 }} />
                  <p style={{ margin: 0 }}>No payments yet — the graph lights up as agents read and cite articles.</p>
                </div>
              )}
            </div>

            {/* Side panel */}
            <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              <div className="card" style={{ padding: '1.25rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <Zap size={16} style={{ color: 'var(--primary)' }} /> Economy Totals
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>${counts.volume.toFixed(4)}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>USDC Routed</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{counts.payments}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Nanopayments</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: NODE_COLORS.creator }}>{counts.creators}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Creators</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: NODE_COLORS.agent }}>{counts.agents}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>AI Agents</div>
                  </div>
                </div>
              </div>

              <div className="card" style={{ padding: '1.25rem', flex: 1 }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <Activity size={16} style={{ color: 'var(--primary)' }} /> Live Royalty Stream
                </h3>
                {feed.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Waiting for the first payment…</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {feed.map((p) => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                        {p.payment_type === 'citation'
                          ? <PenTool size={15} style={{ color: NODE_COLORS.article, marginTop: 2, flexShrink: 0 }} />
                          : <BookOpen size={15} style={{ color: NODE_COLORS.creator, marginTop: 2, flexShrink: 0 }} />}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <Bot size={11} style={{ display: 'inline', verticalAlign: '-1px', color: NODE_COLORS.agent }} />{' '}
                            {p.payment_type === 'citation' ? 'cited' : 'read'} <strong>{p.article_title}</strong>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            +${Number(p.amount_usdc).toFixed(4)} USDC · {timeAgo(p.created_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </main>
    </>
  );
}
