import { withAuditLogging } from "../utils/apiLogger.js";
import {
  AIRCRAFT_TRAFFIC_CONFIG,
  AVIATION_PROXY_BASES,
  AVIATION_REQUEST_TIMEOUT_MS,
  FLIGHT_ROUTE_LOOKUP_CONFIG,
} from "../config/aviation.js";
import { normalizeCallsign } from "../utils/callsign.js";

const env = typeof process !== "undefined" ? process.env : {};

// ---------------------------------------------------------------------------
// Rate limiter — token-bucket for global request pacing
// ---------------------------------------------------------------------------

export const createRateLimiter = ({ maxTokens = 3, refillMs = 1000 } = {}) => {
  let available = maxTokens;
  let lastRefill = Date.now();
  let cooldownUntil = 0;

  const refill = (nowMs) => {
    const elapsed = nowMs - lastRefill;
    if (elapsed <= 0) return;
    // Restore tokens proportionally to elapsed time
    const newTokens = (elapsed / refillMs) * maxTokens;
    available = Math.min(available + newTokens, maxTokens);
    lastRefill = nowMs;
  };

  /** Wait until a token is available.  Resolves immediately if a token is free. */
  const acquire = async () => {
    while (true) {
      const nowMs = Date.now();

      // P1 fix: check cooldown inside the loop so waiters honour a
      // cooldown that was set while they were already sleeping.
      if (cooldownUntil > 0) {
        const remaining = cooldownUntil - nowMs;
        if (remaining > 0) {
          await new Promise((resolve) => setTimeout(resolve, remaining));
        }
        cooldownUntil = 0;
        lastRefill = Date.now();
        continue;
      }

      refill(nowMs);

      if (available >= 1) {
        available -= 1;
        return;
      }

      // Wait one refill window, then re-check cooldown & refill
      await new Promise((resolve) => setTimeout(resolve, refillMs));
    }
  };

  /** Notify the limiter that a 429 was received — apply exponential backoff. */
  const onRateLimited = (backoffMs = 2000) => {
    available = 0;
    cooldownUntil = Date.now() + backoffMs;
  };

  /** Release a token early (e.g. 404 or cached hit that didn't consume a real API call). */
  const release = () => {
    available = Math.min(available + 1, maxTokens);
  };

  return { acquire, onRateLimited, release };
};

export const DEFAULT_AIRCRAFT_POLL_MS = AIRCRAFT_TRAFFIC_CONFIG.pollMs;
export const DEFAULT_WIDE_RANGE_NM = AIRCRAFT_TRAFFIC_CONFIG.wideRangeNm;
export const DEFAULT_CLOSE_RANGE_NM = AIRCRAFT_TRAFFIC_CONFIG.closeRangeNm;

const createTimeoutSignal = (timeoutMs) =>
  typeof AbortSignal !== "undefined" && AbortSignal.timeout
    ? AbortSignal.timeout(timeoutMs)
    : undefined;

