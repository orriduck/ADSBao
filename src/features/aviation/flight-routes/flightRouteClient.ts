import {
  AVIATION_PROXY_BASES,
  AVIATION_REQUEST_TIMEOUT_MS,
  FLIGHT_ROUTE_LOOKUP_CONFIG,
} from "../../../config/aviation";
import { normalizeCallsign } from "../../../utils/callsign";
import { withAuditLogging } from "../../../utils/apiLogger";
import { createTimeoutSignal } from "../httpClient";
import { normalizeFlightRoute } from "./flightRouteNormalizer";
import { createRateLimiter } from "../rateLimiter";

const env: Record<string, string | undefined> = typeof process !== "undefined" ? process.env : {};

export const createFlightRouteClient = ({
  fetchImpl = globalThis.fetch?.bind(globalThis),
  baseUrl =
    env.NEXT_PUBLIC_FLIGHT_ROUTE_BASE || AVIATION_PROXY_BASES.flightRoute,
}: Record<string, any> = {}) => {
  if (!fetchImpl) throw new Error("Flight route client requires fetch support");

  const auditedFetch = withAuditLogging(fetchImpl, {
    service: "adsbdb/FlightRoute",
  });

  const limiter = createRateLimiter({
    maxTokens: FLIGHT_ROUTE_LOOKUP_CONFIG.rateLimitMaxTokens,
    refillMs: FLIGHT_ROUTE_LOOKUP_CONFIG.rateLimitRefillMs,
  });

  let consecutiveBackoffMs = 0;

  // targetAirport stays in the URL so the server can scope its persisted
  // community-feedback override lookup to the same (callsign, airport)
  // namespace the client uses for its in-memory cache key.
  const routeUrl = (callsign: string, targetAirport: Record<string, any> = {}) => {
    const params = new URLSearchParams();
    const airportIcao = normalizeCallsign(targetAirport.icao || "");
    const airportIata = normalizeCallsign(targetAirport.iata || "");
    const routeProvider = normalizeCallsign(targetAirport.routeProvider || "");
    if (airportIcao) params.set("airportIcao", airportIcao);
    if (airportIata) params.set("airportIata", airportIata);
    if (routeProvider === "FLIGHTAWARE") {
      params.set("provider", "flightaware");
    }
    const query = params.toString();
    return `${baseUrl}/${encodeURIComponent(callsign)}${query ? `?${query}` : ""}`;
  };

  return {
    async fetchFlightRoute(callsign: unknown, targetAirport: Record<string, any> = {}) {
      const normalized = normalizeCallsign(callsign);
      if (!normalized) return null;

      await limiter.acquire();

      const url = routeUrl(normalized, targetAirport);
      const response = await auditedFetch(
        url,
        {
          signal: createTimeoutSignal(AVIATION_REQUEST_TIMEOUT_MS.flightRoute),
          headers: {
            Accept: "application/json",
            "User-Agent": FLIGHT_ROUTE_LOOKUP_CONFIG.userAgent,
          },
          credentials: "same-origin",
        },
      );

      if (response.status === 400) {
        limiter.release();
        return null;
      }

      if (response.status === 429) {
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

      consecutiveBackoffMs = 0;

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const body = await response.text();
      try {
        return normalizeFlightRoute(JSON.parse(body));
      } catch {
        throw new Error(`Expected JSON from ${url}`);
      }
    },
  };
};
