import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "./theme";

// THE MOTIF. A drop of ink falls, lands, and sends rings outward. One drop is one
// read; the rings are the royalty reaching further authors. Recurs at the turn, the
// citation scene, the receipt and the close.
export const Drop: React.FC<{
  at?: number;          // frame the drop lands
  x?: number; y?: number;
  rings?: number;
  size?: number;
  color?: string;
  fall?: number;        // frames spent falling
}> = ({ at = 0, x = 960, y = 540, rings = 3, size = 13, color = C.primary, fall = 18 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f - at;

  // Fall: eased in, squashing slightly as it lands.
  const fallP = interpolate(t, [-fall, 0], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dropY = interpolate(fallP ** 2.4, [0, 1], [y - 230, y]);
  const squash = t >= 0 && t < 5 ? 1 - 0.3 * (1 - t / 5) : 1;

  const land = spring({ frame: t, fps, config: { damping: 14, stiffness: 180 }, durationInFrames: 22 });

  return (
    <>
      {Array.from({ length: rings }).map((_, i) => {
        const delay = i * 9;
        const p = interpolate(t - delay, [0, 46], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        if (t < delay) return null;
        return (
          <div key={i} style={{
            position: "absolute", left: x, top: y,
            width: p * (size * 15), height: p * (size * 15),
            marginLeft: -(p * size * 15) / 2, marginTop: -(p * size * 15) / 2,
            border: `${Math.max(0.6, 2.4 * (1 - p))}px solid ${color}`,
            borderRadius: "50%", opacity: (1 - p) * 0.62,
          }} />
        );
      })}
      {t > -fall && (
        <div style={{
          position: "absolute", left: x, top: dropY,
          width: size, height: size * (t < 0 ? 1.5 : 1),
          marginLeft: -size / 2, marginTop: -size / 2,
          borderRadius: "50%",
          background: color,
          transform: `scaleY(${squash}) scale(${t >= 0 ? 1 - 0.35 * land : 1})`,
          opacity: t >= 0 ? 1 - land * 0.85 : 1,
          boxShadow: `0 0 ${18 + 26 * land}px ${color}66`,
        }} />
      )}
    </>
  );
};
