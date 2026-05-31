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

export function getFlightAwareFallbackAutoFitKey({
  trackingState = null,
  callsign = "",
  aircraftHex = "",
} = {}) {
  if (!isFlightAwareFallbackTracking(trackingState)) return "";
  const normalizedCallsign = String(callsign || "").trim().toUpperCase();
  const normalizedHex = String(aircraftHex || "").trim().toUpperCase();
  if (!normalizedCallsign) return "";
  return ["flightaware", normalizedCallsign, normalizedHex]
    .filter(Boolean)
    .join(":");
}
