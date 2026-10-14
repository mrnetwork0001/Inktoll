import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { C, FONT } from "./theme";

export type Word = { word: string; start: number; end: number };

// Kinetic type that lights up word by word, synced to the narration's own word
// timings. One accent word per line is set in an italic serif in the brand colour.
export const Words: React.FC<{
  lines: string[][];           // words grouped into display lines
  words: Word[];               // flat word timings for the whole block
  accent?: string;             // the word rendered as the italic serif accent
  size?: number;
  align?: "left" | "center";
  color?: string;
}> = ({ lines, words, accent, size = 108, align = "left", color = C.text }) => {
  const f = useCurrentFrame();
  let idx = 0;
  const timeOf = (w: string) => {
    const hit = words[idx];
    idx++;
    return hit?.start ?? 0;
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: size * 0.1, alignItems: align === "center" ? "center" : "flex-start" }}>
      {lines.map((line, li) => (
        <div key={li} style={{ display: "flex", gap: size * 0.26, flexWrap: "wrap", justifyContent: align === "center" ? "center" : "flex-start" }}>
          {line.map((w, wi) => {
            const start = timeOf(w);
            const o = interpolate(f, [start - 5, start + 3], [0.14, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const dy = interpolate(f, [start - 5, start + 5], [14, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const isAccent = accent && w.replace(/[^\w$.]/g, "").toLowerCase() === accent.toLowerCase();
            return (
              <span key={wi} style={{
                fontFamily: isAccent ? 'Georgia, "Times New Roman", serif' : FONT,
                fontStyle: isAccent ? "italic" : "normal",
                fontWeight: isAccent ? 500 : 700,
                fontSize: size,
                letterSpacing: isAccent ? "-0.02em" : "-0.045em",
                lineHeight: 1.02,
                color: isAccent ? C.primary : color,
                opacity: o,
                transform: `translateY(${dy}px)`,
                display: "inline-block",
              }}>{w}</span>
            );
          })}
        </div>
      ))}
    </div>
  );
};
