// Lists the account's voices (name, id, gender, accent, description) and the
// character quota. Never prints the key.
import { key, API } from "./env.mjs";
const res = await fetch(`${API}/voices`, { headers: { "xi-api-key": key } });
const { voices } = await res.json();
for (const v of voices) {
  const l = v.labels || {};
  console.log(`${v.name.padEnd(26)} ${v.voice_id}  ${[l.gender, l.accent, l.age, l.descriptive || l.description, l.use_case || l["use case"]].filter(Boolean).join(" · ")}`);
}
const sub = await fetch(`${API}/user/subscription`, { headers: { "xi-api-key": key } });
if (sub.ok) { const s = await sub.json(); console.log(`\ncharacters: ${s.character_count}/${s.character_limit}, tier ${s.tier}`); }
