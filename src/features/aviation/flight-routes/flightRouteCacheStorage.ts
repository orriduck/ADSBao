// Browser-local persistence for the flight-route lookup cache. The
// scheduler's in-memory Map dies on every detail-page navigation (flight
// pages are hard reloads by design), so without this layer every page
// load re-fetches routes the map view already resolved seconds earlier.
//
// Entries keep the exact cache-key/entry shape used by
// `flightRouteLookupModel` — including the provider partition embedded in
// the keys — so hydration cannot blur the FlightAware/adsbdb boundary:
// lookups still go through `getFreshRouteCacheEntry`, which filters by
// provider source.

import { FLIGHT_ROUTE_LOOKUP_CONFIG } from "../../../config/aviation";
import type { FlightRoute, RouteCacheEntry } from "./flightRouteLookupModel";

const STORAGE_KEY = "adsbao:flight-routes:v1";

// Hard cap on persisted entries. Each route writes under a handful of
// key variants, so 600 keys ≈ 150-200 distinct flights — plenty for a
// map session while staying far from the localStorage quota.
const MAX_PERSISTED_ENTRIES = 600;

const PERSIST_DEBOUNCE_MS = 1_000;

const isBrowser = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

function entryMaxAgeMs(entry: RouteCacheEntry) {
  return entry.route
    ? FLIGHT_ROUTE_LOOKUP_CONFIG.hitCacheMs
    : FLIGHT_ROUTE_LOOKUP_CONFIG.missCacheMs;
}

function isValidEntry(entry: unknown, now: number): entry is RouteCacheEntry {
  if (!entry || typeof entry !== "object") return false;
  const { route, time } = entry as RouteCacheEntry;
  if (typeof time !== "number" || !Number.isFinite(time) || time > now) {
    return false;
  }
  if (route !== null && (typeof route !== "object" || Array.isArray(route))) {
    return false;
  }
  return now - time <= entryMaxAgeMs({ route: route as FlightRoute | null, time });
}

export function readPersistedRouteCache({ now = Date.now() } = {}) {
  const cache = new Map<string, RouteCacheEntry>();
  if (!isBrowser()) return cache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return cache;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return cache;
    for (const item of parsed) {
      if (!Array.isArray(item) || typeof item[0] !== "string") continue;
      const [key, entry] = item;
      if (isValidEntry(entry, now)) {
        cache.set(key, { route: entry.route, time: entry.time });
      }
    }
  } catch {
    // Corrupt or inaccessible storage — start cold.
  }
  return cache;
}

export function persistRouteCache(
  cache: Map<string, RouteCacheEntry>,
  { now = Date.now() } = {},
) {
  if (!isBrowser()) return;
  // Persist resolved routes only. Negative entries stay in-memory for
  // the session (that is what rate-limits re-lookups), but persisting
  // them would let a transiently failing or misconfigured upstream
  // poison every page load for the full miss TTL.
  let entries = [...cache].filter(
    ([, entry]) => isValidEntry(entry, now) && entry.route,
  );
  if (entries.length > MAX_PERSISTED_ENTRIES) {
    entries = entries
      .sort((a, b) => b[1].time - a[1].time)
      .slice(0, MAX_PERSISTED_ENTRIES);
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Quota or serialization issue — best-effort, drop silently.
  }
}

// Debounced write-through used by the scheduler singleton: route results
// land in bursts as realtime events resolve, so collapse them into one
// localStorage write per second.
export function createRouteCachePersister() {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (cache: Map<string, RouteCacheEntry>) => {
    if (!isBrowser()) return;
    if (timer != null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      persistRouteCache(cache);
    }, PERSIST_DEBOUNCE_MS);
  };
}
