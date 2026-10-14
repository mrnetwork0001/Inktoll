import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import timing from "./timing.json";
import footage from "./footage.json";
import { C, FONT, MONO } from "./ui/theme";
import { Grain } from "./ui/Grain";
import { Drop } from "./ui/Drop";
import { Words, type Word } from "./ui/Words";
import { Captions } from "./ui/Captions";
import { Browser } from "./ui/Browser";
import { Count } from "./ui/Count";
import { Logo } from "./ui/Logo";
import { Terminal } from "./ui/Terminal";

const F: Record<string, any> = footage as any;
const S: Record<string, any> = Object.fromEntries(timing.scenes.map((s: any) => [s.id, s]));

/** Scene-relative word timings (timing.json stores absolute frames). */
const rel = (id: string, lineIdx = 0): Word[] => {
  const s = S[id];
  const l = s.lines[lineIdx];
  if (!l) return [];
  return l.words.map((w: any) => ({ word: w.word, start: w.start - s.from, end: w.end - s.from }));
};
const wordAt = (id: string, i: number, lineIdx = 0) => rel(id, lineIdx)[i]?.start ?? 0;
/** Frame of the first word matching `needle`, scene-relative. */
const onWord = (id: string, needle: string, lineIdx = 0) => {
  const ws = rel(id, lineIdx);
  const hit = ws.findIndex((w) => w.word.toLowerCase().replace(/[^\w]/g, "").includes(needle.toLowerCase()));
  return hit >= 0 ? ws[hit].start : 0;
};

// `tag` names the scene for readability only: the on-screen corner labels and
// timecode were removed at the director's request.
const Scene: React.FC<{ id: string; children: React.ReactNode; tag: string }> = ({ id, children }) => {
  const s = S[id];
  const f = useCurrentFrame();
  // Gentle fade at both ends so cuts breathe.
  const o = interpolate(f, [0, 10, s.durationInFrames - 12, s.durationInFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: C.bg, opacity: o }}>
      {children}
      <Grain />
    </AbsoluteFill>
  );
};

const Center: React.FC<{ children: React.ReactNode; pad?: number }> = ({ children, pad = 150 }) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: pad }}>{children}</AbsoluteFill>
);

// ---------------------------------------------------------------- scenes

