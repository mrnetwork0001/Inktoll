import React from "react";
import { useCurrentFrame } from "remotion";
import { C, MONO } from "./theme";

// Small monospace corner labels with a running timecode, so the film reads as an
// instrument panel rather than a slideshow.
export const Chrome: React.FC<{ tag: string; right?: string }> = ({ tag, right }) => {
  const f = useCurrentFrame();
  const tc = `${String(Math.floor(f / 30 / 60)).padStart(2, "0")}:${String(Math.floor(f / 30) % 60).padStart(2, "0")}:${String(f % 30).padStart(2, "0")}`;
  const base: React.CSSProperties = { position: "absolute", fontFamily: MONO, fontSize: 19, letterSpacing: "0.17em", color: C.dim, textTransform: "uppercase" };
  return (
    <>
      <div style={{ ...base, left: 64, top: 52 }}>{tag}</div>
      <div style={{ ...base, right: 64, top: 52 }}>{right ?? tc}</div>
    </>
  );
};
