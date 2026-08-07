export function getTrackedFlightTraceRefreshKey({
  lostSignal = false,
  pollVersion = 0,
  visibilityRefreshVersion = 0,
  pollMs = 3_000,
  lostSignalRefreshMs = 60_000,
  steadyRefreshMs = 180_000,
} = {}) {
  const visibilityVersion = Number(visibilityRefreshVersion);
  if (Number.isFinite(visibilityVersion) && visibilityVersion > 0) {
    return `visibility:${visibilityVersion}`;
  }

  const version = Number(pollVersion);
  if (!Number.isFinite(version) || version <= 0) return "";
  const intervalMs = Math.max(1, Number(pollMs) || 1);
  const refreshMs = Math.max(
    intervalMs,
    Number(lostSignal ? lostSignalRefreshMs : steadyRefreshMs) || intervalMs,
  );
  const bucket = Math.floor((version * intervalMs) / refreshMs);
  if (bucket <= 0) return "";
  return lostSignal ? `lost-signal:${bucket}` : `steady:${bucket}`;
}

export function shouldRetainActiveTrackingState({
  matchesLength = 0,
  lostSignal = false,
} = {}) {
  return !lostSignal && Number(matchesLength) === 0;
}
