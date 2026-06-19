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

function runFrame(now: number) {
  frameId = null;
  for (const callback of Array.from(callbacks)) {
    if (!callbacks.has(callback)) continue;
    if (callback(now) === false) callbacks.delete(callback);
  }
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
