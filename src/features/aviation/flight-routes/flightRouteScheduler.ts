import { FLIGHT_ROUTE_LOOKUP_CONFIG } from "../../../config/aviation";
import { normalizeCallsign } from "../../../utils/callsign";
import { flightRouteClient } from "../aviationData";
import {
  buildRouteCacheKey,
  buildRoutesByCallsign,
  getRouteLookupStats,
  resolvePendingRouteLookups,
  writeRouteCacheEntry,
} from "./flightRouteLookupModel";

type FlightRouteSchedulerOptions = {
  client?: any;
  config?: Record<string, any>;
  cache?: Map<string, any>;
  logger?: Pick<Console, "info" | "warn">;
  now?: () => number;
  schedule?: (callback: () => void, delayMs?: number) => any;
  clearSchedule?: (handle: any) => void;
};

function callsignSetForRouteContext(
  keys: Set<string>,
  routeContext: Record<string, unknown>,
) {
  const callsigns = new Set<string>();
  for (const key of keys) {
    const callsign = String(key).split("|")[0] || "";
    if (buildRouteCacheKey(callsign, routeContext) === key) {
      callsigns.add(callsign);
    }
  }
  return callsigns;
}

function defaultLogger() {
  return console;
}

export function formatFlightRouteQueueAudit(stats) {
  return `[audit:flight-route-queue]: done=${stats.done},in_queue=${stats.in_queue},inflight=${stats.inflight},not_do=${stats.not_do}`;
}

export function createFlightRouteScheduler({
  client = flightRouteClient,
  config = FLIGHT_ROUTE_LOOKUP_CONFIG,
  cache = new Map(),
  logger = defaultLogger(),
  now = Date.now,
  schedule = setTimeout,
  clearSchedule = clearTimeout,
}: FlightRouteSchedulerOptions = {}) {
  const listeners = new Set<(state: Record<string, any>) => void>();
  const inFlightKeys = new Set<string>();
  const queuedKeys = new Set<string>();
  const routeQueue: Record<string, any>[] = [];

  let routeQueueTimer = null;
  let lastLookupStartedAt = 0;
  let lastAuditLoggedAt = 0;
  let lastAuditSnapshot = "";
  let latestAircraft = [];
  let latestRouteContext = {};
  let routeVersion = 0;

  const notify = () => {
    const state = {
      loadingCount: inFlightKeys.size + queuedKeys.size,
      routeVersion,
    };
    for (const listener of listeners) listener(state);
  };

  const getStatsForLatestInput = () =>
    getRouteLookupStats({
      aircraft: latestAircraft,
      cache,
      queued: callsignSetForRouteContext(queuedKeys, latestRouteContext),
      inFlight: callsignSetForRouteContext(inFlightKeys, latestRouteContext),
      routeContext: latestRouteContext,
      now: now(),
    });

  const auditRouteQueue = () => {
    const payload = getStatsForLatestInput();
    const snapshot = JSON.stringify(payload);
    const timestamp = now();
    const queueDrained =
      payload.in_queue === 0 && payload.inflight === 0 && payload.not_do === 0;

    if (
      snapshot === lastAuditSnapshot &&
      timestamp - lastAuditLoggedAt < config.auditLogIntervalMs
    ) {
      return;
    }

    if (!queueDrained && timestamp - lastAuditLoggedAt < config.auditLogIntervalMs) {
      return;
    }

    lastAuditSnapshot = snapshot;
    lastAuditLoggedAt = timestamp;
    logger.info(formatFlightRouteQueueAudit(payload));
  };

  const scheduleNextLookup = (delayMs = 0) => {
    if (routeQueueTimer || routeQueue.length === 0) return;
    routeQueueTimer = schedule(() => {
      routeQueueTimer = null;
      drainRouteQueue();
    }, delayMs);
  };

  const lookup = async ({ callsign, routeContext, cacheKey }) => {
    inFlightKeys.add(cacheKey);
    notify();
    auditRouteQueue();
    try {
      const route = await client.fetchFlightRoute(callsign, routeContext);
      const timestamp = now();
      if (route) {
        writeRouteCacheEntry(cache, callsign, route, timestamp, routeContext);
      } else {
        cache.set(cacheKey, { route: null, time: timestamp });
      }
      routeVersion += 1;
      auditRouteQueue();
    } catch (error) {
      logger.warn?.(
        `Flight route lookup failed for ${callsign}:`,
        error?.message || error,
      );
      cache.set(cacheKey, { route: null, time: now() });
      routeVersion += 1;
      auditRouteQueue();
    } finally {
      inFlightKeys.delete(cacheKey);
      notify();
      scheduleNextLookup(config.queueIntervalMs);
    }
  };

  function drainRouteQueue() {
    if (
      inFlightKeys.size >= config.maxConcurrentLookups ||
      routeQueue.length === 0
    ) {
      return;
    }

    const elapsed = now() - lastLookupStartedAt;
    const waitMs = Math.max(0, config.queueIntervalMs - elapsed);
    if (waitMs > 0) {
      scheduleNextLookup(waitMs);
      return;
    }

    while (
      routeQueue.length > 0 &&
      inFlightKeys.size < config.maxConcurrentLookups
    ) {
      const entry = routeQueue.shift();
      queuedKeys.delete(entry.cacheKey);
      lastLookupStartedAt = now();
      lookup(entry as any);
    }
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      listener({
        loadingCount: inFlightKeys.size + queuedKeys.size,
        routeVersion,
      });
      return () => listeners.delete(listener);
    },

    syncAircraft({ aircraft = [], routeContext = {} }) {
      latestAircraft = aircraft;
      latestRouteContext = routeContext;

      const pending = resolvePendingRouteLookups({
        aircraft,
        cache,
        inFlight: callsignSetForRouteContext(inFlightKeys, routeContext),
        queued: callsignSetForRouteContext(queuedKeys, routeContext),
        routeContext,
        now: now(),
        maxLookups: Math.min(
          config.maxLookupsPerPass,
          Math.max(0, config.maxQueueSize - queuedKeys.size),
        ),
      });

      for (const callsign of pending) {
        const normalized = normalizeCallsign(callsign);
        const cacheKey = buildRouteCacheKey(normalized, routeContext);
        if (!cacheKey || queuedKeys.has(cacheKey) || inFlightKeys.has(cacheKey)) {
          continue;
        }
        queuedKeys.add(cacheKey);
        routeQueue.push({ callsign: normalized, routeContext, cacheKey });
      }

      if (pending.length > 0) {
        auditRouteQueue();
        scheduleNextLookup();
      }
      notify();
    },

    getRoutesByCallsign({ aircraft = [], routeContext = {} } = {}) {
      return buildRoutesByCallsign({
        aircraft,
        cache,
        routeContext,
        now: now(),
      });
    },

    getLoadingCount() {
      return inFlightKeys.size + queuedKeys.size;
    },

    applyTemporaryRoute(callsign, route, routeContext = {}) {
      const normalized = normalizeCallsign(callsign);
      if (!normalized || !route) return;
      cache.set(buildRouteCacheKey(normalized, routeContext), {
        route,
        time: now(),
      });
      routeVersion += 1;
      notify();
    },

    dispose() {
      if (routeQueueTimer) {
        clearSchedule(routeQueueTimer);
        routeQueueTimer = null;
      }
      listeners.clear();
    },
  };
}

export const flightRouteScheduler = createFlightRouteScheduler();
