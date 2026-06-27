// Dev-only in-app performance probe. The headless preview throttles rAF, so
// longtask-based numbers miss the foreground cost of the 60fps aircraft motion
// loop. This measures the real frame cadence, the motion-loop cost, and React
// commit durations, paints a compact HUD (bottom-right), and exposes a snapshot.
//
// Enable from the URL with `?perf=1` (persisted to localStorage so it survives
// SPA navigation), or `localStorage.adsbaoPerf = "1"`.
//
// Backdoor — in dev, `window.__adsbaoPerf` is ALWAYS present, even when off:
//   __adsbaoPerf.enable()    start probe + HUD now (no reload)
//   __adsbaoPerf.disable()   stop + hide
//   __adsbaoPerf.snapshot()  latest 1s window as a plain object
//
// Production pays nothing: everything is gated on import.meta.env.DEV (so it is
// tree-shaken out), and the motion-loop hook is one boolean check per frame.

const IS_DEV = Boolean(import.meta.env?.DEV);

let enabled = false;

type CommitAgg = { count: number; total: number; max: number };

const win = {
  start: 0,
  frames: [] as number[],
  motionFrames: 0,
  motionCallbacks: 0,
  motionTime: 0,
  motionMaxCallbacks: 0,
  commits: new Map<string, CommitAgg>(),
};

let lastFrameTs = 0;
let rafId = 0;
let hud: HTMLDivElement | null = null;
let lastSnapshot: ReturnType<typeof buildSnapshot> | null = null;

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
  win.motionFrames = 0;
  win.motionCallbacks = 0;
  win.motionTime = 0;
  win.motionMaxCallbacks = 0;
  win.commits = new Map();
}

function round(value: number, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function buildSnapshot(now: number) {
  const frames = win.frames.slice().sort((a, b) => a - b);
  const fc = frames.length;
  const elapsedSec = (now - win.start) / 1000 || 1;
  const pct = (p: number) =>
    fc ? round(frames[Math.min(fc - 1, Math.floor(fc * p))], 1) : 0;
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
    fps: round(fc / elapsedSec),
    frameMs: {
      p50: pct(0.5),
      p95: pct(0.95),
      p99: pct(0.99),
      max: fc ? round(frames[fc - 1], 1) : 0,
    },
    longFrames: {
      gt16: frames.filter((x) => x > 16.7).length,
      gt32: frames.filter((x) => x > 32).length,
      gt50: frames.filter((x) => x > 50).length,
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

function paintHud(s: NonNullable<typeof lastSnapshot>) {
  if (!hud) return;
  const fpsColor = s.fps >= 55 ? "#a6f5ba" : s.fps >= 40 ? "#ffe39a" : "#ff9d9d";
  const rows = [
    `${lead("perf")}${numL(s.fps, 3)} fps`,
    `${lead("frame")}${numL(s.frameMs.p50, 5)} ${numL(s.frameMs.p95, 5)} ${numL(s.frameMs.p99, 5)} ms  p50/95/99`,
    `${lead("jank")}${numL(s.longFrames.gt16, 5)} ${numL(s.longFrames.gt32, 5)} ${numL(s.longFrames.gt50, 5)}    >16/32/50`,
    `${lead("motion")}${numL(s.motion.avgMarkers, 5)} mk ${numL(s.motion.msPerFrame, 6)} ms/f ${numL(s.motion.msPerSec, 4)} ms/s`,
  ];
  if (s.commits.length) {
    rows.push("react   commit/s   avg  /  max ms");
    for (const c of s.commits.slice(0, 4)) {
      rows.push(
        `  ${c.id.slice(0, 13).padEnd(13)}${numL(c.count, 3)}× ${numL(c.avg, 5)} / ${numL(c.max, 5)}`,
      );
    }
  }
  hud.style.color = "rgba(220,238,228,0.92)";
  hud.textContent = rows.join("\n");
  // Color just the fps figure by tinting the border so the row stays legible.
  hud.style.borderColor = `${fpsColor}40`;
}

function loop(ts: number) {
  if (lastFrameTs) win.frames.push(ts - lastFrameTs);
  lastFrameTs = ts;
  if (ts - win.start >= 1000) {
    lastSnapshot = buildSnapshot(ts);
    paintHud(lastSnapshot);
    resetWindow(ts);
  }
  rafId = requestAnimationFrame(loop);
}

function startLoop() {
  if (rafId) return;
  resetWindow(performance.now());
  lastFrameTs = 0;
  rafId = requestAnimationFrame(loop);
}

function stopLoop() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
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
  ensureHud();
  startLoop();
  console.info("[adsbaoPerf] on — HUD bottom-right · window.__adsbaoPerf.snapshot()");
}

function disable() {
  enabled = false;
  persist("0");
  stopLoop();
  removeHud();
  console.info("[adsbaoPerf] off");
}

function readInitialFlag() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has("perf")) persist(params.get("perf") === "0" ? "0" : "1");
    return window.localStorage.getItem("adsbaoPerf") === "1";
  } catch {
    return false;
  }
}

// Called once at startup. In dev the backdoor is always installed so the probe
// can be flipped on from the console without a reload; it auto-starts when the
// flag is already set.
export function startPerfProbe() {
  if (!IS_DEV || typeof window === "undefined") return;
  (window as any).__adsbaoPerf = { enable, disable, snapshot: () => lastSnapshot };
  if (readInitialFlag()) enable();
}
