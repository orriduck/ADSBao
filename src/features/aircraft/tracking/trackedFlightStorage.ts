// Browser-local cache that remembers when the user first started
// tracking a given callsign. Each entry survives for TRACKING_TTL_MS
// (24 hours) so reloading the /aircraft/[callsign] page keeps the same
// "first tracked at" anchor — used by the trace pipeline to clip the
// full historical trace to a sensible lookback window
// (firstTrackedAt - TRACE_LOOKBACK_MS).

const STORAGE_KEY = "adsbao:tracked-flights";

const TRACKING_TTL_MS = 24 * 60 * 60 * 1000;
const TRACE_LOOKBACK_MS = 30 * 60 * 1000;

const isBrowser = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

type TrackedFlightEntry = {
  firstTrackedAt: number;
  hex: string | null;
};

type TrackedFlightStore = Record<string, TrackedFlightEntry>;

type TrackedFlightClockOptions = {
  now?: number;
};

type TrackedFlightOptions = TrackedFlightClockOptions & {
  hex?: string | null;
};

function readStore(): TrackedFlightStore {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as TrackedFlightStore : {};
  } catch {
    return {};
  }
}

function writeStore(store: TrackedFlightStore) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Quota or serialization issue — best-effort, drop silently.
  }
}

function pruneStore(store: TrackedFlightStore, { now = Date.now() }: TrackedFlightClockOptions = {}) {
  const out: TrackedFlightStore = {};
  for (const [key, entry] of Object.entries(store || {})) {
    if (
      entry &&
      typeof entry.firstTrackedAt === "number" &&
      now - entry.firstTrackedAt < TRACKING_TTL_MS
    ) {
      out[key] = entry;
    }
  }
  return out;
}

function normalizeCallsign(callsign: unknown) {
  return String(callsign || "").trim().toUpperCase();
}

// Returns the existing session for this callsign if one is still within
// the TTL, otherwise creates and persists a fresh one anchored at `now`.
// `hex` is recorded the first time it becomes available so the cache
// captures the icao24 of the aircraft we anchored on (helpful for
// debugging / future cache invalidation).
export function getOrCreateTrackedFlight(callsign: unknown, options: TrackedFlightOptions = {}) {
  const normalized = normalizeCallsign(callsign);
  if (!normalized || !isBrowser()) return null;

  const { hex = null, now = Date.now() } = options;
  const store = pruneStore(readStore(), { now });
  const existing = store[normalized];

  if (existing && typeof existing.firstTrackedAt === "number") {
    if (hex && !existing.hex) {
      existing.hex = hex;
      store[normalized] = existing;
      writeStore(store);
    }
    return existing;
  }

  const entry = { firstTrackedAt: now, hex: hex || null };
  store[normalized] = entry;
  writeStore(store);
  return entry;
}

// Convenience: given a session, return the trace cutoff timestamp
// (firstTrackedAt - 30 minutes) the trace pipeline should clip against.
export function getTraceCutoffMs(session: TrackedFlightEntry | null | undefined) {
  if (!session || typeof session.firstTrackedAt !== "number") return null;
  return session.firstTrackedAt - TRACE_LOOKBACK_MS;
}
