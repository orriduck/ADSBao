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
import {
  ROUTE_LOOKUP_TRANSPORT,
  resolveRouteLookupTransport,
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

function routeSubscriptionKey({
  channel,
  params,
}: {
  channel: string;
  params?: Record<string, unknown>;
}) {
  return `${channel}|${JSON.stringify(params || {})}`;
}

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
  const routeTransport = useMemo(
    () => resolveRouteLookupTransport(routeContext),
    [routeContext],
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
    if (routeTransport !== ROUTE_LOOKUP_TRANSPORT.REALTIME) {
      for (const unsubscribe of routeUnsubscribersRef.current.values()) {
        unsubscribe();
      }
      routeUnsubscribersRef.current.clear();
      return;
    }

    const wanted = new Set(
      pendingCallsigns
        .map((callsign) => {
          const request = buildRouteChannel(callsign, routeContext);
          return request ? routeSubscriptionKey(request) : "";
        })
        .filter(Boolean),
    );

    for (const [key, unsubscribe] of routeUnsubscribersRef.current) {
      if (!wanted.has(key)) {
        unsubscribe();
        routeUnsubscribersRef.current.delete(key);
      }
    }

    for (const callsign of pendingCallsigns) {
      const request = buildRouteChannel(callsign, routeContext);
      if (!request) continue;
      const key = routeSubscriptionKey(request);
      if (routeUnsubscribersRef.current.has(key)) continue;
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
      routeUnsubscribersRef.current.set(key, unsubscribe);
    }
  }, [client, pendingCallsigns, routeContext, routeTransport]);

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
