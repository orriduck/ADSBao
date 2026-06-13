"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FLIGHT_ROUTE_LOOKUP_CONFIG } from "../config/aviation";
import { normalizeCallsign } from "../utils/callsign";
import { flightRouteScheduler } from "../features/aviation/flight-routes/flightRouteScheduler";
import type {
  AircraftRouteCandidate,
  FlightRoute,
  RouteContext,
} from "../features/aviation/flight-routes/flightRouteLookupModel";
import { createRouteDisplayBatcher } from "../features/aviation/flight-routes/flightRouteDisplayBatchModel";
import { getAdsbaoRealtimeClient } from "../lib/realtime/adsbaoRealtimeClient";
import { buildRouteChannel } from "../lib/realtime/realtimeChannels";

type FlightRouteHookContext = RouteContext & {
  enabled?: boolean;
};

type RouteEventData = {
  callsign?: unknown;
  route?: FlightRoute | null;
};

export function useFlightRoutes(
  aircraft: AircraftRouteCandidate[],
  routeContextInput: FlightRouteHookContext = {},
) {
  const enabled = routeContextInput?.enabled !== false;
  const client = useMemo(() => getAdsbaoRealtimeClient(), []);
  const [version, setVersion] = useState(0);
  const mountedRef = useRef(true);
  const routeDisplayBatcherRef = useRef<ReturnType<typeof createRouteDisplayBatcher> | null>(
    null,
  );
  const routeUnsubscribersRef = useRef(new Map<string, () => void>());
  const routeContext = useMemo(
    () => ({
      icao: routeContextInput?.icao,
      iata: routeContextInput?.iata,
      lat: Number(routeContextInput?.lat),
      lon: Number(routeContextInput?.lon),
      routeProvider: routeContextInput?.routeProvider,
    }),
    [
      routeContextInput?.iata,
      routeContextInput?.icao,
      routeContextInput?.lat,
      routeContextInput?.lon,
      routeContextInput?.routeProvider,
    ],
  );

  useEffect(() => {
    mountedRef.current = true;
    const routeUnsubscribers = routeUnsubscribersRef.current;
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
      for (const unsubscribe of routeUnsubscribers.values()) unsubscribe();
      routeUnsubscribers.clear();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = flightRouteScheduler.subscribe((state) => {
      if (!mountedRef.current) return;
      routeDisplayBatcherRef.current?.syncRouteVersion(state.routeVersion);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const pendingCallsigns = useMemo(
    () => {
      void version;
      return enabled
        ? flightRouteScheduler.getPendingCallsigns({
            aircraft,
            routeContext,
            maxLookups: FLIGHT_ROUTE_LOOKUP_CONFIG.maxQueueSize,
          })
        : [];
    },
    [aircraft, enabled, routeContext, version],
  );

  useEffect(() => {
    const wanted = new Set(
      pendingCallsigns
        .map((callsign) => buildRouteChannel(callsign, routeContext)?.channel || "")
        .filter(Boolean),
    );

    for (const [channel, unsubscribe] of routeUnsubscribersRef.current) {
      if (!wanted.has(channel)) {
        unsubscribe();
        routeUnsubscribersRef.current.delete(channel);
      }
    }

    for (const callsign of pendingCallsigns) {
      const request = buildRouteChannel(callsign, routeContext);
      if (!request || routeUnsubscribersRef.current.has(request.channel)) continue;
      const unsubscribe = client.subscribe({
        channel: request.channel,
        params: request.params,
        listener: (event) => {
          if (event.type === "route:update") {
            const data = event.data as RouteEventData;
            flightRouteScheduler.applyRouteResult(
              data?.callsign || callsign,
              data?.route || null,
              routeContext,
            );
            return;
          }
        },
      });
      routeUnsubscribersRef.current.set(request.channel, unsubscribe);
    }
  }, [client, pendingCallsigns, routeContext]);

  const routesByCallsign = useMemo(() => {
    version;
    return flightRouteScheduler.getRoutesByCallsign({
      aircraft,
      routeContext,
    });
  }, [aircraft, routeContext, version]);

  const applyTemporaryRoute = useCallback(
    (callsign: unknown, route: FlightRoute | null) => {
      const normalized = normalizeCallsign(callsign);
      if (!normalized || !route) return;
      flightRouteScheduler.applyTemporaryRoute(normalized, route, routeContext);
    },
    [routeContext],
  );

  return {
    routesByCallsign,
    loadingCount: pendingCallsigns.length,
    applyTemporaryRoute,
  };
}
