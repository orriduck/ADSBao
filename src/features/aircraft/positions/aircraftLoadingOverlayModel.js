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
