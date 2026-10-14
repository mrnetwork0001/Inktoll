import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { C, FONT } from "./theme";
import type { Word } from "./Words";

// Word-lit captions on a frosted pill. Hidden on scenes where big type already
// carries the words.
export const Captions: React.FC<{ words: Word[]; y?: number }> = ({ words, y = 88 }) => {
  const f = useCurrentFrame();
  if (!words.length) return null;
  const first = words[0].start, last = words[words.length - 1].end;
  if (f < first - 10 || f > last + 18) return null;
  const o = interpolate(f, [first - 10, first, last + 4, last + 18], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: y, display: "flex", justifyContent: "center", opacity: o }}>
      <div style={{
        maxWidth: 1380, padding: "16px 30px", borderRadius: 999,
        background: "rgba(10,10,10,0.62)", backdropFilter: "blur(14px)",
        border: `1px solid ${C.faint}`,
        fontFamily: FONT, fontSize: 31, fontWeight: 500, letterSpacing: "-0.01em",
        textAlign: "center", lineHeight: 1.34,
      }}>
        {words.map((w, i) => (
          <span key={i} style={{ color: f >= w.start ? C.text : "rgba(245,243,239,0.34)", transition: "none" }}>{w.word}{i < words.length - 1 ? " " : ""}</span>
        ))}
      </div>
    </div>
  );
};
