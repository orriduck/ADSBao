// Lookup hits cache aggressively at the edge; misses use a shorter TTL so a
// provider miss can be retried quickly without hammering the upstream.
const ROUTE_CACHE_TTL_SECONDS = 60 * 60;
const ROUTE_MISS_CACHE_TTL_SECONDS = 5 * 60;
const ROUTE_STALE_WHILE_REVALIDATE_SECONDS = 10 * 60;

// We always reply 200 — even on a miss — so the Vercel edge caches the
// empty body. A 404 would short-circuit the CDN and make every miss hit
// the origin again on the next aircraft pass.
export const ROUTE_MISS_STATUS = 200;

export function buildRouteCacheHeaders(body, { bypassSharedCache = false } = {}) {
  if (bypassSharedCache || body?.source === "flightaware") {
    return { "Cache-Control": "no-store" };
  }

  // Temporary routes should never land in the shared CDN cache. The current
  // provider lookup path does not return them, but keep the guard local to the
  // cache policy in case another endpoint reuses this helper.
  if (body && body.temporary) {
    return { "Cache-Control": "no-store" };
  }
  const ttl = body ? ROUTE_CACHE_TTL_SECONDS : ROUTE_MISS_CACHE_TTL_SECONDS;
  const swr = ROUTE_STALE_WHILE_REVALIDATE_SECONDS;
  const sharedValue = `public, s-maxage=${ttl}, stale-while-revalidate=${swr}`;
  return {
    "Cache-Control": `public, max-age=0, s-maxage=${ttl}, stale-while-revalidate=${swr}`,
    "CDN-Cache-Control": sharedValue,
    "Vercel-CDN-Cache-Control": sharedValue,
  };
}

const cleanString = (value) => String(value || "").trim();
const cleanUpper = (value) => cleanString(value).toUpperCase();

function compactAirportPayload(airport) {
  if (!airport || typeof airport !== "object") return null;
  const icao = cleanUpper(airport.icao || airport.icao_code);
  const iata = cleanUpper(airport.iata || airport.iata_code);
  const lat = Number(airport.lat ?? airport.latitude);
  const lon = Number(airport.lon ?? airport.longitude);
  if (!icao || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return {
    icao,
    ...(iata ? { iata } : {}),
    lat,
    lon,
  };
}

function compactRouteCodes(route) {
  if (!route || typeof route !== "object") return null;
  const icao = cleanUpper(route.icao);
  const iata = cleanUpper(route.iata);
  if (!icao && !iata) return null;
  return {
    ...(icao ? { icao } : {}),
    ...(iata ? { iata } : {}),
  };
}

export function compactFlightRoutePayload(payload) {
  const route = payload && typeof payload === "object" ? payload : null;
  if (!route) return null;

  const origin = compactAirportPayload(route.origin);
  const destination = compactAirportPayload(route.destination);
  if (!origin || !destination) return null;

  const airline = route.airline && typeof route.airline === "object" ? route.airline : {};
  const compact: Record<string, any> = {
    callsign: cleanUpper(route.callsign || route.callsign_icao),
    callsignIcao: cleanUpper(
      route.callsignIcao || route.callsign_icao || route.callsign,
    ),
    origin,
    destination,
    source: cleanString(route.source),
    confidence: cleanString(route.confidence),
  };
  const callsignIata = cleanUpper(route.callsignIata || route.callsign_iata);
  const airlineIcao = cleanUpper(route.airlineIcao || airline.icao);
  const airlineIata = cleanUpper(route.airlineIata || airline.iata);
  const routeCodes = compactRouteCodes(route.route);

  if (callsignIata) compact.callsignIata = callsignIata;
  if (/^[A-Z0-9]{2,3}$/.test(airlineIcao)) compact.airlineIcao = airlineIcao;
  if (/^[A-Z0-9]{2}$/.test(airlineIata)) compact.airlineIata = airlineIata;
  if (routeCodes) compact.route = routeCodes;

  for (const key of ["temporary", "displaySuffix", "expiresAt", "feedbackReason"]) {
    if (route[key] !== undefined && route[key] !== null && route[key] !== "") {
      compact[key] = route[key];
    }
  }

  return compact;
}
