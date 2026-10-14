import React from "react";
import { useCurrentFrame } from "remotion";

// A fine static-free grain: a tiled SVG noise that resamples every few frames so it
// shimmers without strobing.
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.055 }) => {
  const f = useCurrentFrame();
  const seed = Math.floor(f / 3);
  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity, pointerEvents: "none", mixBlendMode: "overlay" }}>
      <filter id={`g${seed}`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves={3} seed={seed} />
      </filter>
      <rect width="100%" height="100%" filter={`url(#g${seed})`} />
    </svg>
  );
};
