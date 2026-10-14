import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { C, MONO } from "./theme";

export type Line = { t: string; c?: string; at: number };

// A terminal that types real output. Every line shown in the film is copied from an
// actual response captured from the live API, not written for the film.
export const Terminal: React.FC<{
  title: string;
  lines: Line[];
  width?: number;
  size?: number;
}> = ({ title, lines, width = 1300, size = 25 }) => {
  const f = useCurrentFrame();
  return (
    <div style={{
      width, borderRadius: 14, overflow: "hidden",
      border: `1px solid ${C.faint}`, background: "rgba(8,8,9,0.94)",
      boxShadow: "0 40px 110px rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
    }}>
      <div style={{ height: 42, display: "flex", alignItems: "center", gap: 9, padding: "0 15px", borderBottom: `1px solid ${C.faint}` }}>
        {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.8 }} />)}
        <div style={{ flex: 1, textAlign: "center", fontFamily: MONO, fontSize: 15, color: C.dim, letterSpacing: "0.05em" }}>{title}</div>
        <div style={{ width: 36 }} />
      </div>
      <div style={{ padding: "22px 26px", display: "flex", flexDirection: "column", gap: 5 }}>
        {lines.map((l, i) => {
          // Blank lines are spacers: no reveal to compute (and interpolate would get
          // a zero-width input range).
          if (!l.t.length) return <div key={i} style={{ height: size * 1.5 }} />;
          // Reveal by character so it reads as live output.
          const span = Math.max(1, Math.min(26, l.t.length * 0.9));
          const chars = Math.round(interpolate(f, [l.at, l.at + span], [0, l.t.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
          if (chars <= 0) return <div key={i} style={{ height: size * 1.5 }} />;
          return (
            <div key={i} style={{ fontFamily: MONO, fontSize: size, lineHeight: 1.5, color: l.c ?? C.text, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
              {l.t.slice(0, chars)}
            </div>
          );
        })}
      </div>
    </div>
  );
};
