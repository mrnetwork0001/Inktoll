// Downloads the third-party brand marks the film credits (Arc and Circle) from
// their own sites. They are deliberately not committed: they are trademarks
// belonging to those companies, used here only to credit the networks Inktoll
// settles on. Inktoll's own marks live in the repo.
//   node scripts/logos.mjs
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// ROOT is computed here rather than imported from env.mjs: fetching public brand
// assets must not require an ElevenLabs key.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const DIR = join(ROOT, "public/logos");
const SOURCES = {
  "arc.svg": "https://cdn.prod.website-files.com/685311a976e7c248b5dfde95/688f6e47eca8d8e359537b5f_logo-ondark.svg",
  "circle.svg": "https://cdn.prod.website-files.com/668c08d1b8a9330bd1d786ad/669a20df8ac2810a6dd50e67_favicon-256.svg",
};

mkdirSync(DIR, { recursive: true });
for (const [name, url] of Object.entries(SOURCES)) {
  const dest = join(DIR, name);
  if (existsSync(dest) && !process.env.FORCE) {
    console.log(`${name}: present`);
    continue;
  }
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`${name}: FAILED HTTP ${res.status} — fetch it from the vendor's own brand page instead`);
    continue;
  }
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  console.log(`${name}: downloaded`);
}
