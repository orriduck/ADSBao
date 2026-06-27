// Dev-only in-app performance probe. The headless preview throttles rAF, so
// longtask-based numbers miss the foreground cost of things like the 60fps
// motion loop or a scroll repaint. This measures the real frame cadence (split
// into idle vs scroll), the long-animation-frame script-vs-render breakdown,
// the motion-loop cost, and React commit durations — and keeps a rolling
// per-second HISTORY so you read a trend over a whole gesture, not one noisy
// instant. Paints a compact HUD (bottom-right) with sparklines.
//
// DEV DEFAULT: on. Opt out with `?perf=0` (persisted) or
// `localStorage.adsbaoPerf = "0"`. Re-enable with `?perf=1`.
//
// Backdoor — in dev, `window.__adsbaoPerf` is always present:
//   __adsbaoPerf.enable()    start probe + HUD now (no reload)
//   __adsbaoPerf.disable()   stop + hide
//   __adsbaoPerf.snapshot()  latest 1s window
//   __adsbaoPerf.history()   array of recent per-second windows (a time series)
//   __adsbaoPerf.summary()   idle-vs-scroll aggregates over the whole history
//
// Production pays nothing: everything is gated on import.meta.env.DEV (so it is
// tree-shaken out), and the motion-loop hook is one boolean check per frame.

const IS_DEV = Boolean(import.meta.env?.DEV);
const SCROLL_ACTIVE_MS = 150;
const HISTORY_CAP = 150;
const SPARK = "▁▂▃▄▅▆▇█";

let enabled = false;

type CommitAgg = { count: number; total: number; max: number };
type HistoryRow = {
  fps: number;
  sFps: number | null;
  scr: boolean;
  js: number;
  pt: number;
  p95: number;
  ld: number;
  at: number;
};

const win = {
  start: 0,
  frames: [] as number[],
  scrollFrames: [] as number[],
  motionFrames: 0,
  motionCallbacks: 0,
  motionTime: 0,
  motionMaxCallbacks: 0,
  loafCount: 0,
  loafBlocking: 0,
  loafScript: 0,
  loafRender: 0,
  loafWorst: 0,
  loafWorstAttr: "",
  commits: new Map<string, CommitAgg>(),
};

const history: HistoryRow[] = [];
let lastFrameTs = 0;
let scrollActiveUntil = 0;
let rafId = 0;
let hud: HTMLDivElement | null = null;
let lastSnapshot: ReturnType<typeof buildSnapshot> | null = null;
let loafObserver: PerformanceObserver | null = null;
const onScroll = () => {
  scrollActiveUntil = performance.now() + SCROLL_ACTIVE_MS;
};

export function perfProbeEnabled() {
  return enabled;
}

export function recordMotionFrame(callbackCount: number, durationMs: number) {
  if (!enabled) return;
  win.motionFrames += 1;
  win.motionCallbacks += callbackCount;
  win.motionTime += durationMs;
  if (callbackCount > win.motionMaxCallbacks) win.motionMaxCallbacks = callbackCount;
}

export function recordCommit(id: string, actualDuration: number) {
  if (!enabled) return;
  let agg = win.commits.get(id);
  if (!agg) {
    agg = { count: 0, total: 0, max: 0 };
    win.commits.set(id, agg);
  }
  agg.count += 1;
  agg.total += actualDuration;
  if (actualDuration > agg.max) agg.max = actualDuration;
}

export function perfSnapshot() {
  return lastSnapshot;
}

function resetWindow(now: number) {
  win.start = now;
  win.frames = [];
  win.scrollFrames = [];
  win.motionFrames = 0;
  win.motionCallbacks = 0;
  win.motionTime = 0;
  win.motionMaxCallbacks = 0;
  win.loafCount = 0;
  win.loafBlocking = 0;
  win.loafScript = 0;
  win.loafRender = 0;
  win.loafWorst = 0;
  win.loafWorstAttr = "";
  win.commits = new Map();
}

function round(value: number, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function fpsFrom(frames: number[]) {
  if (!frames.length) return 0;
  const mean = frames.reduce((a, b) => a + b, 0) / frames.length;
  return mean > 0 ? round(1000 / mean) : 0;
}

function pctFrom(frames: number[], p: number) {
  if (!frames.length) return 0;
  const sorted = frames.slice().sort((a, b) => a - b);
  return round(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))], 1);
}

