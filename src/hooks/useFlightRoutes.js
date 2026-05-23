"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeCallsign } from "../utils/callsign.js";
import { flightRouteScheduler } from "../features/aviation/flight-routes/flightRouteScheduler.js";

export { formatFlightRouteQueueAudit } from "../features/aviation/flight-routes/flightRouteScheduler.js";

export function useFlightRoutes(aircraft, routeContextInput = {}) {
  const [version, setVersion] = useState(0);
  const [loadingCount, setLoadingCount] = useState(0);
  const mountedRef = useRef(true);
  const routeContext = useMemo(
    () => ({
      icao: routeContextInput?.icao || "",
      iata: routeContextInput?.iata || "",
      // Focal coords flow through to the scheduler so it can rank candidates
      // farthest-first. They are *not* part of the cache key — see
      // `buildRouteCacheKey` in flightRouteLookupModel.js.
      lat: Number(routeContextInput?.lat),
      lon: Number(routeContextInput?.lon),
      routeProvider: routeContextInput?.routeProvider || "",
    }),
    [
      routeContextInput?.icao,
      routeContextInput?.iata,
      routeContextInput?.lat,
      routeContextInput?.lon,
      routeContextInput?.routeProvider,
    ],
  );

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    flightRouteScheduler.syncAircraft({
      aircraft,
      routeContext,
    });
  }, [aircraft, routeContext]);

  useEffect(
    () =>
      flightRouteScheduler.subscribe(({ loadingCount: nextLoadingCount }) => {
        if (!mountedRef.current) return;
        setLoadingCount(nextLoadingCount);
        // Always bump so the color updates the moment the route lands,
        // even if the aircraft list has refreshed since this fetch started.
        setVersion((value) => value + 1);
      }),
    [],
  );

  const routesByCallsign = useMemo(() => {
    version;
    return flightRouteScheduler.getRoutesByCallsign({
      aircraft,
      routeContext,
    });
  }, [aircraft, routeContext, version]);

  // Splice a freshly-submitted community-feedback route into the in-memory
  // cache so the UI repaints immediately, without waiting for the next
  // proxy lookup. Cache time is set to "now" so the entry rides the normal
  // hit-cache TTL; the upstream Supabase override row independently bounds
  // visibility to 12h.
  const applyTemporaryRoute = useCallback(
    (callsign, route) => {
      const normalized = normalizeCallsign(callsign);
      if (!normalized || !route) return;
      flightRouteScheduler.applyTemporaryRoute(normalized, route, routeContext);
    },
    [routeContext],
  );

  return { routesByCallsign, loadingCount, applyTemporaryRoute };
}
