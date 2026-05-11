"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildRouteCacheKey,
  buildRoutesByCallsign,
  getRouteLookupStats,
  resolvePendingRouteLookups,
} from "../features/flight-routes/flightRouteLookupModel.js";
import { flightRouteClient } from "../services/aviationData.js";
import { FLIGHT_ROUTE_LOOKUP_CONFIG } from "../config/aviation.js";

const routeCache = new Map();
const inFlight = new Set();
const queued = new Set();
const routeQueue = [];

let routeQueueTimer = null;
let lastLookupStartedAt = 0;
let lastAuditLoggedAt = 0;
let lastAuditSnapshot = "";
let latestAircraft = [];
let latestRouteContext = {};

function getAuditPayload() {
  const stats = getRouteLookupStats({
    aircraft: latestAircraft,
    cache: routeCache,
    queued,
    inFlight,
    routeContext: latestRouteContext,
    now: Date.now(),
  });
  return stats;
}

export function formatFlightRouteQueueAudit(stats) {
  return `[audit:flight-route-queue]: done=${stats.done},in_queue=${stats.in_queue},inflight=${stats.inflight},not_do=${stats.not_do}`;
}

function auditRouteQueue() {
  const payload = getAuditPayload();
  const snapshot = JSON.stringify(payload);
  const now = Date.now();
  const queueDrained =
    payload.in_queue === 0 && payload.inflight === 0 && payload.not_do === 0;

  if (
    snapshot === lastAuditSnapshot &&
    now - lastAuditLoggedAt < FLIGHT_ROUTE_LOOKUP_CONFIG.auditLogIntervalMs
  ) {
    return;
  }

  if (
    !queueDrained &&
    now - lastAuditLoggedAt < FLIGHT_ROUTE_LOOKUP_CONFIG.auditLogIntervalMs
  ) {
    return;
  }

  lastAuditSnapshot = snapshot;
  lastAuditLoggedAt = now;
  console.info(formatFlightRouteQueueAudit(payload));
}

export function useFlightRoutes(aircraft, routeContextInput = {}) {
  const [version, setVersion] = useState(0);
  const [loadingCount, setLoadingCount] = useState(0);
  const mountedRef = useRef(true);
  const routeContext = useMemo(
    () => ({
      icao: routeContextInput?.icao || "",
      iata: routeContextInput?.iata || "",
    }),
    [routeContextInput?.icao, routeContextInput?.iata],
  );

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    latestAircraft = aircraft;
    latestRouteContext = routeContext;

    const bump = () => {
      if (mountedRef.current) setVersion((value) => value + 1);
    };

    const updateLoadingCount = () => {
      if (mountedRef.current) setLoadingCount(inFlight.size + queued.size);
    };

    const scheduleNextLookup = (delayMs = 0) => {
      if (routeQueueTimer || routeQueue.length === 0) return;
      routeQueueTimer = setTimeout(() => {
        routeQueueTimer = null;
        drainRouteQueue();
      }, delayMs);
    };

    const lookup = async (callsign) => {
      inFlight.add(callsign);
      updateLoadingCount();
      auditRouteQueue();
      try {
        const route = await flightRouteClient.fetchFlightRoute(
          callsign,
          routeContext,
        );
        routeCache.set(buildRouteCacheKey(callsign, routeContext), {
          route,
          time: Date.now(),
        });
        auditRouteQueue();
      } catch (error) {
        console.warn(`Flight route lookup failed for ${callsign}:`, error.message);
        routeCache.set(buildRouteCacheKey(callsign, routeContext), {
          route: null,
          time: Date.now(),
        });
        auditRouteQueue();
      } finally {
        inFlight.delete(callsign);
        // Always bump so the color updates the moment the route lands,
        // even if the aircraft list has refreshed since this fetch started.
        bump();
        updateLoadingCount();
        scheduleNextLookup(FLIGHT_ROUTE_LOOKUP_CONFIG.queueIntervalMs);
      }
    };

    const drainRouteQueue = () => {
      if (
        inFlight.size >= FLIGHT_ROUTE_LOOKUP_CONFIG.maxConcurrentLookups ||
        routeQueue.length === 0
      ) {
        return;
      }

      const elapsed = Date.now() - lastLookupStartedAt;
      const waitMs = Math.max(
        0,
        FLIGHT_ROUTE_LOOKUP_CONFIG.queueIntervalMs - elapsed,
      );
      if (waitMs > 0) {
        scheduleNextLookup(waitMs);
        return;
      }

      while (
        routeQueue.length > 0 &&
        inFlight.size < FLIGHT_ROUTE_LOOKUP_CONFIG.maxConcurrentLookups
      ) {
        const callsign = routeQueue.shift();
        queued.delete(callsign);
        lastLookupStartedAt = Date.now();
        lookup(callsign);
      }
    };

    const queueSlots = Math.max(
      0,
      FLIGHT_ROUTE_LOOKUP_CONFIG.maxQueueSize - queued.size,
    );
    const pending = resolvePendingRouteLookups({
      aircraft,
      cache: routeCache,
      inFlight,
      queued,
      routeContext,
      now: Date.now(),
      maxLookups: Math.min(
        FLIGHT_ROUTE_LOOKUP_CONFIG.maxLookupsPerPass,
        queueSlots,
      ),
    });

    for (const callsign of pending) {
      queued.add(callsign);
      routeQueue.push(callsign);
    }

    if (pending.length > 0) {
      auditRouteQueue();
      updateLoadingCount();
      scheduleNextLookup();
    }

    bump();
  }, [aircraft, routeContext]);

  const routesByCallsign = useMemo(() => {
    version;
    return buildRoutesByCallsign({
      aircraft,
      cache: routeCache,
      routeContext,
      now: Date.now(),
    });
  }, [aircraft, routeContext, version]);

  return { routesByCallsign, loadingCount };
}
