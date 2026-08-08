import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildRoutesByCallsign,
  filterRouteLookupStatuses,
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

function routeMetadataKey(value: unknown) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function routeCandidateKey(aircraft: AircraftRouteCandidate[]) {
  return (aircraft || [])
    .map((item) => {
      const callsign = normalizeCallsign(item?.callsign);
      if (!isLookupCallsign(callsign)) return "";
      return [
        callsign,
        routeMetadataKey(item?.origin),
        routeMetadataKey(item?.destination),
      ].join(":");
    })
    .filter(Boolean)
    .join(",");
}

function buildRouteCandidates(aircraft: AircraftRouteCandidate[]) {
  const seen = new Set<string>();
  return (aircraft || []).flatMap((item) => {
    const callsign = normalizeCallsign(item?.callsign);
    if (!isLookupCallsign(callsign) || seen.has(callsign)) return [];
    seen.add(callsign);
    return [{ callsign, origin: item?.origin, destination: item?.destination }];
  });
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
  const routeCandidates = useMemo(() => buildRouteCandidates(aircraft), [candidateKey]);

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
  // `finish` advances `version` after caching each result. Including it here
  // lets the next uncached callsign run without waiting for a traffic update;
  // the cache means that rerun cannot refetch a completed candidate.
  }, [candidateKey, enabled, routeCandidates, version]);

  const routesByCallsign = useMemo(() => {
    void version;
    return buildRoutesByCallsign({
      aircraft: routeCandidates,
      cache: cacheRef.current,
      routeContext: {},
    });
  }, [routeCandidates, version]);

  // Cleanup aborts a superseded lookup, but React may render before its
  // status-map update lands. Only expose statuses belonging to the current
  // candidate set so an old pending/retrying callsign cannot hold this view
  // in a loading state after selection changes.
  const activeRouteStatusByCallsign = useMemo(
    () => filterRouteLookupStatuses(routeStatusByCallsign, routeCandidates),
    [routeCandidates, routeStatusByCallsign],
  );

  return {
    routesByCallsign,
    routeStatusByCallsign: activeRouteStatusByCallsign,
    loadingCount: Object.values(activeRouteStatusByCallsign).filter(
      (status) => status === "pending" || status === "retrying",
    ).length,
  };
}
