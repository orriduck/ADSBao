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
  queued = new Set(),
  now = Date.now(),
  maxLookups = FLIGHT_ROUTE_LOOKUP_CONFIG.maxLookupsPerPass,
}) {
  return getLookupCallsigns(aircraft)
    .filter(
      (callsign) =>
        !getFreshRouteCacheEntry(cache, callsign, now) &&
        !inFlight.has(callsign) &&
        !queued.has(callsign),
    )
    .slice(0, maxLookups);
}

export function getRouteLookupStats({
  aircraft,
  cache,
  queued = new Set(),
  inFlight = new Set(),
  now = Date.now(),
}) {
  const callsigns = getLookupCallsigns(aircraft);
  let done = 0;
  let notDone = 0;

  for (const callsign of callsigns) {
    const cached = getFreshRouteCacheEntry(cache, callsign, now);
    if (cached) {
      done += 1;
    } else if (!queued.has(callsign) && !inFlight.has(callsign)) {
      notDone += 1;
    }
  }

  return {
    done,
    in_queue: queued.size,
    inflight: inFlight.size,
    not_do: notDone,
  };
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
