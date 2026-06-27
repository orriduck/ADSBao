// Dev monitoring scaffold for the canvas aircraft renderer. Gated by
// `?canvasStats=1` so it ships nothing for normal users but can be flipped on in
// any build (incl. production) to watch the renderer under load. Reports the
// numbers we tune against: per-frame draw time, the renderer's own draw cadence,
// how many planes were drawn, the active throttle interval, and sprite-cache
// size. Screen-level fps / flame charts still come from Chrome traces.

interface FrameSample {
  drawMs: number;
  drawn: number;
  intervalMs: number;
  spriteCacheSize: number;
}

let enabled: boolean | null = null;

function isEnabled(): boolean {
  if (enabled !== null) return enabled;
  try {
    const params = new URLSearchParams(window.location.search);
    enabled = params.get("canvasStats") === "1";
  } catch {
    enabled = false;
  }
  return enabled;
}

const drawTimes: number[] = [];
const frameStamps: number[] = [];
let lastSample: FrameSample = {
  drawMs: 0,
  drawn: 0,
  intervalMs: 0,
  spriteCacheSize: 0,
};
let overlay: HTMLElement | null = null;
let lastPaint = 0;

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function ensureOverlay(): HTMLElement | null {
  if (overlay || typeof document === "undefined") return overlay;
  const el = document.createElement("div");
  el.style.cssText = [
    "position:fixed",
    "top:8px",
    "left:8px",
    "z-index:99999",
    "padding:6px 9px",
    "border-radius:8px",
    "font:11px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace",
    "color:#e8f6ff",
    "background:rgba(8,12,18,0.82)",
    "border:1px solid rgba(120,180,255,0.35)",
    "white-space:pre",
    "pointer-events:none",
    "letter-spacing:0.2px",
  ].join(";");
  document.body.appendChild(el);
  overlay = el;
  return overlay;
}

function paint() {
  const el = ensureOverlay();
  if (!el) return;
  const drawsPerSec = frameStamps.length;
  const avg = drawTimes.length
    ? drawTimes.reduce((a, b) => a + b, 0) / drawTimes.length
    : 0;
  const max = drawTimes.length ? Math.max(...drawTimes) : 0;
  el.textContent =
    `aircraft canvas\n` +
    `draw  ${avg.toFixed(2)}ms avg · ${max.toFixed(2)}ms max\n` +
    `rate  ${drawsPerSec}/s draw · ${lastSample.intervalMs}ms throttle\n` +
    `count ${lastSample.drawn} drawn · ${lastSample.spriteCacheSize} sprites`;
}

/** Called by the layer once per draw. No-op unless `?canvasStats=1`. */
export function recordAircraftCanvasFrame(sample: FrameSample) {
  if (!isEnabled()) return;
  const t = nowMs();
  drawTimes.push(sample.drawMs);
  if (drawTimes.length > 90) drawTimes.shift();
  frameStamps.push(t);
  while (frameStamps.length && t - frameStamps[0] > 1000) frameStamps.shift();
  lastSample = sample;
  if (t - lastPaint > 200) {
    lastPaint = t;
    paint();
  }
}
