// Records the real Inktoll app for the demo film, against LIVE production data on
// Arc mainnet (the first real payment landed 2026-10-14 19:44 UTC).
//   node scripts/capture.mjs                 all clips
//   ONLY=graph,receipt node scripts/capture.mjs
// Output: .cache/frames/<clip>/ (JPEG screencast + frames.json), .cache/marks.json,
// .cache/meta.json (element rects in CSS px), stills in public/stills/.
// Window is 1600x900 CSS px at device scale 2, so frames are 3200x1800 and a rect
// {x,y,width,height} in CSS px maps to video pixels by multiplying by 2.
//
// Read-only: it visits public pages and never submits a form.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { launch, sleep } from "./cdp.mjs";

const BASE = process.env.BASE || "https://www.inktoll.xyz";
const RECEIPT_ID = process.env.RECEIPT_ID || "48cba8af-eaab-412e-bd04-7f750294fc8f";
const ROOT = resolve(new URL("..", import.meta.url).pathname);
const FRAMES = join(ROOT, ".cache/frames");
const STILLS = join(ROOT, "public/stills");
const VIEW = { w: 1600, h: 900 }, SCALE = 2;
const ONLY = process.env.ONLY?.split(",");
const want = (c) => !ONLY || ONLY.includes(c);
mkdirSync(FRAMES, { recursive: true });
mkdirSync(STILLS, { recursive: true });

const t0 = Date.now();
const log = (...a) => console.log(`+${((Date.now() - t0) / 1000).toFixed(0)}s`, ...a);
const readJson = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : {});
const marks = readJson(join(ROOT, ".cache/marks.json"));
const meta = readJson(join(ROOT, ".cache/meta.json"));
const mark = (k) => { marks[k] = Date.now() / 1000; log("mark", k); };

// Hide any dev overlay, force the dark theme the brand uses, and give the film an
// eased-scroll helper. No visible cursor: these clips are camera moves, not clicks.
const PREP = `(() => {
  window.__ease = (el, prop, to, ms) => new Promise((done) => {
    const from = el[prop]; const start = performance.now();
    const f = (t) => (t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2);
    const step = (now) => { const p = Math.min(1,(now-start)/ms); el[prop] = from+(to-from)*f(p); if(p<1) requestAnimationFrame(step); else done(el[prop]); };
    requestAnimationFrame(step);
  });
  const s = document.createElement('style');
  s.textContent = 'nextjs-portal,#__next-build-watcher{display:none!important}*{scrollbar-width:none!important}::-webkit-scrollbar{display:none!important}';
  document.head.appendChild(s);
  try { document.documentElement.removeAttribute('data-theme'); } catch {}
})()`;

const page = await launch({ width: VIEW.w, height: VIEW.h });
await page.send("Emulation.setDeviceMetricsOverride", { width: VIEW.w, height: VIEW.h, deviceScaleFactor: SCALE, mobile: false });

async function clip(name, fn, { settle = 5000 } = {}) {
  if (!want(name)) return log(`${name}: skip`);
  const dir = join(FRAMES, name);
  await page.goto(`${BASE}${fn.path}`, settle);
  await page.js(PREP);
  await sleep(900); // let fonts, canvas and data settle before the first frame
  const stop = await page.screencast(dir, { maxWidth: VIEW.w * SCALE, maxHeight: VIEW.h * SCALE });
  try { await fn.run(); } catch (e) { log(`${name}: WARN ${e.message?.slice(0, 120)}`); }
  const frames = await stop();
  if (fn.rects) { meta[name] = { scale: SCALE, rects: {} };
    for (const [k, sel] of Object.entries(fn.rects)) {
      try { meta[name].rects[k] = await page.rect(sel); } catch {}
    } }
  await page.shot(join(STILLS, `${name}.png`));
  log(`${name}: ${frames.length} frames`);
}

const scrollTo = (y, ms) => page.js(`__ease(document.scrollingElement,'scrollTop',${y},${ms})`);

// 1. Landing: the thesis, and the economy totals that are now non-zero.
await clip("landing", { path: "/", rects: { nav: "nav, header" }, async run() {
  await sleep(2200); mark("landing_hero");
  await scrollTo(620, 2600); await sleep(1600); mark("landing_stats");
  await scrollTo(1240, 2400); await sleep(1500);
} });

// 2. The agent's own feed, showing the article it actually bought. The page keys
// identity off localStorage, so we seed the real uid that owns agent wallet
// 0x69167ae8..42b66 and reload: this is that user's genuine purchased feed.
const AGENT_UID = process.env.AGENT_UID || "0xcd0a2370f2dc12c1802707b7d9ab3fec891e3c02";
if (want("feed")) {
  await page.goto(`${BASE}/reader/feed`, 3000);
  await page.js(`localStorage.setItem('inktoll_connected_address', ${JSON.stringify(AGENT_UID)})`);
}
await clip("feed", { path: "/reader/feed", async run() {
  await sleep(3200); mark("feed_article");
  await scrollTo(380, 2200); await sleep(2400);
} }, { settle: 6000 });

// 3. The Royalty Graph: one creator, one agent, one real edge, drifting.
await clip("graph", { path: "/graph", async run() {
  await sleep(7000); mark("graph_settled");
  await sleep(5000);
} }, { settle: 7000 });

// 4. The receipt for the first mainnet payment.
await clip("receipt", { path: `/receipt/${RECEIPT_ID}`, async run() {
  await sleep(3000); mark("receipt_shown");
  await scrollTo(320, 2200); await sleep(2400);
} });

// 5. Creator onboarding (form shown, never submitted).
await clip("onboard", { path: "/creator/onboard", async run() {
  await sleep(2600); mark("onboard_form");
  await scrollTo(300, 2000); await sleep(1800);
} });

// 6. Leaderboard: the first creator with real earnings.
await clip("leaderboard", { path: "/leaderboard", async run() {
  await sleep(2600); mark("leaderboard");
  await scrollTo(420, 2200); await sleep(1800);
} });

writeFileSync(join(ROOT, ".cache/marks.json"), JSON.stringify(marks, null, 1));
writeFileSync(join(ROOT, ".cache/meta.json"), JSON.stringify(meta, null, 1));
if (page.consoleLines.length) { console.log("\npage errors:"); for (const l of page.consoleLines.slice(0, 12)) console.log("  " + l); }
page.close();
log("capture done");
