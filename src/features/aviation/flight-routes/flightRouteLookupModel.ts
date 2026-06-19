import { FLIGHT_ROUTE_LOOKUP_CONFIG } from "../../../config/aviation";
import { isLookupCallsign, normalizeCallsign } from "../../../utils/callsign";

export type RouteContext = {
  icao?: unknown;
  iata?: unknown;
  lat?: unknown;
  lon?: unknown;
  routeProvider?: unknown;
};

export type AircraftRouteCandidate = {
  callsign?: unknown;
  lat?: unknown;
  lon?: unknown;
  origin?: unknown;
  destination?: unknown;
  trackingState?: {
    status?: unknown;
  } | null;
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
  queued?: Set<string>;
  routeContext?: RouteContext;
  now?: number;
  maxLookups?: number;
};

type RouteLookupStatsOptions = Omit<PendingRouteLookupOptions, "maxLookups">;

type RoutesByCallsignOptions = {
  aircraft: AircraftRouteCandidate[];
  cache: Map<string, RouteCacheEntry>;
  routeContext?: RouteContext;
  now?: number;
};

export const ROUTE_LOOKUP_TRANSPORT = Object.freeze({
  REALTIME: "realtime",
});

const routeContextCode = (value: unknown) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const routeSourceCode = (value: unknown) =>
  String(value || "").trim().toLowerCase();

const isFlightAwareRouteContext = (routeContext: RouteContext = {}) =>
  routeContextCode(routeContext.routeProvider) === "FLIGHTAWARE";

function routeProviderSource(routeContext: RouteContext = {}) {
  const provider = routeSourceCode(routeContext.routeProvider);
  return provider === "flightaware" || provider === "adsbdb" ? provider : "";
}

function routeMatchesProviderSource(
  route: FlightRoute | null | undefined,
  routeContext: RouteContext = {},
) {
  const requiredSource = routeProviderSource(routeContext);
  if (!requiredSource) return true;
  const source = routeSourceCode(route?.source);
  return source === requiredSource;
}

function normalizeRouteForProviderSource(
  route: FlightRoute | null,
  routeContext: RouteContext = {},
) {
  if (!route) return null;
  return routeMatchesProviderSource(route, routeContext) ? route : null;
}

function shouldUseAircraftMetadataFallback(routeContext: RouteContext = {}) {
  return !routeProviderSource(routeContext);
}

const centerContextNumber = (value: unknown) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  return String(Number((Math.round(number / 0.1) * 0.1).toFixed(4)));
};

function routeContextWithoutProvider(routeContext: RouteContext = {}) {
  const { routeProvider: _routeProvider, ...rest } = routeContext;
  return rest;
}

export function resolveRouteLookupTransport(routeContext: RouteContext = {}) {
  void routeContext;
  return ROUTE_LOOKUP_TRANSPORT.REALTIME;
}

export function resolveRouteLookupEnabled({
  featureFlagsResolved = true,
}: {
  featureFlagsResolved?: unknown;
} = {}) {
  return featureFlagsResolved !== false;
}

export function buildRouteCacheKey(callsign: unknown, routeContext: RouteContext = {}) {
  const normalizedCallsign = normalizeCallsign(callsign);
  if (!normalizedCallsign) return "";
  const airportIcao = routeContextCode(routeContext.icao);
  const airportIata = routeContextCode(routeContext.iata);
  const routeProvider = routeContextCode(routeContext.routeProvider);
  const centerLat = airportIcao || airportIata ? "" : centerContextNumber(routeContext.lat);
  const centerLon = airportIcao || airportIata ? "" : centerContextNumber(routeContext.lon);
  const centerParts = centerLat && centerLon ? ["CENTER", centerLat, centerLon] : [];
  const suffix = [airportIcao, airportIata, ...centerParts, routeProvider]
    .filter(Boolean)
    .join("|");
  return suffix ? `${normalizedCallsign}|${suffix}` : normalizedCallsign;
}

function getFreshRouteCacheEntry(
  cache: Map<string, RouteCacheEntry>,
  callsign: unknown,
  now = Date.now(),
  routeContext: RouteContext = {},
) {
  const cacheKeys = isFlightAwareRouteContext(routeContext)
    ? [buildRouteCacheKey(callsign, routeContext)].filter(Boolean)
    : [
        buildRouteCacheKey(callsign, routeContext),
        buildRouteCacheKey(callsign, routeContextWithoutProvider(routeContext)),
        buildRouteCacheKey(callsign),
      ].filter(Boolean);
  let firstMiss: RouteCacheEntry | null = null;
  for (const cacheKey of [...new Set(cacheKeys)]) {
    const cached = getFreshRouteCacheEntryByKey(cache, cacheKey, now);
    if (cached?.route) {
      if (routeMatchesProviderSource(cached.route, routeContext)) return cached;
      continue;
    }
    if (cached && !firstMiss) firstMiss = cached;
  }
  return firstMiss;
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
  const routeForContext = normalizeRouteForProviderSource(route, routeContext);
  const exclusiveProvider =
    isFlightAwareRouteContext(routeContext) ||
    routeSourceCode(routeForContext?.source) === "flightaware";
  const cacheKeys = new Set(
    [
      callsign,
      routeForContext?.callsign,
      routeForContext?.callsignIcao,
      routeForContext?.callsignIata,
    ]
      .flatMap((value) =>
        exclusiveProvider
          ? [buildRouteCacheKey(value, routeContext)]
          : [buildRouteCacheKey(value, routeContext), buildRouteCacheKey(value)],
      )
      .filter(Boolean),
  );

  for (const cacheKey of cacheKeys) {
    cache.set(cacheKey, { route: routeForContext, time });
  }
}

