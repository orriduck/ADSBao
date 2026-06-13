"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { FLIGHT_ROUTE_LOOKUP_CONFIG } from "../config/aviation";
import { normalizeCallsign } from "../utils/callsign";
import { flightRouteScheduler } from "../features/aviation/flight-routes/flightRouteScheduler";
import { createRouteDisplayBatcher } from "../features/aviation/flight-routes/flightRouteDisplayBatchModel";
import { getAdsbaoRealtimeClient } from "../lib/realtime/adsbaoRealtimeClient";
import { buildRouteChannel } from "../lib/realtime/realtimeChannels";

type FlightRouteHookRecord = Record<string, any>;

const ROUTE_TOAST_ID = "adsbao-realtime-route-issue";

export function useFlightRoutes(
  aircraft: FlightRouteHookRecord[],
  routeContextInput: FlightRouteHookRecord = {},
) {
  const enabled = routeContextInput?.enabled !== false;
  const client = useMemo(() => getAdsbaoRealtimeClient(), []);
  const [connectionState, setConnectionState] = useState(client.state);
  const [version, setVersion] = useState(0);
  const mountedRef = useRef(true);
  const routeDisplayBatcherRef = useRef<any>(null);
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
    const unsubscribe = client.onConnectionState(setConnectionState);
    return () => {
      unsubscribe();
    };
  }, [client]);

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
            const data = event.data as FlightRouteHookRecord;
            flightRouteScheduler.applyRouteResult(
              data?.callsign || callsign,
              data?.route || null,
              routeContext,
            );
            return;
          }
          if (event.type === "channel:error" || event.type === "subscribe:error") {
            toast.error("Realtime route lookup is unavailable.", {
              id: ROUTE_TOAST_ID,
              description: "Route labels are waiting for the ADSBao data service.",
              duration: 8_000,
            });
          }
        },
      });
      routeUnsubscribersRef.current.set(request.channel, unsubscribe);
    }
  }, [client, pendingCallsigns, routeContext]);

  useEffect(() => {
    if (!enabled || pendingCallsigns.length === 0) return undefined;
    const timer = window.setTimeout(() => {
      if (!client.enabled || connectionState !== "open") {
        toast.error("Realtime route lookup is unavailable.", {
          id: ROUTE_TOAST_ID,
          description: "Route labels are waiting for the ADSBao data service.",
          duration: 8_000,
        });
      }
    }, 8_000);
    return () => window.clearTimeout(timer);
  }, [client.enabled, connectionState, enabled, pendingCallsigns.length]);

  const routesByCallsign = useMemo(() => {
    version;
    return flightRouteScheduler.getRoutesByCallsign({
      aircraft,
      routeContext,
    });
  }, [aircraft, routeContext, version]);

  const applyTemporaryRoute = useCallback(
    (callsign: unknown, route: FlightRouteHookRecord) => {
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
