// Minimal Chrome DevTools harness for the capture scripts: launch headless
// Chrome, evaluate JS, click by text, capture screenshots of the page or one
// element, and record a screencast of the page to JPEG frames with timestamps
// (turned into clips with ffmpeg afterwards by scripts/encode.mjs).
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch({ width = 1440, height = 900, extraArgs = [] } = {}) {
  const port = 9600 + Math.floor(Math.random() * 300);
  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      "--autoplay-policy=no-user-gesture-required",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${mkdtempSync(join(tmpdir(), "cascadr-cdp-"))}`,
      `--window-size=${width},${height}`,
      ...extraArgs,
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  let targets = null;
  for (let i = 0; i < 80 && !targets; i++) {
    await sleep(250);
    try {
      targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    } catch {}
  }
  if (!targets) throw new Error("Chrome did not start");
  const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let seq = 0;
  const pending = new Map();
  const listeners = new Map();
  const consoleLines = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m);
      pending.delete(m.id);
      return;
    }
    if (m.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(m.params.type)) {
      const text = m.params.args.map((a) => a.value ?? a.description ?? "").join(" ");
      consoleLines.push(`${m.params.type}: ${text}`.slice(0, 300));
    }
    if (m.method === "Runtime.exceptionThrown") {
      consoleLines.push(`exception: ${m.params.exceptionDetails?.exception?.description ?? m.params.exceptionDetails?.text}`.slice(0, 300));
    }
    for (const fn of listeners.get(m.method) ?? []) fn(m.params);
  };
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = ++seq;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  const on = (method, fn) => {
    if (!listeners.has(method)) listeners.set(method, []);
    listeners.get(method).push(fn);
  };
  const js = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text);
    return r.result?.result?.value;
  };
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 700 });

  const api = {
    send,
    js,
    on,
    consoleLines,
    async goto(url, settle = 4000) {
      await send("Page.navigate", { url });
      await sleep(settle);
    },
    click: (text, scope = "button") =>
      js(`(() => { const b = [...document.querySelectorAll(${JSON.stringify(scope)})].find((b) => b.textContent.trim().startsWith(${JSON.stringify(text)}) && !b.disabled); if (!b) return false; b.click(); return true; })()`),
    /** Bounding rect (CSS px, viewport-relative) of the element an expression returns. */
    rectOf: (finder) =>
      js(`(() => { const e = ${finder}; if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) }; })()`),
    rect: (selector) => api.rectOf(`document.querySelector(${JSON.stringify(selector)})`),
    /**
     * PNG of the viewport, or of one element (a JS expression returning it). The
     * clip is in CSS px; the image comes back at the window's device scale.
     */
    async shot(path, finder, { beyond = false } = {}) {
      let clip = finder ? await api.rectOf(finder) : null;
      if (finder && !clip) throw new Error("shot: element not found: " + finder.slice(0, 80));
      // Beyond the viewport the clip is in document coordinates.
      if (clip && beyond) clip = { ...clip, ...(await js(`({ x: ${clip.x} + scrollX, y: ${clip.y} + scrollY })`)) };
      const r = await send(
        "Page.captureScreenshot",
        clip ? { format: "png", clip: { ...clip, scale: 1 }, captureBeyondViewport: beyond } : { format: "png" },
      );
      writeFileSync(path, Buffer.from(r.result.data, "base64"));
    },
    /** Records the page as JPEG frames into `dir`; returns stop() -> frame list [{file, t}]. */
    async screencast(dir, { maxWidth, maxHeight } = {}) {
      mkdirSync(dir, { recursive: true });
      const frames = [];
      let active = true;
      on("Page.screencastFrame", (p) => {
        if (!active) return;
        const file = join(dir, `f${String(frames.length).padStart(5, "0")}.jpg`);
        writeFileSync(file, Buffer.from(p.data, "base64"));
        frames.push({ file, t: p.metadata.timestamp });
        send("Page.screencastFrameAck", { sessionId: p.sessionId });
      });
      // Without maxWidth/maxHeight the screencast comes back at CSS viewport size,
      // ignoring the device scale, which is too soft for a 4K master.
      await send("Page.startScreencast", { format: "jpeg", quality: 92, everyNthFrame: 1, ...(maxWidth ? { maxWidth, maxHeight } : {}) });
      return async () => {
        active = false;
        await send("Page.stopScreencast");
        // A still page sends no new frames: hold the last one until the stop, so
        // the clip keeps its full wall-clock length.
        if (frames.length) frames.push({ file: frames[frames.length - 1].file, t: Date.now() / 1000 });
        writeFileSync(join(dir, "frames.json"), JSON.stringify(frames));
        return frames;
      };
    },
    close() {
      try { ws.close(); } catch {}
      chrome.kill("SIGKILL");
    },
  };
  return api;
}

/** ffmpeg concat list with real per-frame durations, so the clip plays at wall-clock speed. */
export function concatList(frames, speed = 1) {
  let out = "";
  for (let i = 0; i < frames.length; i++) {
    const next = frames[i + 1];
    const d = next ? Math.max(0.01, (next.t - frames[i].t) / speed) : 0.1;
    out += `file '${frames[i].file}'\nduration ${d.toFixed(3)}\n`;
  }
  if (frames.length) out += `file '${frames[frames.length - 1].file}'\n`;
  return out;
}
