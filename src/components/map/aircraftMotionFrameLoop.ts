import { perfProbeEnabled, recordMotionFrame } from "@/features/devtools/perfProbe";

type MotionFrameCallback = (now: number) => boolean | void;

const callbacks = new Set<MotionFrameCallback>();
let frameId: number | null = null;

function requestNextFrame() {
  if (
    frameId != null ||
    callbacks.size === 0 ||
    typeof requestAnimationFrame !== "function"
  ) {
    return;
  }
  frameId = requestAnimationFrame(runFrame);
}

function cancelCurrentFrameIfIdle() {
  if (
    callbacks.size !== 0 ||
    frameId == null ||
    typeof cancelAnimationFrame !== "function"
  ) {
    return;
  }
  cancelAnimationFrame(frameId);
  frameId = null;
}

function runFrame() {
  frameId = null;
  const now = Date.now();
  const probe = perfProbeEnabled();
  const startedAt = probe ? performance.now() : 0;
  let invoked = 0;
  for (const callback of Array.from(callbacks)) {
    if (!callbacks.has(callback)) continue;
    invoked += 1;
    if (callback(now) === false) callbacks.delete(callback);
  }
  if (probe) recordMotionFrame(invoked, performance.now() - startedAt);
  requestNextFrame();
}

export function subscribeAircraftMotionFrame(callback: MotionFrameCallback) {
  callbacks.add(callback);
  requestNextFrame();

  return () => {
    callbacks.delete(callback);
    cancelCurrentFrameIfIdle();
  };
}
