const LOST_SIGNAL_MISS_THRESHOLD = 20;

const ACTIVE_FLIGHTAWARE_STATUS =
  /\b(enroute|airborne|in[-\s]?flight|departed|active)\b/i;
const TERMINAL_FLIGHTAWARE_STATUS =
  /\b(arrived|landed|cancelled|canceled|diverted|result unknown)\b/i;

export function getActiveAdsbMatchesLength({ matchesLength = 0, source = "" } = {}) {
  if (String(source || "").trim().toLowerCase() === "flightaware") return 0;
  return Math.max(0, Number(matchesLength) || 0);
}

export function hasTerminalFlightAwareFallback(fallback) {
  if (!fallback || typeof fallback !== "object") return false;
  if (fallback.ok !== true) return false;
  if (
    fallback.position?.terminal === true ||
    fallback.position?.quality?.terminal === true ||
    fallback.metadata?.terminal === true
  ) {
    return true;
  }

  const status = String(
    fallback.metadata?.status ||
      fallback.position?.status ||
      fallback.position?.quality?.status ||
      "",
  ).trim();
  return TERMINAL_FLIGHTAWARE_STATUS.test(status);
}

function getLostSignalTraceRefreshKey({
  lostSignal = false,
  pollVersion = 0,
} = {}) {
  const version = Number(pollVersion);
  if (!lostSignal || !Number.isFinite(version) || version <= 0) return "";
  return `lost-signal:${version}`;
}

export function getTrackedFlightTraceRefreshKey({
  lostSignal = false,
  pollVersion = 0,
  visibilityRefreshVersion = 0,
  trackingState = null,
  pollMs = 3_000,
  flightAwareTraceRefreshMs = 60_000,
} = {}) {
  const visibilityVersion = Number(visibilityRefreshVersion);
  if (Number.isFinite(visibilityVersion) && visibilityVersion > 0) {
    return `visibility:${visibilityVersion}`;
  }
  const flightAwareKey = getFlightAwareTraceRefreshKey({
    trackingState,
    pollVersion,
    pollMs,
    flightAwareTraceRefreshMs,
  });
  if (flightAwareKey) return flightAwareKey;
  return getLostSignalTraceRefreshKey({ lostSignal, pollVersion });
}

function getFlightAwareTraceRefreshKey({
  trackingState = null,
  pollVersion = 0,
  pollMs = 3_000,
  flightAwareTraceRefreshMs = 60_000,
} = {}) {
  const trackingStatus = String(trackingState?.status || "").trim();
  if (trackingStatus !== "flightaware_active") return "";
  const version = Number(pollVersion);
  const intervalMs = Math.max(1, Number(pollMs) || 1);
  const refreshMs = Math.max(intervalMs, Number(flightAwareTraceRefreshMs) || intervalMs);
  if (!Number.isFinite(version) || version <= 0) return "";
  const bucket = Math.floor((version * intervalMs) / refreshMs);
  return bucket > 0 ? `flightaware:${bucket}` : "";
}

export function hasActiveFlightAwareFallback(fallback) {
  if (!fallback || typeof fallback !== "object") return false;
  if (fallback.ok !== true) return false;
  if (hasTerminalFlightAwareFallback(fallback)) return false;
  if (fallback.hasPosition === true) return true;

  const status = String(
    fallback.metadata?.status || fallback.position?.quality?.status || "",
  ).trim();
  return ACTIVE_FLIGHTAWARE_STATUS.test(status);
}

export function getTrackedAircraftSignalState({
  matchesLength = 0,
  previousMisses = 0,
  flightAwareFallback = null,
  trackingState = null,
  threshold = LOST_SIGNAL_MISS_THRESHOLD,
} = {}) {
  const normalizedThreshold = Math.max(1, Number(threshold) || 1);
  const trackingStatus = String(trackingState?.status || "").trim();
  if (trackingStatus === "adsb_live" || trackingStatus === "flightaware_active") {
    return { misses: 0, lostSignal: false };
  }
  if (trackingStatus === "flightaware_terminal") {
    return { misses: normalizedThreshold, lostSignal: true };
  }
  if (trackingStatus === "stale" || trackingStatus === "missing") {
    const misses = Math.max(0, Number(previousMisses) || 0) + 1;
    return {
      misses,
      lostSignal: misses >= normalizedThreshold,
    };
  }
  if (Number(matchesLength) > 0) {
    return { misses: 0, lostSignal: false };
  }
  if (hasTerminalFlightAwareFallback(flightAwareFallback)) {
    return { misses: normalizedThreshold, lostSignal: true };
  }
  if (hasActiveFlightAwareFallback(flightAwareFallback)) {
    return { misses: 0, lostSignal: false };
  }

  const misses = Math.max(0, Number(previousMisses) || 0) + 1;
  return {
    misses,
    lostSignal: misses >= normalizedThreshold,
  };
}
