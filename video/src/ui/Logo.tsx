import React from "react";
import { Img, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

// The real Inktoll lockup (dashboard/public/logo-dark.png): the gold nib-and-toll
// mark with the serif wordmark, in its dark-background variant. Animated as one
// piece so the brand asset is never redrawn or distorted.
export const Logo: React.FC<{ at?: number; size?: number }> = ({ at = 0, size = 132 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - at, fps, config: { damping: 18, stiffness: 120 }, durationInFrames: 30 });
  // logo-dark.png is 608x259, so height drives the width.
  return (
    <Img
      src={staticFile("logos/inktoll-wordmark-dark.png")}
      style={{
        height: size,
        width: "auto",
        opacity: s,
        transform: `scale(${0.92 + 0.08 * s})`,
      }}
    />
  );
};

// The mark alone, for moments that want the nib without the wordmark.
export const Mark: React.FC<{ at?: number; size?: number }> = ({ at = 0, size = 120 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - at, fps, config: { damping: 16, stiffness: 140 }, durationInFrames: 26 });
  return (
    <Img src={staticFile("logos/inktoll-mark.png")} style={{ height: size, width: "auto", opacity: s, transform: `scale(${0.9 + 0.1 * s})` }} />
  );
};
