export const AIRCRAFT_LOADING_OVERLAY_MIN_VISIBLE_MS = 500;

export function areCriticalLoadingRequestsSettled({
  aircraftPositionsSettled = false,
  metarSettled = false,
  nearbyAirportsSettled = false,
  proceduresSettled = false,
} = {}) {
  return Boolean(
    aircraftPositionsSettled &&
      metarSettled &&
      nearbyAirportsSettled &&
      proceduresSettled,
  );
}

export function shouldShowAircraftLoadingOverlay({
  initialLoading = false,
  visibilityRefreshLoading = false,
} = {}) {
  return Boolean(initialLoading || visibilityRefreshLoading);
}

export function shouldTriggerVisibilityRefreshOverlay({
  wasActive = false,
} = {}) {
  return Boolean(wasActive);
}

export function getLoadingOverlayExitDelay({
  shownAt = 0,
  now = Date.now(),
  minVisibleMs = AIRCRAFT_LOADING_OVERLAY_MIN_VISIBLE_MS,
} = {}) {
  return Math.max(0, minVisibleMs - Math.max(0, now - shownAt));
}

export function scheduleAfterOverlayPaint(
  callback,
  {
    requestAnimationFrame = globalThis.requestAnimationFrame?.bind(globalThis),
    cancelAnimationFrame = globalThis.cancelAnimationFrame?.bind(globalThis),
    setTimeout = globalThis.setTimeout?.bind(globalThis),
    clearTimeout = globalThis.clearTimeout?.bind(globalThis),
  } = {},
) {
  if (
    typeof requestAnimationFrame === "function" &&
    typeof cancelAnimationFrame === "function"
  ) {
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(callback);
    });

    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame) cancelAnimationFrame(secondFrame);
    };
  }

  if (typeof setTimeout !== "function") {
    callback();
    return () => {};
  }

  const timeout = setTimeout(callback, 0);
  return () => {
    if (typeof clearTimeout === "function") clearTimeout(timeout);
  };
}
