import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { C, MONO } from "./theme";

// Real numbers, counted up. Every value passed here comes from the live API.
export const Count: React.FC<{
  to: number; at: number; prefix?: string; suffix?: string; dp?: number;
  label?: string; size?: number; color?: string;
}> = ({ to, at, prefix = "", suffix = "", dp = 0, label, size = 92, color = C.primary }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [at, at + 34], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => 1 - (1 - t) ** 3 });
  const v = (to * p).toFixed(dp);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontFamily: MONO, fontSize: size, fontWeight: 700, color, letterSpacing: "-0.03em", lineHeight: 1 }}>
        {prefix}{v}{suffix}
      </div>
      {label && <div style={{ fontFamily: MONO, fontSize: 19, letterSpacing: "0.17em", textTransform: "uppercase", color: C.dim }}>{label}</div>}
    </div>
  );
};
