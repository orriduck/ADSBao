export const AIRCRAFT_LOADING_OVERLAY_MIN_VISIBLE_MS = 500;

type LoadingOverlayRecord = Record<string, any>;

export function areCriticalLoadingRequestsSettled({
  aircraftPositionsSettled = false,
  metarSettled = false,
  nearbyAirportsSettled = false,
  proceduresSettled = false,
}: LoadingOverlayRecord = {}) {
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
}: LoadingOverlayRecord = {}) {
  return Boolean(initialLoading || visibilityRefreshLoading);
}

export function resolveAircraftLoadingOverlayMode({
  mapReady = false,
  feedLoading = false,
}: LoadingOverlayRecord = {}) {
  if (!mapReady) return "map";
  if (feedLoading) return "feed";
  return "idle";
}

export function resolveAircraftLoadingOverlayState({
  mapReady = false,
  variant = "airport",
  feedLoading = false,
  trackedAircraftLoading = false,
  trafficLoading = false,
  weatherLoading = false,
  nearbyAirportsLoading = false,
  proceduresLoading = false,
  routeLoadingCount = 0,
  traceLoading = false,
}: LoadingOverlayRecord = {}) {
  if (!mapReady) return { active: true, mode: "map", reason: "map" };

  const isFlight = variant === "flight";
  const orderedSources = [
    isFlight
      ? ["trackedAircraft", trackedAircraftLoading || feedLoading]
      : ["traffic", trafficLoading || feedLoading],
    ["weather", weatherLoading],
    ["nearbyAirports", nearbyAirportsLoading],
    ["procedures", proceduresLoading],
    ["routes", Number(routeLoadingCount) > 0],
    ["trace", traceLoading],
  ];

  const activeSource = orderedSources.find(([, active]) => Boolean(active));
  if (!activeSource) return { active: false, mode: "idle", reason: "" };
  return { active: true, mode: "feed", reason: activeSource[0] };
}

export function resolveMapLoadingPresentation({
  active = false,
  mode = "idle",
  reason = "",
}: LoadingOverlayRecord = {}) {
  const overlayActive = Boolean(active && mode === "map");
  return {
    overlayActive,
    sourceStatusActive: Boolean(active && reason && !overlayActive),
  };
}

export function shouldTriggerVisibilityRefreshOverlay({
  wasActive = false,
  hiddenSince = 0,
  now = Date.now(),
  minHiddenMs = 0,
}: LoadingOverlayRecord = {}) {
  const hiddenDuration = Math.max(0, Number(now) - Number(hiddenSince));
  return Boolean(wasActive && hiddenSince > 0 && hiddenDuration >= minHiddenMs);
}

export function getLoadingOverlayExitDelay({
  shownAt = 0,
  now = Date.now(),
  minVisibleMs = AIRCRAFT_LOADING_OVERLAY_MIN_VISIBLE_MS,
}: LoadingOverlayRecord = {}) {
  return Math.max(0, minVisibleMs - Math.max(0, now - shownAt));
}

export function scheduleAfterOverlayPaint(
  callback: () => void,
  {
    requestAnimationFrame = globalThis.requestAnimationFrame?.bind(globalThis),
    cancelAnimationFrame = globalThis.cancelAnimationFrame?.bind(globalThis),
    setTimeout = globalThis.setTimeout?.bind(globalThis),
    clearTimeout = globalThis.clearTimeout?.bind(globalThis),
  }: LoadingOverlayRecord = {},
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
