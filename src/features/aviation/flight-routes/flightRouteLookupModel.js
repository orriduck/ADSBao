import { FLIGHT_ROUTE_LOOKUP_CONFIG } from "../../../config/aviation.js";
import { isLookupCallsign, normalizeCallsign } from "../../../utils/callsign.js";

const routeContextCode = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

export function buildRouteCacheKey(callsign, routeContext = {}) {
  const normalizedCallsign = normalizeCallsign(callsign);
  if (!normalizedCallsign) return "";
  const airportIcao = routeContextCode(routeContext.icao);
  const airportIata = routeContextCode(routeContext.iata);
  const routeProvider = routeContextCode(routeContext.routeProvider);
  const suffix = [airportIcao, airportIata, routeProvider]
    .filter(Boolean)
    .join("|");
  return suffix ? `${normalizedCallsign}|${suffix}` : normalizedCallsign;
}

export function getFreshRouteCacheEntry(
  cache,
  callsign,
  now = Date.now(),
  routeContext = {},
) {
  const cacheKey = buildRouteCacheKey(callsign, routeContext);
  const cached = cache.get(cacheKey);
  if (!cached) return null;
  const maxAge = cached.route
    ? FLIGHT_ROUTE_LOOKUP_CONFIG.hitCacheMs
    : FLIGHT_ROUTE_LOOKUP_CONFIG.missCacheMs;
  if (now - cached.time <= maxAge) return cached;
  cache.delete(cacheKey);
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

const EARTH_RADIUS_NM = 3440.065;

const haversineNm = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const a =
    sinLat * sinLat +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sinLon * sinLon;
  return 2 * EARTH_RADIUS_NM * Math.asin(Math.min(1, Math.sqrt(a)));
};

// Ranks candidates so aircraft farthest from the focal airport are scheduled
// first. The default map view zooms out to show the whole nearby airspace, so
// fetching the far-side traffic first makes more route labels appear quickly
// where the user's eye is actually looking. Falls back to source order when
// the focal coords or aircraft coords are missing.
export function rankCandidatesByDistance(aircraft, routeContext = {}) {
  const focusLat = Number(routeContext.lat);
  const focusLon = Number(routeContext.lon);
  const haveFocus = Number.isFinite(focusLat) && Number.isFinite(focusLon);
  const seen = new Map();

  (aircraft || []).forEach((item, index) => {
    const callsign = normalizeCallsign(item?.callsign);
    if (!isLookupCallsign(callsign)) return;
    const lat = Number(item?.lat);
    const lon = Number(item?.lon);
    const distance =
      haveFocus && Number.isFinite(lat) && Number.isFinite(lon)
        ? haversineNm(focusLat, focusLon, lat, lon)
        : -1;
    // Keep the farthest occurrence per callsign so duplicates don't pull the
    // candidate forward by mistake.
    const prior = seen.get(callsign);
    if (!prior || distance > prior.distance) {
      seen.set(callsign, { distance, index });
    }
  });

  return [...seen.entries()]
    .sort((left, right) => {
      const [, leftMeta] = left;
      const [, rightMeta] = right;
      if (leftMeta.distance !== rightMeta.distance) {
        return rightMeta.distance - leftMeta.distance; // farthest first
      }
      return leftMeta.index - rightMeta.index;
    })
    .map(([callsign]) => callsign);
}

export function resolvePendingRouteLookups({
  aircraft,
  cache,
  inFlight,
  queued = new Set(),
  routeContext = {},
  now = Date.now(),
  maxLookups = FLIGHT_ROUTE_LOOKUP_CONFIG.maxLookupsPerPass,
}) {
  return rankCandidatesByDistance(aircraft, routeContext)
    .filter(
      (callsign) =>
        !getFreshRouteCacheEntry(cache, callsign, now, routeContext) &&
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
  routeContext = {},
  now = Date.now(),
}) {
  const callsigns = getLookupCallsigns(aircraft);
  let done = 0;
  let notDone = 0;

  for (const callsign of callsigns) {
    const cached = getFreshRouteCacheEntry(cache, callsign, now, routeContext);
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

export function buildRoutesByCallsign({
  aircraft,
  cache,
  routeContext = {},
  now = Date.now(),
}) {
  const routes = {};
  for (const item of aircraft || []) {
    const callsign = normalizeCallsign(item.callsign);
    const cached = getFreshRouteCacheEntry(cache, callsign, now, routeContext);
    if (cached?.route) routes[callsign] = cached.route;
  }
  return routes;
}