const fetchJson = async (
  fetchImpl,
  url,
  { timeoutMs = AVIATION_REQUEST_TIMEOUT_MS.json } = {},
) => {
  const response = await fetchImpl(url, {
    signal: createTimeoutSignal(timeoutMs),
    headers: {
      Accept: "application/json",
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = await response.text();
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`Expected JSON from ${url}`);
  }
};

export const createMetarClient = ({
  fetchImpl = globalThis.fetch?.bind(globalThis),
  baseUrl = env.NEXT_PUBLIC_METAR_PROXY_BASE || AVIATION_PROXY_BASES.metar,
} = {}) => {
  if (!fetchImpl) throw new Error("METAR client requires fetch support");

  const auditedFetch = withAuditLogging(fetchImpl, {
    service: "AviationWeather/METAR",
    getParams(url) {
      return { icao: decodeURIComponent(url.split("/").pop() || "") };
    },
  });

  return {
    fetchMetar(icao) {
      const normalized = String(icao || "")
        .trim()
        .toUpperCase();
      if (!normalized) return [];
      return fetchJson(
        auditedFetch,
        `${baseUrl}/${encodeURIComponent(normalized)}`,
        {
          timeoutMs: AVIATION_REQUEST_TIMEOUT_MS.metar,
        },
      );
    },
  };
};

export const createLocalWeatherClient = ({
  fetchImpl = globalThis.fetch?.bind(globalThis),
  baseUrl =
    env.NEXT_PUBLIC_LOCAL_WEATHER_BASE || AVIATION_PROXY_BASES.localWeather,
} = {}) => {
  if (!fetchImpl) throw new Error("Local weather client requires fetch support");

  const auditedFetch = withAuditLogging(fetchImpl, {
    service: "Open-Meteo/CurrentWeather",
    getParams(url) {
      const p = url.split("/");
      return {
        lat: p[p.length - 2],
        lon: p[p.length - 1],
      };
    },
  });

  return {
    fetchCurrentWeather({ lat, lon }) {
      const numericLat = Number(lat);
      const numericLon = Number(lon);
      if (!Number.isFinite(numericLat) || !Number.isFinite(numericLon)) {
        return null;
      }
      return fetchJson(
        auditedFetch,
        `${baseUrl}/${encodeURIComponent(String(numericLat))}/${encodeURIComponent(
          String(numericLon),
        )}`,
        {
          timeoutMs: AVIATION_REQUEST_TIMEOUT_MS.localWeather,
        },
      );
    },
  };
};

export const createAircraftPositionClient = ({
  fetchImpl = globalThis.fetch?.bind(globalThis),
  baseUrl =
    env.NEXT_PUBLIC_AIRCRAFT_POSITIONS_BASE ||
    AVIATION_PROXY_BASES.aircraftPositions,
} = {}) => {
  if (!fetchImpl)
    throw new Error("Aircraft position client requires fetch support");

  const auditedFetch = withAuditLogging(fetchImpl, {
    service: "adsb.lol/Aircraft",
    getParams(url) {
      const p = url.split("/");
      return {
        lat: p[p.length - 3],
        lon: p[p.length - 2],
        distNm: p[p.length - 1],
      };
    },
  });

  return {
    fetchNearbyAircraft({ lat, lon, distNm = DEFAULT_WIDE_RANGE_NM }) {
      const encodedLat = encodeURIComponent(String(lat));
      const encodedLon = encodeURIComponent(String(lon));
      const encodedDist = encodeURIComponent(String(distNm));
      return fetchJson(
        auditedFetch,
        `${baseUrl}/${encodedLat}/${encodedLon}/${encodedDist}`,
        {
          timeoutMs: AVIATION_REQUEST_TIMEOUT_MS.aircraftPositions,
        },
      );
    },
  };
};

const normalizeAirport = (airport) => {
  if (!airport) return null;
  const lat = Number(airport.latitude);
  const lon = Number(airport.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return {
    icao: String(airport.icao_code || "")
      .trim()
      .toUpperCase(),
    iata: String(airport.iata_code || "")
      .trim()
      .toUpperCase(),
    name: String(airport.name || "").trim(),
    municipality: String(airport.municipality || "").trim(),
    country: String(airport.country_name || "").trim(),
    lat,
    lon,
  };
};

export const normalizeFlightRoute = (payload) => {
  const route = payload?.response?.flightroute;
  if (!route) return null;

  const origin = normalizeAirport(route.origin);
  const destination = normalizeAirport(route.destination);
  if (!origin || !destination || !origin.icao || !destination.icao) return null;

  const callsign = String(route.callsign || route.callsign_icao || "")
    .trim()
    .toUpperCase();
  if (!callsign) return null;

  return {
    callsign,
    callsignIcao: String(route.callsign_icao || "")
      .trim()
      .toUpperCase(),
    callsignIata: String(route.callsign_iata || "")
      .trim()
      .toUpperCase(),
    airlineName: String(route.airline?.name || "").trim(),
    airlineIcao: String(route.airline?.icao || "")
      .trim()
      .toUpperCase(),
    airlineIata: String(route.airline?.iata || "")
      .trim()
      .toUpperCase(),
    origin,
    destination,
    source: "adsbdb",
  };
};

export const createFlightRouteClient = ({
  fetchImpl = globalThis.fetch?.bind(globalThis),
  baseUrl =
    env.NEXT_PUBLIC_FLIGHT_ROUTE_BASE || AVIATION_PROXY_BASES.flightRoute,
} = {}) => {
  if (!fetchImpl) throw new Error("Flight route client requires fetch support");

  const auditedFetch = withAuditLogging(fetchImpl, {
    service: "adsbdb/FlightRoute",
    getParams(url) {
      return { callsign: decodeURIComponent(url.split("/").pop() || "") };
    },
  });

  // Global rate limiter shared across all calls to the same endpoint.
  // 3 requests per second is conservative — adsbdb's exact limit is unknown,
  // but empirically we saw 429s at ~6 concurrent requests per 3s poll.
  const limiter = createRateLimiter({
    maxTokens: FLIGHT_ROUTE_LOOKUP_CONFIG.rateLimitMaxTokens,
    refillMs: FLIGHT_ROUTE_LOOKUP_CONFIG.rateLimitRefillMs,
  });

  let consecutiveBackoffMs = 0;

  return {
    async fetchFlightRoute(callsign) {
      const normalized = normalizeCallsign(callsign);
      if (!normalized) return null;

      await limiter.acquire();

      const response = await auditedFetch(
        `${baseUrl}/${encodeURIComponent(normalized)}`,
        {
          signal: createTimeoutSignal(AVIATION_REQUEST_TIMEOUT_MS.flightRoute),
          headers: {
            Accept: "application/json",
            "User-Agent": FLIGHT_ROUTE_LOOKUP_CONFIG.userAgent,
          },
        },
      );

      if (response.status === 400 || response.status === 404) {
        // Fast-path exits don't consume a real API "slot", so release the token.
        limiter.release();
        return null;
      }

      if (response.status === 429) {
        // Exponential backoff: 2s → 4s → 8s → 16s → max 60s
        const backoff = Math.min(
          Math.max(
            consecutiveBackoffMs * 2 ||
              FLIGHT_ROUTE_LOOKUP_CONFIG.backoffInitialMs,
            FLIGHT_ROUTE_LOOKUP_CONFIG.backoffInitialMs,
          ),
          FLIGHT_ROUTE_LOOKUP_CONFIG.backoffMaxMs,
        );
        consecutiveBackoffMs = backoff;
        limiter.onRateLimited(backoff);
        throw new Error(`HTTP 429 (backoff ${backoff}ms)`);
      }

      // Successful request — reset backoff.
      consecutiveBackoffMs = 0;

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const body = await response.text();
      try {
        return normalizeFlightRoute(JSON.parse(body));
      } catch {
        throw new Error(`Expected JSON from ${baseUrl}/${normalized}`);
      }
    },
  };
};

export const metarClient = createMetarClient();
export const aircraftPositionClient = createAircraftPositionClient();
export const flightRouteClient = createFlightRouteClient();
export const localWeatherClient = createLocalWeatherClient();
