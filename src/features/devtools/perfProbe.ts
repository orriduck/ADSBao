// Dev-only in-app performance probe. Establishes a real foreground baseline
// the headless preview can't (its rAF is throttled): it measures the actual
// frame cadence, the imperative aircraft motion-loop cost, and React commit
// durations, and paints a small HUD plus a `window.__adsbaoPerf` snapshot.
//
// Zero-cost in production (gated on import.meta.env.DEV) and when the flag is
// off. Enable with `?perf=1` in the URL (persists to localStorage so it
// survives SPA navigation) or `localStorage.adsbaoPerf = "1"`. Disable with
// `?perf=0` or by clearing the key.

let enabled = false;
try {
  if (import.meta.env?.DEV && typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    if (params.has("perf")) {
      const value = params.get("perf");
      window.localStorage.setItem("adsbaoPerf", value === "0" ? "0" : "1");
    }
    enabled = window.localStorage.getItem("adsbaoPerf") === "1";
  }
} catch {
  enabled = false;
}

export function perfProbeEnabled() {
  return enabled;
}

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
let lastSnapshot: unknown = null;

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
    "left:8px",
    "bottom:8px",
    "z-index:2147483647",
    "pointer-events:none",
    "font:11px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace",
    "white-space:pre",
    "color:#d8ffd8",
    "background:rgba(8,12,10,0.82)",
    "padding:7px 9px",
    "border-radius:8px",
    "border:1px solid rgba(120,255,160,0.25)",
    "box-shadow:0 6px 24px rgba(0,0,0,0.4)",
    "max-width:46ch",
  ].join(";");
  document.body.appendChild(hud);
}

function paintHud(s: ReturnType<typeof buildSnapshot>) {
  if (!hud) return;
  const top = s.commits
    .slice(0, 4)
    .map((c) => `  ${c.id}: ${c.count}× avg${c.avg} max${c.max} Σ${c.total}`)
    .join("\n");
  const fpsColor = s.fps >= 55 ? "#9dffb0" : s.fps >= 40 ? "#ffe08a" : "#ff9a9a";
  hud.style.color = fpsColor;
  hud.textContent =
    `FPS ${s.fps}  frame p50 ${s.frameMs.p50} p95 ${s.frameMs.p95} p99 ${s.frameMs.p99} max ${s.frameMs.max}\n` +
    `long >16:${s.longFrames.gt16} >32:${s.longFrames.gt32} >50:${s.longFrames.gt50}\n` +
    `motion ${s.motion.framesPerSec}fps  mk avg${s.motion.avgMarkers} max${s.motion.maxMarkers}  ${s.motion.msPerFrame}ms/f  ${s.motion.msPerSec}ms/s\n` +
    `react commits/s:\n${top || "  (none)"}`;
}

function tick(ts: number) {
  if (lastFrameTs) win.frames.push(ts - lastFrameTs);
  lastFrameTs = ts;
  if (ts - win.start >= 1000) {
    const snapshot = buildSnapshot(ts);
    lastSnapshot = snapshot;
    (window as any).__adsbaoPerf = { snapshot: () => lastSnapshot };
    paintHud(snapshot);
    resetWindow(ts);
  }
  rafId = requestAnimationFrame(tick);
}

export function startPerfProbe() {
  if (!enabled || rafId || typeof window === "undefined") return;
  ensureHud();
  win.start = performance.now();
  lastFrameTs = 0;
  (window as any).__adsbaoPerf = { snapshot: () => lastSnapshot };
  rafId = requestAnimationFrame(tick);

  console.info("[adsbaoPerf] probe on — HUD bottom-left, window.__adsbaoPerf.snapshot()");
}
