export const LOST_SIGNAL_MISS_THRESHOLD = 20;

const ACTIVE_FLIGHTAWARE_STATUS =
  /\b(enroute|airborne|in[-\s]?flight|departed|active)\b/i;

export function getLostSignalTraceRefreshKey({
  lostSignal = false,
  pollVersion = 0,
} = {}) {
  const version = Number(pollVersion);
  if (!lostSignal || !Number.isFinite(version) || version <= 0) return "";
  return `lost-signal:${version}`;
}

export function hasActiveFlightAwareFallback(fallback) {
  if (!fallback || typeof fallback !== "object") return false;
  if (fallback.ok !== true) return false;
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
  threshold = LOST_SIGNAL_MISS_THRESHOLD,
} = {}) {
  if (Number(matchesLength) > 0 || hasActiveFlightAwareFallback(flightAwareFallback)) {
    return { misses: 0, lostSignal: false };
  }

  const misses = Math.max(0, Number(previousMisses) || 0) + 1;
  const normalizedThreshold = Math.max(1, Number(threshold) || 1);
  return {
    misses,
    lostSignal: misses >= normalizedThreshold,
  };
}
