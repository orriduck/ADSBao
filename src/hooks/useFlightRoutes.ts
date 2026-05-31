"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeCallsign } from "../utils/callsign";
import { flightRouteScheduler } from "../features/aviation/flight-routes/flightRouteScheduler";
import { createRouteDisplayBatcher } from "../features/aviation/flight-routes/flightRouteDisplayBatchModel";

export { formatFlightRouteQueueAudit } from "../features/aviation/flight-routes/flightRouteScheduler";

type FlightRouteHookRecord = Record<string, any>;

export function useFlightRoutes(
  aircraft: FlightRouteHookRecord[],
  routeContextInput: FlightRouteHookRecord = {},
) {
  const [version, setVersion] = useState(0);
  const [loadingCount, setLoadingCount] = useState(0);
  const mountedRef = useRef(true);
  const routeDisplayBatcherRef = useRef<any>(null);
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
    mountedRef.current = true;
    routeDisplayBatcherRef.current = createRouteDisplayBatcher({
      publish: (routeVersion) => {
        if (!mountedRef.current) return;
        setVersion(routeVersion);
      },
    });

    return () => {
      mountedRef.current = false;
      routeDisplayBatcherRef.current?.dispose();
      routeDisplayBatcherRef.current = null;
    };
  }, []);

  useEffect(() => {
    flightRouteScheduler.syncAircraft({
      aircraft,
      routeContext,
    });
  }, [aircraft, routeContext]);

  useEffect(
    () => {
      const unsubscribe = flightRouteScheduler.subscribe((state) => {
        if (!mountedRef.current) return;
        setLoadingCount(state.loadingCount);
        // Route fetches complete independently. Publish route-cache changes
        // to the list in a small batch so route labels and their reveal
        // animations enter together instead of rippling row by row.
        routeDisplayBatcherRef.current?.syncRouteVersion(state.routeVersion);
      });
      return () => {
        unsubscribe();
      };
    },
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
    (callsign: unknown, route: FlightRouteHookRecord) => {
      const normalized = normalizeCallsign(callsign);
      if (!normalized || !route) return;
      flightRouteScheduler.applyTemporaryRoute(normalized, route, routeContext);
    },
    [routeContext],
  );

  return { routesByCallsign, loadingCount, applyTemporaryRoute };
}
