import {
  AVIATION_PROXY_BASES,
  AVIATION_REQUEST_TIMEOUT_MS,
  FLIGHT_ROUTE_LOOKUP_CONFIG,
} from "../../config/aviation.js";
import { normalizeCallsign } from "../../utils/callsign.js";
import { withAuditLogging } from "../../utils/apiLogger.js";
import { createTimeoutSignal } from "./httpClient.js";
import { normalizeFlightRoute } from "./flightRouteNormalizer.js";
import { createRateLimiter } from "./rateLimiter.js";

const env = typeof process !== "undefined" ? process.env : {};

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
        throw new Error(`Expected JSON from ${baseUrl}/${normalized}`);
      }
    },
  };
};
