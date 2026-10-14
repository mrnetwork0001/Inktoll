import React from "react";
import { OffthreadVideo, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C, MONO } from "./theme";

type Rect = { x: number; y: number; width: number; height: number };

// A browser frame that plays the real product footage and can push the camera in
// toward a region. Clips were captured at 1600x900, so the frame is sized to that
// and scaled as one unit.
export const Browser: React.FC<{
  src: string;            // "footage/graph.mp4" or a still "stills/feed.png"
  url: string;
  startFrom?: number;
  zoom?: { at: number; to: number; rect?: Rect }; // camera push
  width?: number;
  still?: boolean;
  drift?: boolean;        // slow Ken Burns for near-static clips
  /** Frame the region worth seeing: scale up and bias vertically (0 top, 1 bottom),
   *  so a tall page's footer does not eat the shot. */
  focus?: { scale: number; y: number };
}> = ({ src, url, startFrom = 0, zoom, width = 1560, still = false, drift = false, focus }) => {
  const f = useCurrentFrame();
  const H = (width / 1600) * 900;

  let scale = 1, tx = 0, ty = 0;
  if (zoom) {
    const p = interpolate(f, [zoom.at, zoom.at + 42], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2) });
    scale = 1 + (zoom.to - 1) * p;
    if (zoom.rect) {
      const cx = (zoom.rect.x + zoom.rect.width / 2) / 1600 - 0.5;
      const cy = (zoom.rect.y + zoom.rect.height / 2) / 900 - 0.5;
      tx = -cx * width * (scale - 1);
      ty = -cy * H * (scale - 1);
    }
  }
  if (focus) {
    scale *= focus.scale;
    ty += -(focus.y - 0.5) * H * (focus.scale - 1) / focus.scale;
  }
  if (drift) {
    const d = interpolate(f, [0, 300], [0, 1], { extrapolateRight: "clamp" });
    scale *= 1 + 0.045 * d;
    ty += -8 * d;
  }

  return (
    <div style={{
      width, height: H, borderRadius: 16, overflow: "hidden",
      border: `1px solid ${C.faint}`,
      boxShadow: "0 48px 120px rgba(0,0,0,0.62)",
      background: C.ink,
    }}>
      <div style={{ height: 44, display: "flex", alignItems: "center", gap: 10, padding: "0 16px", borderBottom: `1px solid ${C.faint}`, background: "rgba(255,255,255,0.025)" }}>
        {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
          <div key={c} style={{ width: 11, height: 11, borderRadius: "50%", background: c, opacity: 0.82 }} />
        ))}
        <div style={{ flex: 1, textAlign: "center", fontFamily: MONO, fontSize: 16, color: C.dim, letterSpacing: "0.04em" }}>{url}</div>
        <div style={{ width: 40 }} />
      </div>
      <div style={{ width, height: H - 44, overflow: "hidden" }}>
        <div style={{ width, height: H - 44, transform: `scale(${scale}) translate(${tx}px, ${ty}px)`, transformOrigin: "center center" }}>
          {still ? (
            <Img src={staticFile(src)} style={{ width: "100%", display: "block" }} />
          ) : (
            <OffthreadVideo src={staticFile(src)} startFrom={startFrom} style={{ width: "100%", display: "block" }} muted />
          )}
        </div>
      </div>
    </div>
  );
};
