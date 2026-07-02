export function resolveAircraftTraceRefreshSources({
  refreshKey = "",
  fullTrace = false,
} = {}) {
  const key = String(refreshKey || "").trim();
  if (!key) return [];
  const sources = [{ source: "recent", full: false }];
  // The steady heartbeat only re-pulls the rolling recent tail. Full
  // traces are multi-MB and bypass the server cache, so they refresh
  // only on the event-driven keys (resume, lost signal, FlightAware).
  if (fullTrace && !key.startsWith("steady:")) {
    sources.push({ source: "full", full: true });
  }
  return sources;
}
