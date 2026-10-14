// Builds src/timing.json (absolute frames @30fps) from script.json + generated VO.
//   node scripts/timing.mjs
// Reads word timings from .cache/words/*.json and music bpm/offset from .cache/music.json
// (written by music.mjs; falls back to 100 bpm, offset 0).
// Budget: ~3960f (132s), set by scene.seconds in script.json. Voices play at natural pace (no atempo). If over, it tightens gaps,
// then trims planned scene length where there is picture slack after the VO, in TRIM_ORDER
// (montage first, then idea, then the demo scenes). The close always keeps >= 60f after its last word.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "../..");
const FPS = 30, MAX = 5250; // 2:55 ceiling
const END_HOLD = { close: 150, turn: 24 }; // min frames after last word, per scene
const TRIM_ORDER = ["walls", "problem", "receipt", "mcp", "citation", "creator", "paywall", "unique", "gap"];
const script = JSON.parse(readFileSync(join(ROOT, "script.json"), "utf8"));
const dur = (f) => parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", f]).toString());
const wordsOf = (id) => JSON.parse(readFileSync(join(ROOT, ".cache/words", `${id}.json`), "utf8"));

const LOOSE = { lead: 12, dialogue: 10, narration: 16, tail: 16 };
const TIGHT = { lead: 8, dialogue: 6, narration: 8, tail: 8 };

function build(sp, trim = {}) {
  let t = 0;
  const scenes = [];
  for (const scene of script.scenes) {
    const from = t;
    let cur = from + sp.lead;
    let prevVoice = null;
    const lines = [];
    for (const [i, line] of scene.lines.entries()) {
      const id = `${scene.id}_${i}`;
      if (prevVoice) cur += prevVoice === "narrator" || line.voice === "narrator" ? sp.narration : sp.dialogue;
      const { tempo, words } = wordsOf(id);
      const file = `audio/vo/${id}.mp3`;
      const fileFrames = Math.ceil(dur(join(ROOT, "public", file)) * FPS);
      const w = words.map((x) => ({
        word: x.word,
        start: cur + Math.round((x.start / tempo) * FPS),
        end: cur + Math.max(1, Math.round((x.end / tempo) * FPS)),
      }));
      const speechEnd = w.at(-1).end;
      lines.push({ voice: line.voice, text: line.text, file, startFrame: cur, durationFrames: fileFrames, speechEndFrame: speechEnd, words: w });
      cur = speechEnd;
      prevVoice = line.voice;
    }
    const durationInFrames = Math.max(scene.seconds * FPS - (trim[scene.id] || 0), cur + Math.max(sp.tail, END_HOLD[scene.id] || 0) - from);
    // keep each clip inside its scene (trailing mp3 silence only)
    for (const l of lines) l.durationFrames = Math.min(l.durationFrames, from + durationInFrames - l.startFrame);
    scenes.push({ id: scene.id, from, durationInFrames, plannedFrames: scene.seconds * FPS, lines });
    t = from + durationInFrames;
  }
  return { scenes, totalFrames: t };
}

let sp = LOOSE;
let res = build(sp);
if (res.totalFrames > MAX) { sp = TIGHT; res = build(sp); console.log(`over budget with loose spacing; tightened -> ${res.totalFrames}f`); }

// Then trim planned lengths in TRIM_ORDER, keeping >= RESERVE frames of picture after each scene's VO.
const RESERVE = 45;
const trim = {};
if (res.totalFrames > MAX) {
  let left = res.totalFrames - MAX;
  for (const id of TRIM_ORDER) {
    if (left <= 0) break;
    const s = res.scenes.find((x) => x.id === id);
    const voEnd = s.lines.at(-1).words.at(-1).end - s.from;
    const n = Math.min(left, Math.max(0, s.durationInFrames - voEnd - RESERVE));
    if (n) { trim[id] = n; left -= n; }
  }
  res = build(sp, trim);
  console.log(`trimmed: ${Object.entries(trim).map(([k, v]) => `${k}-${v}`).join(" ") || "none"}`);
  if (res.totalFrames > MAX) console.error(`STILL OVER: ${res.totalFrames}f > ${MAX}f`);
}

const music = existsSync(join(ROOT, ".cache/music.json")) ? JSON.parse(readFileSync(join(ROOT, ".cache/music.json"), "utf8")) : {};
const bpm = music.bpm || 100;
const offset = music.offsetSec || 0;
const beats = [];
for (let b = offset; b * FPS < res.totalFrames; b += 60 / bpm) beats.push(Math.round(b * FPS));

const out = {
  fps: FPS,
  totalFrames: res.totalFrames,
  bpm,
  beats,
  music: { file: "audio/music.mp3", source: music.source || "unknown" },
  scenes: res.scenes.map(({ plannedFrames, ...s }) => ({ ...s, lines: s.lines.map(({ speechEndFrame, ...l }) => l) })),
};
writeFileSync(join(ROOT, "src/timing.json"), JSON.stringify(out, null, 1));

const tempos = res.scenes.flatMap((s) => s.lines.map((_, i) => `${s.id}_${i}`)).map((id) => [id, wordsOf(id).tempo]).filter(([, t]) => t !== 1);
console.log(`spacing: ${sp === LOOSE ? "loose" : "tight"}; atempo lines: ${tempos.map(([id, t]) => `${id}x${t}`).join(" ") || "none"}`);
console.log("scene        from   dur(f)  planned  sec    lines words");
for (const s of res.scenes) {
  console.log(`${s.id.padEnd(12)} ${String(s.from).padStart(5)} ${String(s.durationInFrames).padStart(7)} ${String(s.plannedFrames).padStart(8)} ${(s.durationInFrames / FPS).toFixed(1).padStart(5)} ${String(s.lines.length).padStart(6)} ${String(s.lines.reduce((n, l) => n + l.words.length, 0)).padStart(5)}`);
}
console.log(`total ${res.totalFrames}f = ${(res.totalFrames / FPS).toFixed(2)}s (max ${MAX}), bpm ${bpm}, ${beats.length} beats`);
