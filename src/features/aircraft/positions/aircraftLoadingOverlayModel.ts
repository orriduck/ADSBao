export const AIRCRAFT_LOADING_OVERLAY_MIN_VISIBLE_MS = 220;

type LoadingSettledOptions = {
  aircraftPositionsSettled?: boolean;
  metarSettled?: boolean;
  nearbyAirportsSettled?: boolean;
  routeSettled?: boolean;
  aircraftLogoSettled?: boolean;
};

type AircraftLoadingOverlayVisibilityOptions = {
  initialLoading?: boolean;
  visibilityRefreshLoading?: boolean;
};

type AircraftLoadingOverlayStateOptions = {
  mapReady?: boolean;
  feedLoading?: boolean;
  variant?: "airport" | "flight";
  trackedAircraftLoading?: boolean;
  trafficLoading?: boolean;
  weatherLoading?: boolean;
  nearbyAirportsLoading?: boolean;
  routeLoadingCount?: number;
  traceLoading?: boolean;
};

type MapLoadingPresentationOptions = {
  active?: boolean;
  mode?: string;
  reason?: string;
};

type MapSurfaceVisibilityOptions = {
  loadingOverlayVisible?: boolean;
  loadingOverlayExiting?: boolean;
};

type VisibilityRefreshOverlayOptions = {
  wasActive?: boolean;
  hiddenSince?: number;
  now?: number;
  minHiddenMs?: number;
};

type LoadingOverlayExitDelayOptions = {
  shownAt?: number;
  now?: number;
  minVisibleMs?: number;
};

type OverlayPaintSchedulerOptions = {
  requestAnimationFrame?: typeof globalThis.requestAnimationFrame;
  cancelAnimationFrame?: typeof globalThis.cancelAnimationFrame;
  setTimeout?: typeof globalThis.setTimeout;
  clearTimeout?: typeof globalThis.clearTimeout;
};

type PageVisibleReplayOptions = {
  documentHidden?: boolean;
  eventPersisted?: boolean;
  wasHidden?: boolean;
  hiddenSince?: number;
  now?: number;
  minHiddenMs?: number;
};

export function areCriticalLoadingRequestsSettled({
  aircraftPositionsSettled = false,
  metarSettled = false,
  nearbyAirportsSettled = false,
}: LoadingSettledOptions = {}) {
  return Boolean(
    aircraftPositionsSettled &&
      metarSettled &&
      nearbyAirportsSettled,
  );
}

export function shouldShowAircraftLoadingOverlay({
  initialLoading = false,
  visibilityRefreshLoading = false,
}: AircraftLoadingOverlayVisibilityOptions = {}) {
  return Boolean(initialLoading || visibilityRefreshLoading);
}

export function resolveAircraftLoadingOverlayState({
  mapReady = false,
  variant = "airport",
  feedLoading = false,
  trackedAircraftLoading = false,
  trafficLoading = false,
  weatherLoading = false,
  nearbyAirportsLoading = false,
  routeLoadingCount = 0,
  traceLoading = false,
}: AircraftLoadingOverlayStateOptions = {}) {
  if (!mapReady) return { active: true, mode: "map", reason: "map" };

  const isFlight = variant === "flight";
  const orderedSources = [
    isFlight
      ? ["trackedAircraft", trackedAircraftLoading || feedLoading]
      : ["traffic", trafficLoading || feedLoading],
    ["weather", weatherLoading],
    ["nearbyAirports", nearbyAirportsLoading],
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
}: MapLoadingPresentationOptions = {}) {
  const overlayActive = Boolean(active && mode === "map");
  return {
    overlayActive,
    sourceStatusActive: Boolean(active && reason && !overlayActive),
  };
}

export function resolveMapSurfaceVisibility({
  loadingOverlayVisible = false,
  loadingOverlayExiting = false,
}: MapSurfaceVisibilityOptions = {}) {
  return {
    mapVisible: !loadingOverlayVisible || loadingOverlayExiting,
  };
}

export function shouldTriggerVisibilityRefreshOverlay({
  wasActive = false,
  hiddenSince = 0,
  now = Date.now(),
  minHiddenMs = 0,
}: VisibilityRefreshOverlayOptions = {}) {
  const hiddenDuration = Math.max(0, Number(now) - Number(hiddenSince));
  return Boolean(wasActive && hiddenSince > 0 && hiddenDuration >= minHiddenMs);
}

export function getLoadingOverlayExitDelay({
  shownAt = 0,
  now = Date.now(),
  minVisibleMs = AIRCRAFT_LOADING_OVERLAY_MIN_VISIBLE_MS,
}: LoadingOverlayExitDelayOptions = {}) {
  return Math.max(0, minVisibleMs - Math.max(0, now - shownAt));
}

export function shouldReplayLoadingOverlayOnPageVisible({
  documentHidden = false,
  eventPersisted = false,
  wasHidden = false,
  hiddenSince = 0,
  now = Date.now(),
  minHiddenMs = 15_000,
}: PageVisibleReplayOptions = {}) {
  if (documentHidden) return false;
  if (eventPersisted) return true;
  return shouldTriggerVisibilityRefreshOverlay({
    wasActive: wasHidden,
    hiddenSince,
    now,
    minHiddenMs,
  });
}

export function scheduleAfterOverlayPaint(
  callback: () => void,
  {
    requestAnimationFrame = globalThis.requestAnimationFrame?.bind(globalThis),
    cancelAnimationFrame = globalThis.cancelAnimationFrame?.bind(globalThis),
    setTimeout = globalThis.setTimeout?.bind(globalThis),
    clearTimeout = globalThis.clearTimeout?.bind(globalThis),
  }: OverlayPaintSchedulerOptions = {},
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
