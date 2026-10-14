import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { C, FONT, MONO } from "./ui/theme";
import { Grain } from "./ui/Grain";

export const Poster: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg, alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 34 }}>
    <Img src={staticFile("logos/inktoll-wordmark-dark.png")} style={{ height: 168, width: "auto" }} />
    <div style={{ fontFamily: FONT, fontSize: 56, fontWeight: 500, color: C.text, letterSpacing: "-0.02em" }}>
      AI pays its <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", color: C.primary }}>sources</span>.
    </div>
    <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: "0.2em", textTransform: "uppercase", color: C.dim }}>
      Live on Arc mainnet
    </div>
    <Grain />
  </AbsoluteFill>
);
