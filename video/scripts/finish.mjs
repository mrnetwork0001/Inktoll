// out/cascadr-demo-1080p.mp4 -> out/cascadr-demo.mp4: audio brought to -14 LUFS with
// true peaks at or below -1 dBTP (two-pass loudnorm), video stream copied untouched.
import { spawnSync, execFileSync } from "node:child_process";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const src = join(ROOT, process.argv[2] || "out/cascadr-demo-1080p.mp4");
const dst = join(ROOT, process.argv[3] || "out/cascadr-demo.mp4");
const ln = "loudnorm=I=-14:TP=-1.0:LRA=11";
const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", src, "-af", `${ln}:print_format=json`, "-f", "null", "-"], { encoding: "utf8" });
const m = JSON.parse(r.stderr.slice(r.stderr.lastIndexOf("{"), r.stderr.lastIndexOf("}") + 1));
const af = `${ln}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", src, "-c:v", "copy", "-af", af, "-ar", "48000", "-c:a", "aac", "-b:a", "320k", "-movflags", "+faststart", dst]);
console.log(`in: ${m.input_i} LUFS, TP ${m.input_tp} -> ${dst}`);
