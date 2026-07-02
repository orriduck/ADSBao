import assert from "node:assert/strict";

import { FLIGHT_ROUTE_LOOKUP_CONFIG } from "../../../config/aviation";
import {
  persistRouteCache,
  readPersistedRouteCache,
} from "./flightRouteCacheStorage";
import type { RouteCacheEntry } from "./flightRouteLookupModel";

const STORAGE_KEY = "adsbao:flight-routes:v1";
const NOW = 1_750_000_000_000;

const originalWindow = (globalThis as any).window;
const store = new Map<string, string>();

(globalThis as any).window = {
  localStorage: {
    getItem(key: string) {
      return store.get(key) || null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  },
};

function routeEntry(time: number, source = "adsbdb"): RouteCacheEntry {
  return {
    route: { callsign: "DAL123", source },
    time,
  };
}

try {
  // Round-trip: hits (incl. provider-partitioned) survive; negative
  // entries stay session-only so a failing upstream cannot poison every
  // subsequent page load.
  persistRouteCache(
    new Map<string, RouteCacheEntry>([
      ["DAL123|KBOS|BOS", routeEntry(NOW - 1_000)],
      ["UAL1|FLIGHTAWARE", routeEntry(NOW - 2_000, "flightaware")],
      ["SWA555", { route: null, time: NOW - 3_000 }],
    ]),
    { now: NOW },
  );
  const restored = readPersistedRouteCache({ now: NOW });
  assert.equal(restored.size, 2, "only resolved routes should persist");
  assert.equal(restored.get("DAL123|KBOS|BOS")?.route?.source, "adsbdb");
  assert.equal(restored.get("UAL1|FLIGHTAWARE")?.route?.source, "flightaware");
  assert.equal(restored.has("SWA555"), false, "negative entries never persist");

  // TTL pruning: expired hit entries drop on write/read.
  persistRouteCache(
    new Map<string, RouteCacheEntry>([
      ["FRESH1", routeEntry(NOW - FLIGHT_ROUTE_LOOKUP_CONFIG.hitCacheMs + 60_000)],
      ["STALE1", routeEntry(NOW - FLIGHT_ROUTE_LOOKUP_CONFIG.hitCacheMs - 60_000)],
    ]),
    { now: NOW },
  );
  assert.deepEqual(
    [...readPersistedRouteCache({ now: NOW }).keys()],
    ["FRESH1"],
    "expired hit entries should prune",
  );

  // Cap: newest entries win when over the persistence limit.
  const bigCache = new Map<string, RouteCacheEntry>();
  for (let index = 0; index < 700; index += 1) {
    bigCache.set(`CS${index}`, routeEntry(NOW - index * 1_000));
  }
  persistRouteCache(bigCache, { now: NOW });
  const capped = readPersistedRouteCache({ now: NOW });
  assert.equal(capped.size, 600, "persisted entries should cap at 600");
  assert.ok(capped.has("CS0"), "newest entry survives the cap");
  assert.ok(!capped.has("CS699"), "oldest entry drops at the cap");

  // Corrupt storage starts cold instead of throwing.
  store.set(STORAGE_KEY, "{not json");
  assert.equal(readPersistedRouteCache({ now: NOW }).size, 0);
  store.set(STORAGE_KEY, JSON.stringify({ DAL123: 1 }));
  assert.equal(readPersistedRouteCache({ now: NOW }).size, 0);
  store.set(
    STORAGE_KEY,
    JSON.stringify([["OK", { route: null, time: "bad" }]]),
  );
  assert.equal(readPersistedRouteCache({ now: NOW }).size, 0);
} finally {
  if (typeof originalWindow === "undefined") {
    delete (globalThis as any).window;
  } else {
    (globalThis as any).window = originalWindow;
  }
}

console.log("flightRouteCacheStorage.test.ts ok");
