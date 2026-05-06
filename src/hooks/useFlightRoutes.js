"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildRoutesByCallsign,
  resolvePendingRouteLookups,
} from "../features/flight-routes/flightRouteLookupModel.js";
import { flightRouteClient } from "../services/aviationData.js";

const routeCache = new Map();
const inFlight = new Set();

export function useFlightRoutes(aircraft) {
  const [version, setVersion] = useState(0);
  const [loadingCount, setLoadingCount] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const bump = () => {
      if (mountedRef.current) setVersion((value) => value + 1);
    };
    const lookup = async (callsign) => {
      inFlight.add(callsign);
      if (mountedRef.current) setLoadingCount(inFlight.size);
      try {
        const route = await flightRouteClient.fetchFlightRoute(callsign);
        routeCache.set(callsign, { route, time: Date.now() });
      } catch (error) {
        console.warn(`Flight route lookup failed for ${callsign}:`, error.message);
        routeCache.set(callsign, { route: null, time: Date.now() });
      } finally {
        inFlight.delete(callsign);
        // Always bump so the color updates the moment the route lands,
        // even if the aircraft list has refreshed since this fetch started.
        bump();
        if (mountedRef.current) setLoadingCount(inFlight.size);
      }
    };

    const pending = resolvePendingRouteLookups({
      aircraft,
      cache: routeCache,
      inFlight,
      now: Date.now(),
    });

    pending.forEach((callsign, index) => {
      if (index === 0) lookup(callsign);
      else requestAnimationFrame(() => lookup(callsign));
    });
    bump();
  }, [aircraft]);

  const routesByCallsign = useMemo(() => {
    version;
    return buildRoutesByCallsign({
      aircraft,
      cache: routeCache,
      now: Date.now(),
    });
  }, [aircraft, version]);

  return { routesByCallsign, loadingCount };
}
