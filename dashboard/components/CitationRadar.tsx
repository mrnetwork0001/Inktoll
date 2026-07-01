import React, { useEffect, useState } from 'react';

export interface CitationNode {
  title: string;
  similarity: number;
  amount: number;
}

export interface CitationRadarProps {
  citations: CitationNode[];
}

export default function CitationRadar({ citations }: CitationRadarProps) {
  const [dots, setDots] = useState<any[]>([]);

  useEffect(() => {
    // Generate positions for cited articles
    const angleStep = (2 * Math.PI) / Math.max(citations.length, 1);
    const newDots = citations.map((cit, index) => {
      const angle = angleStep * index - Math.PI / 2; // start from top
      const distance = 100; // Radius distance from center
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;

      return {
        ...cit,
        x,
        y,
      };
    });
    setDots(newDots);
  }, [citations]);

  if (!citations || citations.length === 0) return null;

  return (
    <div 
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '1.5rem',
        margin: '1rem 0',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.8)'
      }}
    >
      {/* Dynamic scanline element */}
      <div 
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '300px',
          height: '300px',
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          border: '1px solid rgba(0, 115, 195, 0.1)',
          pointerEvents: 'none',
        }}
      >
        {/* Concentric rings */}
        <div style={{ position: 'absolute', top: '25px', left: '25px', right: '25px', bottom: '25px', borderRadius: '50%', border: '1px dashed rgba(0, 115, 195, 0.15)' }} />
        <div style={{ position: 'absolute', top: '75px', left: '75px', right: '75px', bottom: '75px', borderRadius: '50%', border: '1px solid rgba(0, 115, 195, 0.1)' }} />
        <div style={{ position: 'absolute', top: '115px', left: '115px', right: '115px', bottom: '115px', borderRadius: '50%', border: '1px dashed rgba(0, 115, 195, 0.2)' }} />
        
        {/* Rotating sweep line */}
        <div 
          style={{
            position: 'absolute',
            top: '0',
            left: '50%',
            width: '2px',
            height: '150px',
            background: 'var(--primary), var(--primary-glow))',
            transformOrigin: 'bottom center',
            animation: 'radar-sweep 4s linear infinite',
          }}
        />
      </div>

      <style>{`
        @keyframes radar-sweep {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes money-float {
          0% {
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translate(var(--target-x), var(--target-y)) scale(1);
            opacity: 0;
          }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.9); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', zIndex: 2, position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', animation: 'pulse-ring 1.5s ease-out infinite' }} />
            SEMANTIC RADAR SCAN
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Cosine similarity threshold: 0.55
          </span>
        </div>

        {/* Visual Canvas Area */}
        <div 
          style={{ 
            height: '240px', 
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.03)',
            borderRadius: '8px',
            background: 'rgba(0,0,0,0.4)',
            overflow: 'hidden'
          }}
        >
          {/* CENTER NODE (Question) */}
          <div 
            style={{
              position: 'absolute',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary-glow) 0%, var(--primary-dark) 100%)',
              border: '2px solid var(--primary-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              boxShadow: '0 0 15px var(--primary)',
              zIndex: 10
            }}
          >
            ❓
          </div>

          {/* CITATION DESTINATION NODES */}
          {dots.map((dot, idx) => (
            <div 
              key={idx}
              style={{
                position: 'absolute',
                transform: `translate(${dot.x}px, ${dot.y}px)`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.25rem',
                zIndex: 8
              }}
            >
              <div 
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary-glow) 0%, var(--primary-dark) 100%)',
                  border: '1px solid var(--accent-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  boxShadow: '0 0 8px var(--primary)',
                  position: 'relative'
                }}
              >
                📝
                {/* Micro-pulsing ripple behind nodes */}
                <div 
                  style={{
                    position: 'absolute',
                    top: '-5px',
                    left: '-5px',
                    right: '-5px',
                    bottom: '-5px',
                    borderRadius: '50%',
                    border: '1px solid var(--primary)',
                    animation: 'pulse-ring 2s cubic-bezier(0.215, 0.610, 0.355, 1.000) infinite',
                    pointerEvents: 'none'
                  }}
                />
              </div>

              {/* Similarity Tooltip */}
              <div 
                style={{
                  background: 'rgba(0,0,0,0.85)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '0.7rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--accent-light)',
                  whiteSpace: 'nowrap'
                }}
              >
                {(dot.similarity * 100).toFixed(0)}% Match
              </div>
            </div>
          ))}

          {/* ANIMATED FLOATING CURRENCY PARTICLES */}
          {dots.map((dot, idx) => (
            <div 
              key={`particle-${idx}`}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                padding: '4px 8px',
                borderRadius: '10px',
                background: 'var(--primary-glow)',
                border: '1px solid var(--primary)',
                color: 'var(--accent-light)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.65rem',
                fontWeight: 'bold',
                pointerEvents: 'none',
                zIndex: 9,
                // Pass target coordinates as CSS variables for animation
                ['--target-x' as any]: `${dot.x}px`,
                ['--target-y' as any]: `${dot.y}px`,
                animation: 'money-float 2.5s ease-in-out infinite',
                // stagger start times
                animationDelay: `${idx * 0.8}s`
              } as React.CSSProperties}
            >
              +0.0001 USDC
            </div>
          ))}
        </div>

        {/* Detailed Toll Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
          {citations.map((cit, idx) => (
            <div 
              key={idx}
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                fontSize: '0.8rem', 
                background: 'rgba(255,255,255,0.02)', 
                border: '1px solid var(--border)', 
                borderRadius: '6px', 
                padding: '6px 12px' 
              }}
            >
              <span style={{ fontWeight: 500, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                • "{cit.title}"
              </span>
              <span style={{ color: 'var(--primary)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                +{cit.amount} USDC Paid
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
