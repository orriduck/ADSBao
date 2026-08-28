import { FLIGHT_ROUTE_LOOKUP_CONFIG } from "../../../config/aviation";
import { isLookupCallsign, normalizeCallsign } from "../../../utils/callsign";

export type RouteContext = {
  icao?: unknown;
  iata?: unknown;
  lat?: unknown;
  lon?: unknown;
};

export type AircraftRouteCandidate = {
  callsign?: unknown;
  lat?: unknown;
  lon?: unknown;
  origin?: unknown;
  destination?: unknown;
  [key: string]: unknown;
};

type RouteAirportCode = {
  icao?: string;
  iata?: string;
  lat?: number;
  lon?: number;
};

export type FlightRoute = {
  callsign?: unknown;
  callsignIcao?: unknown;
  callsignIata?: unknown;
  airlineIcao?: unknown;
  airlineIata?: unknown;
  airline?: {
    icao?: unknown;
    iata?: unknown;
  } | null;
  origin?: RouteAirportCode | null;
  destination?: RouteAirportCode | null;
  route?: {
    icao?: string;
    iata?: string;
  };
  source?: string;
  confidence?: string;
};

export type RouteCacheEntry = {
  route: FlightRoute | null;
  time: number;
};

type PendingRouteLookupOptions = {
  aircraft: AircraftRouteCandidate[];
  cache: Map<string, RouteCacheEntry>;
  inFlight: Set<string>;
  routeContext?: RouteContext;
  now?: number;
};

type RoutesByCallsignOptions = {
  aircraft: AircraftRouteCandidate[];
  cache: Map<string, RouteCacheEntry>;
  routeContext?: RouteContext;
  now?: number;
};

const routeContextCode = (value: unknown) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

export function buildRouteCacheKey(callsign: unknown, routeContext: RouteContext = {}) {
  void routeContext;
  const normalizedCallsign = normalizeCallsign(callsign);
  if (!normalizedCallsign) return "";
  return normalizedCallsign;
}

function getFreshRouteCacheEntry(
  cache: Map<string, RouteCacheEntry>,
  callsign: unknown,
  now = Date.now(),
  routeContext: RouteContext = {},
) {
  return getFreshRouteCacheEntryByKey(
    cache,
    buildRouteCacheKey(callsign, routeContext),
    now,
  );
}

function getFreshRouteCacheEntryByKey(
  cache: Map<string, RouteCacheEntry>,
  cacheKey: string,
  now = Date.now(),
) {
  if (!cacheKey) return null;
  const cached = cache.get(cacheKey);
  if (!cached) return null;
  const maxAge = cached.route
    ? FLIGHT_ROUTE_LOOKUP_CONFIG.hitCacheMs
    : FLIGHT_ROUTE_LOOKUP_CONFIG.missCacheMs;
  if (now - cached.time <= maxAge) return cached;
  cache.delete(cacheKey);
  return null;
}

export function writeRouteCacheEntry(
  cache: Map<string, RouteCacheEntry>,
  callsign: unknown,
  route: FlightRoute | null,
  time: number,
  routeContext: RouteContext = {},
) {
  void routeContext;
  const routeForContext = route;
  const cacheKeys = new Set(
    [
      callsign,
      routeForContext?.callsign,
      routeForContext?.callsignIcao,
      routeForContext?.callsignIata,
    ]
      .map((value) => buildRouteCacheKey(value))
      .filter(Boolean),
  );

  for (const cacheKey of cacheKeys) {
    cache.set(cacheKey, { route: routeForContext, time });
  }
}

function airportFromMetadataCode(value: unknown) {
  const code = routeContextCode(value);
  if (code.length === 3) return { iata: code };
  if (code.length === 4) return { icao: code };
  return null;
}

function routeCode(
  origin: RouteAirportCode | null,
  destination: RouteAirportCode | null,
  field: keyof RouteAirportCode,
) {
  const from = origin?.[field];
  const to = destination?.[field];
  return from && to ? `${from}-${to}` : "";
}

function buildRouteFromAircraftMetadata(aircraft: AircraftRouteCandidate = {}) {
  const callsign = normalizeCallsign(aircraft?.callsign);
  const origin = airportFromMetadataCode(aircraft?.origin);
  const destination = airportFromMetadataCode(aircraft?.destination);
  if (!callsign || !origin || !destination) return null;

  const icao = routeCode(origin, destination, "icao");
  const iata = routeCode(origin, destination, "iata");
  if (!icao && !iata) return null;

  return {
    callsign,
    origin,
    destination,
    route: {
      ...(icao ? { icao } : {}),
      ...(iata ? { iata } : {}),
    },
    source: "aircraft-metadata",
    confidence: "position-metadata",
  };
}

export function resolvePendingRouteLookups({
  aircraft,
  cache,
  inFlight,
  routeContext = {},
  now = Date.now(),
}: PendingRouteLookupOptions) {
  const pending: string[] = [];
  for (const item of aircraft || []) {
    const callsign = normalizeCallsign(item?.callsign);
    if (!isLookupCallsign(callsign) || inFlight.has(callsign)) continue;
    // A focused paid fallback may already carry a valid origin/destination.
    // Use that neutral aircraft metadata directly instead of spending a second
    // paid route lookup for the same callsign.
    if (buildRouteFromAircraftMetadata(item)) continue;
    if (getFreshRouteCacheEntry(cache, callsign, now, routeContext)) continue;
    pending.push(callsign);
  }
  return pending;
}

export function filterRouteLookupStatuses<T extends string>(
  statuses: Record<string, T>,
  aircraft: AircraftRouteCandidate[],
) {
  const activeCallsigns = new Set(
    (aircraft || [])
      .map((item) => normalizeCallsign(item?.callsign))
      .filter(isLookupCallsign),
  );
  return Object.fromEntries(
    Object.entries(statuses).filter(([callsign]) => activeCallsigns.has(callsign)),
  ) as Record<string, T>;
}

export function buildRoutesByCallsign({
  aircraft,
  cache,
  routeContext = {},
  now = Date.now(),
}: RoutesByCallsignOptions) {
  const routes: Record<string, FlightRoute> = {};
  for (const item of aircraft || []) {
    const callsign = normalizeCallsign(item.callsign);
    const cached = getFreshRouteCacheEntry(cache, callsign, now, routeContext);
    const route =
      cached?.route ||
      buildRouteFromAircraftMetadata(item);
    if (route) routes[callsign] = route;
  }
  return routes;
}
