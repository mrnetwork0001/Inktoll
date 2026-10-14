// Renders a VO clip from its untouched take: .cache/raw/<id>.mp3 -> [atempo] -> loudnorm -16 LUFS
// (two-pass, TP -1.5) -> public/audio/vo/<id>.mp3. Shared by voiceover.mjs and timing.mjs.
import { spawnSync, execFileSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "../..");
export const VO_LUFS = -16;
// open_0 is the user talking into a laptop, not a broadcast: a gentle device capture.
const DEVICE = new Set(["open_0"]);

export function renderVo(id, tempo = 1) {
  const src = join(ROOT, ".cache/raw", `${id}.mp3`);
  const dst = join(ROOT, "public/audio/vo", `${id}.mp3`);
  // Close-mic'd into a device: a little body removed, lightly pressed, still natural.
  const tv = DEVICE.has(id) ? "highpass=f=150,lowpass=f=8000,acompressor=threshold=-22dB:ratio=2.5:attack=8:release=90," : "";
  const pre = (tempo !== 1 ? `atempo=${tempo},` : "") + tv;
  const ln = `loudnorm=I=${VO_LUFS}:TP=-1.5:LRA=11`;
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", src, "-af", `${pre}${ln}:print_format=json`, "-f", "null", "-"], { encoding: "utf8" });
  const m = JSON.parse(r.stderr.slice(r.stderr.lastIndexOf("{"), r.stderr.lastIndexOf("}") + 1));
  const af = `${pre}${ln}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", src, "-af", af, "-ar", "44100", "-b:a", "128k", dst]);
}
