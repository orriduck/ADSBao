export function getLostSignalTraceRefreshKey({
  lostSignal = false,
  pollVersion = 0,
} = {}) {
  const version = Number(pollVersion);
  if (!lostSignal || !Number.isFinite(version) || version <= 0) return "";
  return `lost-signal:${version}`;
}
