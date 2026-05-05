"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FLIGHT_ROUTE_LOOKUP_CONFIG } from "../config/aviation.js";
import { flightRouteClient } from "../services/aviationData.js";
import { isLookupCallsign, normalizeCallsign } from "../utils/callsign.js";

const routeCache = new Map();
const inFlight = new Set();

const getFreshCacheEntry = (callsign, now = Date.now()) => {
  const cached = routeCache.get(callsign);
  if (!cached) return null;
  const maxAge = cached.route
    ? FLIGHT_ROUTE_LOOKUP_CONFIG.hitCacheMs
    : FLIGHT_ROUTE_LOOKUP_CONFIG.missCacheMs;
  if (now - cached.time <= maxAge) return cached;
  routeCache.delete(callsign);
  return null;
};

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

    const now = Date.now();
    const callsigns = [
      ...new Set(
        aircraft
          .map((item) => normalizeCallsign(item.callsign))
          .filter(isLookupCallsign),
      ),
    ];
    const pending = callsigns
      .filter(
        (callsign) =>
          !getFreshCacheEntry(callsign, now) && !inFlight.has(callsign),
      )
      .slice(0, FLIGHT_ROUTE_LOOKUP_CONFIG.maxLookupsPerPass);

    pending.forEach((callsign, index) => {
      if (index === 0) lookup(callsign);
      else requestAnimationFrame(() => lookup(callsign));
    });
    bump();
  }, [aircraft]);

  const routesByCallsign = useMemo(() => {
    version;
    const routes = {};
    const now = Date.now();
    for (const item of aircraft || []) {
      const callsign = normalizeCallsign(item.callsign);
      const cached = getFreshCacheEntry(callsign, now);
      if (cached?.route) routes[callsign] = cached.route;
    }
    return routes;
  }, [aircraft, version]);

  return { routesByCallsign, loadingCount };
}