function buildSnapshot(now: number) {
  const frames = win.frames;
  const elapsedSec = (now - win.start) / 1000 || 1;
  const commits = [...win.commits.entries()]
    .map(([id, a]) => ({
      id,
      count: a.count,
      avg: round(a.total / a.count, 1),
      max: round(a.max, 1),
      total: round(a.total),
    }))
    .sort((a, b) => b.total - a.total);
  return {
    fps: fpsFrom(frames),
    scrollFps: win.scrollFrames.length ? fpsFrom(win.scrollFrames) : null,
    scrolling: win.scrollFrames.length > 2,
    frameMs: {
      p50: pctFrom(frames, 0.5),
      p95: pctFrom(frames, 0.95),
      p99: pctFrom(frames, 0.99),
      max: frames.length ? round(Math.max(...frames), 1) : 0,
    },
    scrollFrameMs: {
      p95: pctFrom(win.scrollFrames, 0.95),
      max: win.scrollFrames.length ? round(Math.max(...win.scrollFrames), 1) : 0,
    },
    longFrames: {
      gt16: frames.filter((x) => x > 16.7).length,
      gt32: frames.filter((x) => x > 32).length,
      gt50: frames.filter((x) => x > 50).length,
    },
    // Long Animation Frames: splits the wall-clock of each >50ms frame into the
    // scripting portion (React/JS) vs the rendering portion (style + layout +
    // paint + composite). A scroll repaint shows up as render >> script.
    loaf: {
      count: win.loafCount,
      blockingMs: round(win.loafBlocking),
      scriptMs: round(win.loafScript),
      renderMs: round(win.loafRender),
      worstMs: round(win.loafWorst),
      worstAttr: win.loafWorstAttr,
    },
    motion: {
      framesPerSec: round(win.motionFrames / elapsedSec),
      avgMarkers: win.motionFrames ? round(win.motionCallbacks / win.motionFrames) : 0,
      maxMarkers: win.motionMaxCallbacks,
      msPerFrame: win.motionFrames ? round(win.motionTime / win.motionFrames, 2) : 0,
      msPerSec: round(win.motionTime / elapsedSec),
    },
    commits,
  };
}

function pushHistory(s: NonNullable<typeof lastSnapshot>) {
  history.push({
    fps: s.fps,
    sFps: s.scrollFps,
    scr: s.scrolling,
    js: s.loaf.scriptMs,
    pt: s.loaf.renderMs,
    p95: s.frameMs.p95,
    ld: s.longFrames.gt50,
    at: s.commits.find((c) => c.id === "AircraftTable")?.total ?? 0,
  });
  if (history.length > HISTORY_CAP) history.shift();
}

function median(values: number[]) {
  if (!values.length) return null;
  const a = values.slice().sort((x, y) => x - y);
  return round(a[Math.floor(a.length / 2)], 1);
}

function mean(values: number[]) {
  if (!values.length) return null;
  return round(values.reduce((s, v) => s + v, 0) / values.length, 1);
}

// Aggregate the rolling history into idle-vs-scroll buckets. One read after a
// scroll gesture gives a robust trend instead of a single noisy second.
function summarize() {
  const idle = history.filter((h) => !h.scr);
  const scroll = history.filter((h) => h.scr);
  return {
    seconds: history.length,
    idle: {
      sec: idle.length,
      fpsMed: median(idle.map((h) => h.fps)),
      p95Med: median(idle.map((h) => h.p95)),
    },
    scroll: {
      sec: scroll.length,
      fpsMed: median(scroll.map((h) => h.fps)),
      p95Med: median(scroll.map((h) => h.p95)),
      jsMeanMsPerSec: mean(scroll.map((h) => h.js)),
      paintMeanMsPerSec: mean(scroll.map((h) => h.pt)),
      aircraftTableMeanMs: mean(scroll.map((h) => h.at)),
    },
  };
}

function ensureHud() {
  if (hud || typeof document === "undefined") return;
  hud = document.createElement("div");
  hud.id = "adsbao-perf-hud";
  hud.style.cssText = [
    "position:fixed",
    "right:10px",
    "bottom:10px",
    "z-index:2147483647",
    "pointer-events:none",
    "font:9px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace",
    "letter-spacing:0.2px",
    "white-space:pre",
    "color:rgba(220,238,228,0.92)",
    "background:rgba(10,14,12,0.46)",
    "-webkit-backdrop-filter:blur(7px)",
    "backdrop-filter:blur(7px)",
    "padding:6px 9px",
    "border-radius:8px",
    "border:1px solid rgba(150,255,190,0.16)",
    "box-shadow:0 4px 18px rgba(0,0,0,0.32)",
    "text-align:left",
  ].join(";");
  document.body.appendChild(hud);
}

function removeHud() {
  hud?.remove();
  hud = null;
}

const lead = (label: string) => label.padEnd(7);
const numL = (value: number | string, w: number) => String(value).padStart(w);

// Colored unicode sparkline (HTML). `last` rows of `key`, scaled to `max`.
function spark(key: keyof HistoryRow, max: number, color: (v: number) => string, last = 44) {
  const rows = history.slice(-last);
  if (!rows.length) return "";
  return rows
    .map((h) => {
      const v = Number(h[key]) || 0;
      const i = Math.max(0, Math.min(7, Math.round((v / max) * 7)));
      return `<span style="color:${color(v)}">${SPARK[i]}</span>`;
    })
    .join("");
}

const fpsColor = (v: number) => (v >= 50 ? "#a6f5ba" : v >= 30 ? "#ffe39a" : "#ff9d9d");