const Open: React.FC = () => {
  const f = useCurrentFrame();
  const q = rel("open", 0);
  const n = rel("open", 1);
  const qEnd = q.length ? q[q.length - 1].end : 70;
  return (
    <Scene id="open" tag="01 / the question">
      <Center>
        <div style={{ width: 1420, display: "flex", flexDirection: "column", gap: 54 }}>
          <div style={{ fontFamily: MONO, fontSize: 21, letterSpacing: "0.2em", textTransform: "uppercase", color: C.dim, opacity: interpolate(f, [8, 24], [0, 1], { extrapolateRight: "clamp" }) }}>
            A question, asked this morning
          </div>
          <div style={{ fontFamily: FONT, fontSize: 60, fontWeight: 500, lineHeight: 1.3, letterSpacing: "-0.02em", color: C.text }}>
            {q.map((w, i) => (
              <span key={i} style={{ opacity: f >= w.start ? 1 : 0.1 }}>{w.word}{i < q.length - 1 ? " " : ""}</span>
            ))}
            <span style={{ opacity: f % 30 < 15 && f < qEnd + 10 ? 1 : 0, color: C.primary }}>|</span>
          </div>
          {/* The answer arrives, and the cost of it does not appear anywhere. */}
          <div style={{ display: "flex", gap: 18, alignItems: "center", opacity: interpolate(f, [qEnd + 6, qEnd + 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
            <div style={{ width: 9, height: 9, borderRadius: "50%", background: C.agent }} />
            <div style={{ fontFamily: MONO, fontSize: 24, color: C.dim, letterSpacing: "0.05em" }}>answered in 4 seconds</div>
          </div>
        </div>
      </Center>
      <Captions words={n} />
    </Scene>
  );
};

const Problem: React.FC = () => (
  <Scene id="problem" tag="02 / the tab">
    <Center>
      <Words
        lines={[["The", "biggest"], ["unpaid", "tab"], ["on", "the", "internet."]]}
        words={rel("problem")}
        accent="unpaid"
        size={136}
        align="center"
      />
    </Center>
  </Scene>
);

const Walls: React.FC = () => {
  const f = useCurrentFrame();
  const items = ["Paywall", "robots.txt", "Block", "403", "Login required", "Subscribe"];
  return (
    <Scene id="walls" tag="03 / the walls">
      <Center>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 26, width: 1500 }}>
          {items.map((t, i) => {
            const at = 16 + i * 11;
            const p = interpolate(f, [at, at + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={t} style={{
                padding: "40px 34px", borderRadius: 13,
                border: `1px solid ${C.faint}`, background: "rgba(255,255,255,0.03)",
                fontFamily: MONO, fontSize: 32, color: C.text, textAlign: "center",
                opacity: p, transform: `translateY(${(1 - p) * 26}px)`,
              }}>{t}</div>
            );
          })}
        </div>
      </Center>
      <Captions words={rel("walls")} />
    </Scene>
  );
};

const Gap: React.FC = () => (
  <Scene id="gap" tag="04 / the gap">
    <Center>
      <Words
        lines={[["A", "wall", "is", "not"], ["a", "price."]]}
        words={rel("gap")}
        accent="price."
        size={150}
        align="center"
      />
    </Center>
    <Captions words={rel("gap")} />
  </Scene>
);

const Turn: React.FC = () => {
  const land = Math.max(6, onWord("turn", "inktoll") - 4);
  return (
    <Scene id="turn" tag="05 / inktoll">
      <Drop at={land} x={960} y={420} rings={4} size={17} />
      <Center>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 36, marginTop: 120 }}>
          <Logo at={land + 2} size={215} />
          <div style={{ fontFamily: FONT, fontSize: 54, fontWeight: 500, color: C.text, letterSpacing: "-0.02em", opacity: interpolate(useCurrentFrame(), [land + 20, land + 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
            AI pays its <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", color: C.primary }}>sources</span>.
          </div>
        </div>
      </Center>
    </Scene>
  );
};

const Creator: React.FC = () => (
  <Scene id="creator" tag="06 / the writer">
    <Center pad={110}>
      <Browser src="stills/onboard.png" url="inktoll.xyz/creator/onboard" still drift focus={{ scale: 1.5, y: 0.26 }} />
    </Center>
    <Captions words={rel("creator")} />
  </Scene>
);

// The real 402, copied from the live response captured 2026-10-14.
const Paywall: React.FC = () => {
  const base = Math.max(8, onWord("paywall", "four") - 10);
  return (
    <Scene id="paywall" tag="07 / http 402">
      <Center pad={110}>
        <Terminal
          title="GET /api/articles/the-unit-of-account-problem"
          lines={[
            { t: "HTTP/2 402", c: C.primary, at: base },
            { t: "payment-amount:    0.02", at: base + 14 },
            { t: "payment-token:     USDC", at: base + 22 },
            { t: "payment-network:   arc  (eip155:5042)", at: base + 30 },
            { t: "payment-recipient: 0x0df42e5c…89c4af", at: base + 38 },
            { t: "payment-gateway:   gateway-api.circle.com", at: base + 46 },
            { t: "", at: base + 52 },
            { t: "→ signed EIP-3009 TransferWithAuthorization", c: C.agent, at: base + 58 },
            { t: "→ 200 OK  content unlocked", c: C.agent, at: base + 74 },
          ]}
        />
      </Center>
      <Captions words={rel("paywall")} />
    </Scene>
  );
};

const Citation: React.FC = () => {
  const drop = Math.max(10, onWord("citation", "again") - 6);
  return (
    <Scene id="citation" tag="08 / the citation toll">
      <Center pad={110}>
        <Browser src="footage/graph.mp4" url="inktoll.xyz/graph" startFrom={F.graph?.marks?.graph_settled ?? 180} focus={{ scale: 1.22, y: 0.4 }} />
      </Center>
      <Drop at={drop} x={960} y={540} rings={4} size={13} color={C.gold} />
      <Captions words={rel("citation")} />
    </Scene>
  );
};

const Receipt: React.FC = () => (
  <Scene id="receipt" tag="09 / the receipt">
    <Center pad={110}>
      <Browser src="footage/receipt.mp4" url="inktoll.xyz/receipt/48cba8af" startFrom={F.receipt?.marks?.receipt_shown ?? 60} focus={{ scale: 1.55, y: 0.2 }} />
    </Center>
    <Captions words={rel("receipt")} />
  </Scene>
);

// Both claims are verified facts about the deployment, not marketing lines.
const Unique: React.FC = () => {
  const f = useCurrentFrame();
  const a = Math.max(8, onWord("unique", "gas") - 8);
  const b = Math.max(a + 60, onWord("unique", "batches") - 14);
  const Card: React.FC<{ at: number; k: string; v: string; sub: string; logo: string; logoH: number }> = ({ at, k, v, sub, logo, logoH }) => {
    const p = interpolate(f, [at, at + 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return (
      <div style={{ flex: 1, padding: "44px 40px", borderRadius: 15, border: `1px solid ${C.faint}`, background: "rgba(255,255,255,0.03)", opacity: p, transform: `translateY(${(1 - p) * 22}px)` }}>
        <div style={{ height: 46, display: "flex", alignItems: "center", marginBottom: 22 }}>
          <Img src={staticFile(logo)} style={{ height: logoH, width: "auto" }} />
        </div>
        <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: "0.18em", textTransform: "uppercase", color: C.dim, marginBottom: 18 }}>{k}</div>
        <div style={{ fontFamily: FONT, fontSize: 52, fontWeight: 700, color: C.primary, letterSpacing: "-0.03em", lineHeight: 1.08 }}>{v}</div>
        <div style={{ fontFamily: FONT, fontSize: 27, color: C.dim, marginTop: 16, lineHeight: 1.4 }}>{sub}</div>
      </div>
    );
  };
  return (
    <Scene id="unique" tag="10 / why it works">
      <Center pad={120}>
        <div style={{ display: "flex", gap: 30, width: 1600 }}>
          <Card at={a} logo="logos/arc.svg" logoH={42} k="Gas" v="Paid in USDC" sub="Price and settlement cost in one asset. A two cent toll stops being absurd." />
          <Card at={b} logo="logos/circle.svg" logoH={44} k="Settlement" v="Batched" sub="EIP-3009 signatures netted by Circle Gateway. A thousand reads are not a thousand transactions." />
        </div>
      </Center>
      <Captions words={rel("unique")} />
    </Scene>
  );
};

const Mcp: React.FC = () => {
  const base = 10;
  return (
    <Scene id="mcp" tag="11 / any assistant">
      <Center pad={110}>
        <Terminal
          title="claude mcp add"
          size={24}
          lines={[
            { t: "$ claude mcp add --transport http inktoll \\", c: C.text, at: base },
            { t: "    https://agent.inktoll.xyz/mcp?uid=you", c: C.text, at: base + 12 },
            { t: "", at: base + 20 },
            { t: "connected · 5 tools", c: C.agent, at: base + 26 },
            { t: "  browse_articles   free catalog", c: C.dim, at: base + 36 },
            { t: "  read_article      pays the author via x402", c: C.dim, at: base + 44 },
            { t: "  ask_inktoll       auto-pays citation tolls", c: C.dim, at: base + 52 },
            { t: "  wallet_status     balances and spend", c: C.dim, at: base + 60 },
            { t: "  claim_faucet      testnet only", c: C.dim, at: base + 68 },
          ]}
        />
      </Center>
      <Captions words={rel("mcp")} />
    </Scene>
  );
};

const Close: React.FC = () => {
  const f = useCurrentFrame();
  const d = 8;
  return (
    <Scene id="close" tag="12 / inktoll">
      <Drop at={d} x={960} y={360} rings={5} size={15} />
      <Center>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30, marginTop: 90 }}>
          <Logo at={d + 2} size={190} />
          <div style={{ fontFamily: FONT, fontSize: 47, fontWeight: 500, color: C.text, letterSpacing: "-0.02em", opacity: interpolate(f, [d + 18, d + 36], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
            Readers pay once. Creators earn <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", color: C.primary }}>forever</span>.
          </div>
          <div style={{ display: "flex", gap: 46, marginTop: 26, opacity: interpolate(f, [d + 34, d + 52], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
            <div style={{ fontFamily: MONO, fontSize: 27, color: C.primary, letterSpacing: "0.04em" }}>inktoll.xyz</div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ fontFamily: MONO, fontSize: 27, color: C.dim, letterSpacing: "0.17em", textTransform: "uppercase" }}>Live on</div>
              <Img src={staticFile("logos/arc.svg")} style={{ height: 34, width: "auto" }} />
              <div style={{ fontFamily: MONO, fontSize: 27, color: C.dim, letterSpacing: "0.17em", textTransform: "uppercase" }}>mainnet</div>
            </div>
          </div>
        </div>
      </Center>
    </Scene>
  );
};

// ---------------------------------------------------------------- sound

const SFX: { f: string; at: number; vol?: number }[] = [
  { f: "typing", at: 20, vol: 0.3 },
  { f: "blip", at: S.open.from + 300, vol: 0.3 },
  { f: "tick", at: S.problem.from + 10, vol: 0.32 },
  { f: "lock", at: S.walls.from + 20, vol: 0.34 },
  { f: "wall", at: S.walls.from + 55, vol: 0.3 },
  { f: "lock", at: S.walls.from + 92, vol: 0.28 },
  { f: "whoosh", at: S.gap.from + 6, vol: 0.3 },
  { f: "riser", at: S.turn.from - 52, vol: 0.34 },
  { f: "impact", at: S.turn.from + 4, vol: 0.44 },
  { f: "drop", at: S.turn.from + 6, vol: 0.4 },
  { f: "ripple", at: S.turn.from + 14, vol: 0.26 },
  { f: "click", at: S.creator.from + 30, vol: 0.26 },
  { f: "stamp", at: S.creator.from + 150, vol: 0.3 },
  { f: "pulse", at: S.paywall.from + 70, vol: 0.3 },
  { f: "chime", at: S.paywall.from + 190, vol: 0.32 },
  { f: "drop", at: S.citation.from + 60, vol: 0.34 },
  { f: "ripple", at: S.citation.from + 70, vol: 0.26 },
  { f: "coin", at: S.citation.from + 96, vol: 0.3 },
  { f: "pop", at: S.receipt.from + 40, vol: 0.26 },
  { f: "pop", at: S.unique.from + 24, vol: 0.24 },
  { f: "pop", at: S.unique.from + 96, vol: 0.24 },
  { f: "blip", at: S.mcp.from + 40, vol: 0.24 },
  { f: "chime", at: S.mcp.from + 86, vol: 0.26 },
  { f: "drop", at: S.close.from + 8, vol: 0.38 },
  { f: "ripple", at: S.close.from + 18, vol: 0.26 },
  { f: "impact", at: S.close.from + 10, vol: 0.3 },
];

/** Every frame a narration line is speaking, so the music can step aside for it. */
const SPEAKING: [number, number][] = timing.scenes.flatMap((s: any) =>
  s.lines.map((l: any) => [l.startFrame, l.words[l.words.length - 1].end] as [number, number]),
);

const Music: React.FC = () => {
  const duck = (f: number) => {
    const near = SPEAKING.some(([a, b]) => f >= a - 14 && f <= b + 14);
    const base = near ? 0.2 : 0.56;
    const outro = interpolate(f, [timing.totalFrames - 50, timing.totalFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const intro = interpolate(f, [0, 30], [0, 1], { extrapolateRight: "clamp" });
    return base * outro * intro;
  };
  return <Audio src={staticFile(timing.music.file)} volume={duck} />;
};

// ---------------------------------------------------------------- film

export const Film: React.FC = () => {
  const SC: Record<string, React.FC> = {
    open: Open, problem: Problem, walls: Walls, gap: Gap, turn: Turn, creator: Creator,
    paywall: Paywall, citation: Citation, receipt: Receipt, unique: Unique, mcp: Mcp, close: Close,
  };
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {timing.scenes.map((s: any) => {
        const Cmp = SC[s.id];
        return (
          <Sequence key={s.id} from={s.from} durationInFrames={s.durationInFrames} name={s.id}>
            <Cmp />
          </Sequence>
        );
      })}

      {/* The cold open has no score, so it gets its own room tone. */}
      <Sequence from={0} durationInFrames={S.open.durationInFrames + 20} name="drone">
        <Audio src={staticFile("audio/sfx/drone_open.mp3")} volume={0.5} />
      </Sequence>

      <Music />

      {timing.scenes.flatMap((s: any) =>
        s.lines.map((l: any, i: number) => (
          <Sequence key={`${s.id}_${i}`} from={l.startFrame} durationInFrames={l.durationFrames} name={`vo:${s.id}_${i}`}>
            <Audio src={staticFile(l.file)} />
          </Sequence>
        )),
      )}

      {SFX.map((x, i) => (
        <Sequence key={i} from={Math.max(0, x.at)} durationInFrames={120} name={`sfx:${x.f}`}>
          <Audio src={staticFile(`audio/sfx/${x.f}.mp3`)} volume={x.vol ?? 0.3} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