function getLookupCallsigns(aircraft: AircraftRouteCandidate[]) {
  return [
    ...new Set(
      (aircraft || [])
        .filter((item) => !shouldSuppressRouteLookup(item))
        .map((item) => normalizeCallsign(item.callsign))
        .filter((callsign): callsign is string => isLookupCallsign(callsign)),
    ),
  ];
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

const EARTH_RADIUS_NM = 3440.065;
const ROUTE_LOOKUP_SUPPRESSED_TRACKING_STATUSES = new Set([
  "flightaware_terminal",
  "missing",
]);

const haversineNm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
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
function collectPendingRouteCandidates(
  {
    aircraft,
    cache,
    inFlight,
    queued = new Set(),
    routeContext = {},
    now = Date.now(),
    maxLookups = FLIGHT_ROUTE_LOOKUP_CONFIG.maxQueueSize,
  }: PendingRouteLookupOptions,
) {
  if (maxLookups <= 0) return [];
  const focusLat = Number(routeContext.lat);
  const focusLon = Number(routeContext.lon);
  const haveFocus = Number.isFinite(focusLat) && Number.isFinite(focusLon);
  const seen = new Map<string, { distance: number; index: number }>();
  const blocked = new Set(
    [...inFlight, ...queued]
      .map((callsign) => normalizeCallsign(callsign))
      .filter((callsign): callsign is string => Boolean(callsign)),
  );
  const sourceOrder: string[] = [];

  (aircraft || []).forEach((item, index) => {
    if (shouldSuppressRouteLookup(item)) return;
    const callsign = normalizeCallsign(item?.callsign);
    if (!isLookupCallsign(callsign)) return;
    if (blocked.has(callsign)) return;
    if (getFreshRouteCacheEntry(cache, callsign, now, routeContext)) {
      blocked.add(callsign);
      return;
    }

    if (!haveFocus) {
      if (seen.has(callsign)) return;
      seen.set(callsign, { distance: -1, index });
      sourceOrder.push(callsign);
      return;
    }

    const lat = Number(item?.lat);
    const lon = Number(item?.lon);
    const distance = Number.isFinite(lat) && Number.isFinite(lon)
      ? haversineNm(focusLat, focusLon, lat, lon)
      : -1;
    // Keep the farthest occurrence per callsign so duplicates don't pull the
    // candidate forward by mistake.
    const prior = seen.get(callsign);
    if (!prior || distance > prior.distance) {
      seen.set(callsign, { distance, index });
    }
  });

  if (!haveFocus) {
    return sourceOrder.slice(0, maxLookups);
  }

  return [...seen.entries()]
    .sort((left, right) => {
      const [, leftMeta] = left;
      const [, rightMeta] = right;
      if (leftMeta.distance !== rightMeta.distance) {
        return rightMeta.distance - leftMeta.distance; // farthest first
      }
      return leftMeta.index - rightMeta.index;
    })
    .slice(0, maxLookups)
    .map(([callsign]) => callsign);
}

function shouldSuppressRouteLookup(aircraft: AircraftRouteCandidate = {}) {
  return ROUTE_LOOKUP_SUPPRESSED_TRACKING_STATUSES.has(
    String(aircraft?.trackingState?.status || "").trim().toLowerCase(),
  );
}

export function resolvePendingRouteLookups({
  aircraft,
  cache,
  inFlight,
  queued = new Set(),
  routeContext = {},
  now = Date.now(),
  maxLookups = FLIGHT_ROUTE_LOOKUP_CONFIG.maxQueueSize,
}: PendingRouteLookupOptions) {
  return collectPendingRouteCandidates({
    aircraft,
    cache,
    inFlight,
    queued,
    routeContext,
    now,
    maxLookups,
  });
}

export function getRouteLookupStats({
  aircraft,
  cache,
  queued = new Set(),
  inFlight = new Set(),
  routeContext = {},
  now = Date.now(),
}: RouteLookupStatsOptions) {
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
}: RoutesByCallsignOptions) {
  const routes: Record<string, FlightRoute> = {};
  for (const item of aircraft || []) {
    const callsign = normalizeCallsign(item.callsign);
    const cached = getFreshRouteCacheEntry(cache, callsign, now, routeContext);
    const route =
      cached?.route ||
      (shouldUseAircraftMetadataFallback(routeContext)
        ? buildRouteFromAircraftMetadata(item)
        : null);
    if (route) routes[callsign] = route;
  }
  return routes;
}