function paintHud(s: NonNullable<typeof lastSnapshot>) {
  if (!hud) return;
  const scrollTag =
    s.scrollFps == null ? "" : `   scroll ${s.scrollFps} (p95 ${s.scrollFrameMs.p95}ms)`;
  const pjMax = Math.max(
    20,
    ...history.slice(-44).map((h) => Math.max(h.js, h.pt)),
  );
  const rows = [
    `${lead("perf")}${numL(s.fps, 3)} fps${scrollTag}`,
    `${lead("fps↕")}${spark("fps", 60, fpsColor)}  60s`,
    `${lead("frame")}${numL(s.frameMs.p50, 5)} ${numL(s.frameMs.p95, 5)} ${numL(s.frameMs.p99, 5)} ms p50/95/99`,
    `${lead("loaf")}${numL(s.loaf.count, 3)}f js${numL(s.loaf.scriptMs, 4)} paint${numL(s.loaf.renderMs, 4)} ↑${s.loaf.worstMs}`,
    `${lead("js↕")}${spark("js", pjMax, () => "#9ac8ff")}`,
    `${lead("paint↕")}${spark("pt", pjMax, () => "#ff9ad8")}`,
    `${lead("motion")}${numL(s.motion.avgMarkers, 5)} mk ${numL(s.motion.msPerFrame, 6)} ms/f ${numL(s.motion.msPerSec, 4)} ms/s`,
  ];
  if (s.loaf.worstAttr) rows.push(`  ↑src  ${s.loaf.worstAttr.slice(0, 30)}`);
  if (s.commits.length) {
    rows.push("react   commit/s   avg / max ms");
    for (const c of s.commits.slice(0, 4)) {
      rows.push(
        `  ${c.id.slice(0, 13).padEnd(13)}${numL(c.count, 3)}× ${numL(c.avg, 5)} / ${numL(c.max, 5)}`,
      );
    }
  }
  hud.innerHTML = rows.join("\n");
  hud.style.borderColor = `${fpsColor(s.scrollFps ?? s.fps)}40`;
}

function loop(ts: number) {
  if (lastFrameTs) {
    const delta = ts - lastFrameTs;
    win.frames.push(delta);
    if (ts < scrollActiveUntil) win.scrollFrames.push(delta);
  }
  lastFrameTs = ts;
  if (ts - win.start >= 1000) {
    lastSnapshot = buildSnapshot(ts);
    pushHistory(lastSnapshot);
    paintHud(lastSnapshot);
    resetWindow(ts);
  }
  rafId = requestAnimationFrame(loop);
}

function recordLoaf(entry: any) {
  if (!enabled) return;
  const start = entry.startTime;
  const duration = entry.duration;
  const renderStart = entry.renderStart || 0;
  const script = renderStart > start ? renderStart - start : duration;
  const render = renderStart > start ? start + duration - renderStart : 0;
  win.loafCount += 1;
  win.loafBlocking += entry.blockingDuration || 0;
  win.loafScript += script;
  win.loafRender += render;
  if (duration > win.loafWorst) {
    win.loafWorst = duration;
    const scripts = Array.isArray(entry.scripts) ? entry.scripts : [];
    const top = scripts.reduce(
      (best: any, s: any) => (!best || s.duration > best.duration ? s : best),
      null,
    );
    win.loafWorstAttr = top
      ? String(top.sourceFunctionName || top.invoker || top.name || "")
      : render > script
        ? "(render/paint)"
        : "";
  }
}

function startLoop() {
  if (rafId) return;
  resetWindow(performance.now());
  lastFrameTs = 0;
  rafId = requestAnimationFrame(loop);
  window.addEventListener("scroll", onScroll, { capture: true, passive: true });
  try {
    loafObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) recordLoaf(entry);
    });
    loafObserver.observe({ type: "long-animation-frame", buffered: false } as any);
  } catch {
    loafObserver = null;
  }
}

function stopLoop() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
  window.removeEventListener("scroll", onScroll, { capture: true } as any);
  loafObserver?.disconnect();
  loafObserver = null;
}

function persist(value: "1" | "0") {
  try {
    window.localStorage.setItem("adsbaoPerf", value);
  } catch {
    /* ignore */
  }
}

function enable() {
  if (!IS_DEV || enabled) return;
  enabled = true;
  persist("1");
  history.length = 0;
  ensureHud();
  startLoop();
  console.info("[adsbaoPerf] on — HUD bottom-right · __adsbaoPerf.summary() after a scroll");
}

function disable() {
  enabled = false;
  persist("0");
  stopLoop();
  removeHud();
  console.info("[adsbaoPerf] off");
}

// Dev default: ON unless explicitly turned off (?perf=0 / localStorage "0").
function readInitialFlag() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has("perf")) persist(params.get("perf") === "0" ? "0" : "1");
    return window.localStorage.getItem("adsbaoPerf") !== "0";
  } catch {
    return true;
  }
}

// Called once at startup. In dev the backdoor is always installed so the probe
// can be flipped on from the console without a reload; it auto-starts (dev
// default) unless the flag was turned off.
export function startPerfProbe() {
  if (!IS_DEV || typeof window === "undefined") return;
  (window as any).__adsbaoPerf = {
    enable,
    disable,
    snapshot: () => lastSnapshot,
    history: () => history.slice(),
    summary: () => summarize(),
  };
  if (readInitialFlag()) enable();
}
