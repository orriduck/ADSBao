import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildRoutesByCallsign,
  resolvePendingRouteLookups,
  writeRouteCacheEntry,
  type AircraftRouteCandidate,
  type FlightRoute,
  type RouteCacheEntry,
  type RouteContext,
} from "../features/aviation/flight-routes/flightRouteLookupModel";
import {
  createFlightRouteClient,
  FlightRouteHttpError,
} from "../features/aviation/flight-routes/flightRouteClient";
import {
  isTemporaryRouteFailure,
  resolveRouteRetryDelayMs,
} from "../features/aviation/flight-routes/flightRouteRetryModel";
import { isLookupCallsign, normalizeCallsign } from "../utils/callsign";

type FlightRouteHookContext = RouteContext & {
  enabled?: boolean;
};

export type RouteLookupStatus = "pending" | "retrying" | "unavailable";

const routeClient = createFlightRouteClient();

function routeCandidateKey(aircraft: AircraftRouteCandidate[]) {
  return (aircraft || [])
    .map((item) => normalizeCallsign(item?.callsign))
    .filter(isLookupCallsign)
    .filter(Boolean)
    .join(",");
}

/**
 * Route data is a normal cached HTTP read. This hook intentionally owns its
 * retry timer: leaving a preview or changing callsign aborts the request and
 * clears the timer, so the private service never keeps a hidden route job.
 */
export function useFlightRoutes(
  aircraft: AircraftRouteCandidate[],
  routeContextInput: FlightRouteHookContext = {},
) {
  const enabled = routeContextInput?.enabled !== false;
  const cacheRef = useRef(new Map<string, RouteCacheEntry>());
  const [version, setVersion] = useState(0);
  const [routeStatusByCallsign, setRouteStatusByCallsign] = useState<
    Record<string, RouteLookupStatus>
  >({});
  const candidateKey = useMemo(() => routeCandidateKey(aircraft), [aircraft]);
  const routeCandidates = useMemo(
    () =>
      candidateKey
        .split(",")
        .filter(Boolean)
        .map((callsign) => ({ callsign })),
    [candidateKey],
  );

  useEffect(() => {
    if (!enabled || routeCandidates.length === 0) return undefined;
    const cache = cacheRef.current;
    const pending = resolvePendingRouteLookups({
      aircraft: routeCandidates,
      cache,
      inFlight: new Set(),
      // The public endpoint is deliberately callsign-only. Context remains a
      // display concern and cannot split browser cache keys or server work.
      routeContext: {},
    });
    const callsign = pending[0];
    if (!callsign) return undefined;

    let disposed = false;
    let retryTimer: number | null = null;
    let controller: AbortController | null = null;
    let attempt = 0;

    const finish = (route: FlightRoute | null, status?: RouteLookupStatus) => {
      if (disposed) return;
      writeRouteCacheEntry(cache, callsign, route, Date.now(), {});
      setRouteStatusByCallsign((current) => {
        const next = { ...current };
        if (status) next[callsign] = status;
        else delete next[callsign];
        return next;
      });
      setVersion((current) => current + 1);
    };

    const lookup = async () => {
      controller = new AbortController();
      setRouteStatusByCallsign((current) => ({
        ...current,
        [callsign]: attempt === 0 ? "pending" : "retrying",
      }));
      try {
        const route = await routeClient.fetchRoute(callsign, {
          signal: controller.signal,
        });
        finish(route);
      } catch (error) {
        if (disposed || controller.signal.aborted) return;
        const status = error instanceof FlightRouteHttpError ? error.status : null;
        if (!isTemporaryRouteFailure(status)) {
          finish(null, "unavailable");
          return;
        }
        const retryAfterMs =
          error instanceof FlightRouteHttpError ? error.retryAfterMs : null;
        const delay = resolveRouteRetryDelayMs({
          attempt,
          retryAfterMs,
        });
        attempt += 1;
        setRouteStatusByCallsign((current) => ({
          ...current,
          [callsign]: "retrying",
        }));
        retryTimer = window.setTimeout(() => {
          retryTimer = null;
          void lookup();
        }, delay);
      }
    };

    void lookup();
    return () => {
      disposed = true;
      controller?.abort();
      if (retryTimer != null) window.clearTimeout(retryTimer);
    };
  }, [candidateKey, enabled, routeCandidates]);

  const routesByCallsign = useMemo(() => {
    void version;
    return buildRoutesByCallsign({
      aircraft: routeCandidates,
      cache: cacheRef.current,
      routeContext: {},
    });
  }, [routeCandidates, version]);

  return {
    routesByCallsign,
    routeStatusByCallsign,
    loadingCount: Object.values(routeStatusByCallsign).filter(
      (status) => status === "pending" || status === "retrying",
    ).length,
  };
}
