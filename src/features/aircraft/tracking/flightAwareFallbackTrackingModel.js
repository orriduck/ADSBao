export function isFlightAwareFallbackTracking(trackingState) {
  return String(trackingState?.status || "").trim() === "flightaware_active";
}

export function getFlightAwareFallbackTraceStartAtMs({
  trackingState = null,
  defaultTraceStartAtMs = null,
} = {}) {
  if (isFlightAwareFallbackTracking(trackingState)) return null;
  return defaultTraceStartAtMs;
}

export function shouldLockMapViewportForTrackingState(trackingState) {
  return isFlightAwareFallbackTracking(trackingState);
}
