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

type RouteLookupJob = {
  attempt: number;
  controller: AbortController | null;
  retryTimer: number | null;
};

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
 * per-callsign retry jobs: leaving a preview aborts only that aircraft's work,
 * while another selected aircraft can resolve without waiting for it.
 */
export function useFlightRoutes(
  aircraft: AircraftRouteCandidate[],
  routeContextInput: FlightRouteHookContext = {},
) {
  const enabled = routeContextInput?.enabled !== false;
  const cacheRef = useRef(new Map<string, RouteCacheEntry>());
  const jobsRef = useRef(new Map<string, RouteLookupJob>());
  const [version, setVersion] = useState(0);
  const [routeStatusByCallsign, setRouteStatusByCallsign] = useState<
    Record<string, RouteLookupStatus>
  >({});
  const candidateKey = useMemo(() => routeCandidateKey(aircraft), [aircraft]);
  const routeCandidates = useMemo(() => buildRouteCandidates(aircraft), [candidateKey]);

  useEffect(() => {
    const jobs = jobsRef.current;
    const activeCallsigns = new Set(
      routeCandidates.map((candidate) => candidate.callsign),
    );

    for (const [callsign, job] of jobs) {
      if (enabled && activeCallsigns.has(callsign)) continue;
      disposeRouteLookupJob(job);
      jobs.delete(callsign);
    }

    if (!enabled || routeCandidates.length === 0) return;
    const cache = cacheRef.current;
    const pendingCallsigns = resolvePendingRouteLookups({
      aircraft: routeCandidates,
      cache,
      inFlight: new Set(jobs.keys()),
      // The public endpoint is deliberately callsign-only. Context remains a
      // display concern and cannot split browser cache keys or server work.
      routeContext: {},
    });

    for (const callsign of pendingCallsigns) {
      const job: RouteLookupJob = {
        attempt: 0,
        controller: null,
        retryTimer: null,
      };
      jobs.set(callsign, job);

      const finish = (route: FlightRoute | null, status?: RouteLookupStatus) => {
        if (jobs.get(callsign) !== job) return;
        jobs.delete(callsign);
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
        job.controller = new AbortController();
        setRouteStatusByCallsign((current) => ({
          ...current,
          [callsign]: job.attempt === 0 ? "pending" : "retrying",
        }));
        try {
          const route = await routeClient.fetchRoute(callsign, {
            signal: job.controller.signal,
          });
          finish(route);
        } catch (error) {
          if (jobs.get(callsign) !== job || job.controller.signal.aborted) return;
          const status = error instanceof FlightRouteHttpError ? error.status : null;
          if (!isTemporaryRouteFailure(status)) {
            finish(null, "unavailable");
            return;
          }
          const retryAfterMs =
            error instanceof FlightRouteHttpError ? error.retryAfterMs : null;
          const delay = resolveRouteRetryDelayMs({
            attempt: job.attempt,
            retryAfterMs,
          });
          job.attempt += 1;
          setRouteStatusByCallsign((current) => ({
            ...current,
            [callsign]: "retrying",
          }));
          job.retryTimer = window.setTimeout(() => {
            job.retryTimer = null;
            void lookup();
          }, delay);
        }
      };

      void lookup();
    }
  }, [enabled, routeCandidates]);

  useEffect(
    () => () => {
      for (const job of jobsRef.current.values()) {
        disposeRouteLookupJob(job);
      }
      jobsRef.current.clear();
    },
    [],
  );

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

function disposeRouteLookupJob(job: RouteLookupJob) {
  job.controller?.abort();
  if (job.retryTimer != null) window.clearTimeout(job.retryTimer);
}
