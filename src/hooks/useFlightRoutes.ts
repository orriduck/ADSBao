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
  buildRouteCacheKey,
  buildRouteProxyRequest,
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

async function readRouteProxyResult(response: Response) {
  if (!response.ok) {
    throw new Error(`Route proxy HTTP ${response.status}`);
  }
  const text = await response.text();
  if (!text) return null;
  return JSON.parse(text) as FlightRoute | null;
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
  const proxyControllersRef = useRef(new Map<string, AbortController>());
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
    const proxyControllers = proxyControllersRef.current;
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
      for (const controller of proxyControllers.values()) controller.abort();
      proxyControllers.clear();
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
  }, [client, pendingCallsigns, routeContext, routeTransport]);

  useEffect(() => {
    const proxyControllers = proxyControllersRef.current;
    if (routeTransport !== ROUTE_LOOKUP_TRANSPORT.PROXY) {
      for (const controller of proxyControllers.values()) controller.abort();
      proxyControllers.clear();
      return;
    }

    const wanted = new Set<string>();
    for (const callsign of pendingCallsigns) {
      const request = buildRouteProxyRequest(callsign, routeContext);
      if (!request) continue;
      const key = buildRouteCacheKey(request.callsign, routeContext) || request.url;
      wanted.add(key);
      if (proxyControllers.has(key)) continue;

      const controller = new AbortController();
      proxyControllers.set(key, controller);
      fetch(request.url, {
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      })
        .then(readRouteProxyResult)
        .then((route) => {
          if (!mountedRef.current || controller.signal.aborted) return;
          flightRouteScheduler.applyRouteResult(
            request.callsign,
            route || null,
            routeContext,
          );
        })
        .catch((error) => {
          if (controller.signal.aborted) return;
          if (process.env.NODE_ENV !== "production") {
            console.warn(
              `[flight-route-proxy] lookup failed for ${request.callsign}:`,
              error,
            );
          }
        })
        .finally(() => {
          if (proxyControllers.get(key) === controller) {
            proxyControllers.delete(key);
          }
        });
    }

    for (const [key, controller] of proxyControllers) {
      if (!wanted.has(key)) {
        controller.abort();
        proxyControllers.delete(key);
      }
    }
  }, [pendingCallsigns, routeContext, routeTransport]);

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
