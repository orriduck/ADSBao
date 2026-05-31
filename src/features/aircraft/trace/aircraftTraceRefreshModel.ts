export function resolveAircraftTraceRefreshSources({
  refreshKey = "",
  fullTrace = false,
} = {}) {
  if (!String(refreshKey || "").trim()) return [];
  const sources = [{ source: "recent", full: false }];
  if (fullTrace) sources.push({ source: "full", full: true });
  return sources;
}
