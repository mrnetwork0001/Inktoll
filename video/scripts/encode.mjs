// .cache/frames/<clip>/ (screencast JPEGs + frames.json) -> public/footage/<clip>.mp4 at a
// constant 30 fps (real wall-clock timing), and src/footage.json with each clip's file, size,
// length, event marks (frames from the clip's start, from .cache/marks.json) and what
// scripts/capture.mjs noted about it (.cache/meta.json: element rects in CSS px, device scale).
//   node scripts/encode.mjs            all clips
//   ONLY=why,graph node scripts/encode.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { concatList } from "./cdp.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const FR = join(ROOT, ".cache/frames");
const readJson = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : {});
const marks = readJson(join(ROOT, ".cache/marks.json"));
const meta = readJson(join(ROOT, ".cache/meta.json"));
const out = readJson(join(ROOT, "src/footage.json"));
const only = process.env.ONLY?.split(",");
mkdirSync(join(ROOT, "public/footage"), { recursive: true });

for (const clip of readdirSync(FR)) {
  if (only && !only.includes(clip)) continue;
  const fj = join(FR, clip, "frames.json");
  if (!existsSync(fj)) continue;
  const frames = JSON.parse(readFileSync(fj, "utf8"));
  if (!frames.length) continue;
  const list = join(FR, clip, "list.txt");
  writeFileSync(list, concatList(frames));
  const file = `footage/${clip}.mp4`;
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list,
    "-vf", "fps=30,scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p", "-c:v", "libx264", "-crf", "15", "-preset", "medium", "-movflags", "+faststart", join(ROOT, "public", file)]);
  const [w, h] = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", join(ROOT, "public", file)]).toString().trim().split(",").map(Number);
  const dur = parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", join(ROOT, "public", file)]).toString());
  const t0 = frames[0].t;
  const tEnd = frames[frames.length - 1].t;
  const m = {};
  for (const [k, v] of Object.entries(marks)) {
    if (k.includes(":")) continue; // clip start/end bookkeeping
    const f = Math.round((v - t0) * 30);
    if (f >= 0 && v <= tEnd + 0.5) m[k] = f;
  }
  out[clip] = { file, width: w, height: h, durationFrames: Math.floor(dur * 30), marks: m, ...(meta[clip] ?? {}) };
  console.log(`${clip}: ${w}x${h} ${dur.toFixed(1)}s marks ${JSON.stringify(m)}`);
}
writeFileSync(join(ROOT, "src/footage.json"), JSON.stringify(out, null, 1));
