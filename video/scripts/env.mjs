// Loads the ElevenLabs key at runtime. Never log or persist it.
// Order: process.env.ELEVENLABS_API_KEY, then video/.env (gitignored), then any
// path given in ELEVENLABS_ENV_FILE. No machine-specific path is baked in, so
// this works for anyone who clones the repo.
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function fromFile(path) {
  if (!path || !existsSync(path)) return null;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*(?:export\s+)?ELEVENLABS_API_KEY\s*=\s*(.*?)\s*$/);
    if (m) return m[1].replace(/^["']|["']$/g, "");
  }
  return null;
}

function load() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY.trim();
  return fromFile(join(ROOT, ".env")) || fromFile(process.env.ELEVENLABS_ENV_FILE);
}

export const key = load();
if (!key) {
  console.error("ELEVENLABS_API_KEY not found. Set it in the environment, in video/.env, or point ELEVENLABS_ENV_FILE at a file that holds it.");
  process.exit(1);
}

export const API = "https://api.elevenlabs.io/v1";

export async function retry(fn, tries = 4) {
  let last;
  for (let i = 1; i <= tries; i++) {
    try { return await fn(); } catch (e) {
      last = e;
      if (/\b(401|402|403|422)\b/.test(String(e.message))) break; // not retryable
      await new Promise((r) => setTimeout(r, 1500 * i));
    }
  }
  throw last;
}

// Error text never includes the key (we only echo response bodies).
export async function post(path, body) {
  const res = await fetch(API + path, {
    method: "POST",
    headers: { "xi-api-key": key, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 300)}`);
  return res;
}
