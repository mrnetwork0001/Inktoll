// Sound effects via ElevenLabs /v1/sound-generation. Skips files that already exist.
//   node scripts/sfx.mjs                 all missing
//   ONLY=stamp,impact node scripts/sfx.mjs   force regenerate some
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT, post, retry } from "./env.mjs";

const SFX = {
  // The motif: a single drop of ink landing, and the rings it sends out.
  drop: ["A single drop of liquid ink falling and landing in still water, close and intimate, one clean plink with a short wet tail, no music", 1.2],
  ripple: ["Soft water ripple spreading outward in a quiet pool, gentle, airy, no music", 1.8],
  // The cold open: a person typing a question into a laptop, and the room around them.
  drone_open: ["Very quiet tense ambient room tone, a low sub drone with faint air, almost silent, no melody, no drums, no music", 16],
  typing: ["Fast soft keyboard typing on a laptop, close, dry, a few seconds, no music", 2.5],
  // The walls going up.
  lock: ["A heavy metal lock snapping shut, single firm clean clunk, close, dry", 0.8],
  wall: ["A heavy stone block sliding into place and landing, single, dry, close", 1.2],
  // The meter counting the unpaid tab.
  tick: ["Single crisp clock tick, close, dry, short", 0.5],
  // Into the turn.
  riser: ["Tension riser, rising airy synth swell building to a peak, cinematic, no drums", 3.5],
  impact: ["Deep clean cinematic impact with a warm bell-like shimmer and sub tail, modern, single hit", 2.2],
  // Payment language.
  coin: ["A single small coin settling onto a hard surface, soft, clean, close, short", 0.7],
  chime: ["Bright clean confirmation chime, two soft ascending notes, modern, short tail", 1.5],
  stamp: ["Firm soft rubber stamp hit on paper, single, close, dry", 0.6],
  pulse: ["Electric pulse travelling along a wire, short zap that fades, clean, modern, no music", 1.2],
  // UI grammar.
  whoosh: ["Soft fast airy whoosh, smooth cinematic transition, no music", 1.0],
  click: ["Soft modern UI click, single, clean, short", 0.5],
  pop: ["Soft bubbly UI pop, single, clean, short, playful", 0.5],
  blip: ["Single soft digital data blip, clean sine tone, short", 0.5],
};

const dir = join(ROOT, "public/audio/sfx");
mkdirSync(dir, { recursive: true });
const only = process.env.ONLY ? process.env.ONLY.split(",") : null;

for (const [name, [text, dur]] of Object.entries(SFX)) {
  const f = join(dir, `${name}.mp3`);
  if (only ? !only.includes(name) : existsSync(f)) { console.log(`${name}: skip`); continue; }
  try {
    const buf = await retry(async () => {
      const res = await post("/sound-generation?output_format=mp3_44100_128", { text, duration_seconds: dur, prompt_influence: 0.5 });
      return Buffer.from(await res.arrayBuffer());
    });
    writeFileSync(f, buf);
    console.log(`${name}: ${(buf.length / 1024).toFixed(0)}kb`);
  } catch (e) { console.error(`${name}: FAILED ${e.message}`); }
}
