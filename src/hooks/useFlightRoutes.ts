import { useEffect, useMemo, useRef, useState } from "react";
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
import { normalizeCallsign } from "../utils/callsign";

type FlightRouteHookContext = RouteContext & {
  enabled?: boolean;
};

type RouteEventData = {
  callsign?: unknown;
  route?: FlightRoute | null;
};

type RouteLookupStatus = "pending" | "unavailable";

const routeCallsignFromChannel = (channel: unknown) =>
  normalizeCallsign(String(channel || "").split(":")[1]);

function routeSubscriptionKey({
  channel,
  params,
}: {
  channel: string;
  params?: Record<string, unknown>;
}) {
  return `${channel}|${JSON.stringify(params || {})}`;
}

export function buildRouteSubscriptionRequests(
  callsign: unknown,
  routeContext: RouteContext = {},
) {
  const primary = buildRouteChannel(callsign, routeContext);
  return primary ? [primary] : [];
}

export function useFlightRoutes(
  aircraft: AircraftRouteCandidate[],
  routeContextInput: FlightRouteHookContext = {},
) {
  const enabled = routeContextInput?.enabled !== false;
  const client = useMemo(() => getAdsbaoRealtimeClient(), []);
  const [version, setVersion] = useState(0);
  const [routeStatusByCallsign, setRouteStatusByCallsign] = useState<
    Record<string, RouteLookupStatus>
  >({});
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
    }),
    [
      routeContextInput?.iata,
      routeContextInput?.icao,
      routeContextInput?.lat,
      routeContextInput?.lon,
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
        .flatMap((callsign) =>
          buildRouteSubscriptionRequests(callsign, routeContext).map(
            routeSubscriptionKey,
          ),
        ),
    );

    for (const [key, unsubscribe] of routeUnsubscribersRef.current) {
      if (!wanted.has(key)) {
        unsubscribe();
        routeUnsubscribersRef.current.delete(key);
      }
    }

    for (const callsign of pendingCallsigns) {
      for (const request of buildRouteSubscriptionRequests(
        callsign,
        routeContext,
      )) {
        const key = routeSubscriptionKey(request);
        if (routeUnsubscribersRef.current.has(key)) continue;
        const unsubscribe = client.subscribe({
          channel: request.channel,
          params: request.params,
          listener: (event) => {
            if (event.type === "route:update") {
              const data = event.data as RouteEventData;
              const resolvedCallsign = normalizeCallsign(data?.callsign || callsign);
              flightRouteScheduler.applyRouteResult(
                resolvedCallsign,
                data?.route || null,
                routeContext,
              );
              setRouteStatusByCallsign((current) => {
                if (!resolvedCallsign || !current[resolvedCallsign]) return current;
                const next = { ...current };
                delete next[resolvedCallsign];
                return next;
              });
              return;
            }
            if (event.type === "channel:error") {
              const failedCallsign = routeCallsignFromChannel(event.channel) || callsign;
              if (!failedCallsign) return;
              setRouteStatusByCallsign((current) => ({
                ...current,
                [failedCallsign]: "unavailable",
              }));
              return;
            }
          },
        });
        routeUnsubscribersRef.current.set(key, unsubscribe);
        setRouteStatusByCallsign((current) => ({
          ...current,
          [callsign]: current[callsign] || "pending",
        }));
      }
    }
  }, [client, pendingCallsigns, routeContext, routeTransport]);

  const routesByCallsign = useMemo(() => {
    void version;
    return flightRouteScheduler.getRoutesByCallsign({
      aircraft,
      routeContext,
    });
  }, [aircraft, routeContext, version]);

  return {
    routesByCallsign,
    routeStatusByCallsign,
    loadingCount: pendingCallsigns.length,
  };
}
