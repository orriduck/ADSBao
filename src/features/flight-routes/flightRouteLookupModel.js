import { FLIGHT_ROUTE_LOOKUP_CONFIG } from "../../config/aviation.js";
import { isLookupCallsign, normalizeCallsign } from "../../utils/callsign.js";

export function getFreshRouteCacheEntry(cache, callsign, now = Date.now()) {
  const cached = cache.get(callsign);
  if (!cached) return null;
  const maxAge = cached.route
    ? FLIGHT_ROUTE_LOOKUP_CONFIG.hitCacheMs
    : FLIGHT_ROUTE_LOOKUP_CONFIG.missCacheMs;
  if (now - cached.time <= maxAge) return cached;
  cache.delete(callsign);
  return null;
}

export function getLookupCallsigns(aircraft) {
  return [
    ...new Set(
      (aircraft || [])
        .map((item) => normalizeCallsign(item.callsign))
        .filter(isLookupCallsign),
    ),
  ];
}

export function resolvePendingRouteLookups({
  aircraft,
  cache,
  inFlight,
  now = Date.now(),
  maxLookups = FLIGHT_ROUTE_LOOKUP_CONFIG.maxLookupsPerPass,
}) {
  return getLookupCallsigns(aircraft)
    .filter(
      (callsign) =>
        !getFreshRouteCacheEntry(cache, callsign, now) &&
        !inFlight.has(callsign),
    )
    .slice(0, maxLookups);
}

export function buildRoutesByCallsign({ aircraft, cache, now = Date.now() }) {
  const routes = {};
  for (const item of aircraft || []) {
    const callsign = normalizeCallsign(item.callsign);
    const cached = getFreshRouteCacheEntry(cache, callsign, now);
    if (cached?.route) routes[callsign] = cached.route;
  }
  return routes;
}
