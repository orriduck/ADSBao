import { normalizeCallsign } from "../../../utils/callsign";
import {
  createRouteCachePersister,
  readPersistedRouteCache,
} from "./flightRouteCacheStorage";
import {
  buildRoutesByCallsign,
  resolvePendingRouteLookups,
  type AircraftRouteCandidate,
  type FlightRoute,
  type RouteCacheEntry,
  type RouteContext,
  writeRouteCacheEntry,
} from "./flightRouteLookupModel";

type FlightRouteSchedulerState = {
  loadingCount: number;
  routeVersion: number;
};

type FlightRouteSchedulerOptions = {
  cache?: Map<string, RouteCacheEntry>;
  now?: () => number;
  persist?: (cache: Map<string, RouteCacheEntry>) => void;
};

type FlightRouteSchedulerQuery = {
  aircraft?: AircraftRouteCandidate[];
  routeContext?: RouteContext;
};

type PendingFlightRouteQuery = FlightRouteSchedulerQuery & {
  maxLookups?: number;
};

export function createFlightRouteScheduler({
  cache = new Map(),
  now = Date.now,
  persist,
}: FlightRouteSchedulerOptions = {}) {
  const listeners = new Set<(state: FlightRouteSchedulerState) => void>();
  let routeVersion = 0;

  const notify = () => {
    const state = { loadingCount: 0, routeVersion };
    for (const listener of listeners) listener(state);
  };

  const commitRoute = (
    callsign: unknown,
    route: FlightRoute | null,
    routeContext: RouteContext = {},
  ) => {
    const normalized = normalizeCallsign(callsign);
    if (!normalized) return;
    writeRouteCacheEntry(cache, normalized, route, now(), routeContext);
    persist?.(cache);
    routeVersion += 1;
    notify();
  };

  return {
    subscribe(listener: (state: FlightRouteSchedulerState) => void) {
      listeners.add(listener);
      listener({ loadingCount: 0, routeVersion });
      return () => listeners.delete(listener);
    },

    getRoutesByCallsign({ aircraft = [], routeContext = {} }: FlightRouteSchedulerQuery = {}) {
      return buildRoutesByCallsign({
        aircraft,
        cache,
        routeContext,
        now: now(),
      });
    },

    getPendingCallsigns({
      aircraft = [],
      routeContext = {},
      maxLookups,
    }: PendingFlightRouteQuery = {}) {
      return resolvePendingRouteLookups({
        aircraft,
        cache,
        inFlight: new Set(),
        queued: new Set(),
        routeContext,
        now: now(),
        maxLookups,
      });
    },

    applyRouteResult(
      callsign: unknown,
      route: FlightRoute | null,
      routeContext: RouteContext = {},
    ) {
      commitRoute(callsign, route || null, routeContext);
    },

    applyTemporaryRoute(
      callsign: unknown,
      route: FlightRoute | null,
      routeContext: RouteContext = {},
    ) {
      if (!route) return;
      commitRoute(callsign, route, routeContext);
    },

    dispose() {
      listeners.clear();
    },
  };
}

// The singleton hydrates from localStorage so routes survive the hard
// reload between detail pages, and writes back (debounced) as results land.
export const flightRouteScheduler = createFlightRouteScheduler({
  cache: readPersistedRouteCache(),
  persist: createRouteCachePersister(),
});
