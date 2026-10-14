import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { loadFont as loadSans } from "@remotion/google-fonts/PlusJakartaSans";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { C } from "./ui/theme";
import { Grain } from "./ui/Grain";

const { fontFamily: SANS } = loadSans();
const { fontFamily: MONOF } = loadMono();

// The ink-drop motif, static: a drop that has landed, rings still spreading.
const Ripples: React.FC<{ x: number; y: number; r: number }> = ({ x, y, r }) => (
  <>
    {[0.34, 0.58, 0.82, 1].map((p, i) => (
      <div key={i} style={{
        position: "absolute", left: x, top: y,
        width: r * 2 * p, height: r * 2 * p,
        marginLeft: -r * p, marginTop: -r * p,
        border: `${Math.max(1, 4 * (1 - p))}px solid ${C.primary}`,
        borderRadius: "50%", opacity: (1 - p) * 0.85 + 0.1,
      }} />
    ))}
    <div style={{
      position: "absolute", left: x, top: y, width: 26, height: 26,
      marginLeft: -13, marginTop: -13, borderRadius: "50%",
      background: C.gold, boxShadow: `0 0 54px ${C.gold}80`,
    }} />
  </>
);

export const Flier: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    {/* faint grid, same language as the product */}
    <AbsoluteFill style={{
      backgroundImage:
        `linear-gradient(${C.faint} 1px, transparent 1px), linear-gradient(90deg, ${C.faint} 1px, transparent 1px)`,
      backgroundSize: "120px 120px", opacity: 0.5,
    }} />
    <Ripples x={1210} y={1430} r={430} />

    <AbsoluteFill style={{ padding: "96px 88px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 54 }}>
        <Img src={staticFile("logos/inktoll-wordmark-dark.png")} style={{ height: 76, width: "auto", alignSelf: "flex-start" }} />
        {/* Dateline: anchors the top of the sheet and carries the fact itself. */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ fontFamily: MONOF, fontSize: 27, letterSpacing: "0.2em", textTransform: "uppercase", color: C.gold }}>
            First mainnet payment
          </div>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.agent }} />
          <div style={{ fontFamily: MONOF, fontSize: 27, letterSpacing: "0.2em", textTransform: "uppercase", color: C.dim }}>
            14 Oct 2026
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 46, marginBottom: 40 }}>
        <div style={{
          fontFamily: SANS, fontWeight: 800, fontSize: 112, lineHeight: 1.04,
          letterSpacing: "-0.045em", color: C.text, maxWidth: 1240,
        }}>
          An AI agent just paid a{" "}
          <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400, color: C.primary }}>
            human writer
          </span>.
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 58, height: 2, background: C.primary }} />
          <div style={{ fontFamily: MONOF, fontSize: 34, letterSpacing: "0.1em", textTransform: "uppercase", color: C.primary }}>
            Not a demo. Not testnet.
          </div>
        </div>

        <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 43, lineHeight: 1.46, color: C.dim, maxWidth: 1120 }}>
          It read the article, scored it <span style={{ color: C.text, fontWeight: 700 }}>85/100</span>, decided it was
          worth <span style={{ color: C.text, fontWeight: 700 }}>$0.02</span>, and paid the author in USDC on Arc
          mainnet. Then it skipped the next one at <span style={{ color: C.text, fontWeight: 700 }}>10/100</span>.
        </div>

        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 52, letterSpacing: "-0.025em", color: C.text, maxWidth: 1120 }}>
          Nobody told it to. <span style={{ color: C.agent }}>That's the point.</span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${C.faint}`, paddingTop: 38 }}>
        <div style={{ fontFamily: MONOF, fontSize: 40, color: C.primary, letterSpacing: "0.02em" }}>inktoll.xyz</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontFamily: MONOF, fontSize: 25, letterSpacing: "0.17em", textTransform: "uppercase", color: C.dim }}>Live on</div>
          <Img src={staticFile("logos/arc.svg")} style={{ height: 34, width: "auto" }} />
          <div style={{ fontFamily: MONOF, fontSize: 25, letterSpacing: "0.17em", textTransform: "uppercase", color: C.dim }}>mainnet</div>
        </div>
      </div>
    </AbsoluteFill>
    <Grain opacity={0.045} />
  </AbsoluteFill>
);
