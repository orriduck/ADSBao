// Browser-local cache that remembers when the user first started
// tracking a given callsign. Each entry survives for TRACKING_TTL_MS
// (24 hours) so reloading the /aircraft/[callsign] page keeps the same
// "first tracked at" anchor — used by the trace pipeline to clip the
// full historical trace to a sensible lookback window
// (firstTrackedAt - TRACE_LOOKBACK_MS).

const STORAGE_KEY = "adsbao:tracked-flights";

export const TRACKING_TTL_MS = 24 * 60 * 60 * 1000;
export const TRACE_LOOKBACK_MS = 30 * 60 * 1000;

const isBrowser = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

type TrackedFlightRecord = Record<string, any>;

function readStore(): TrackedFlightRecord {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStore(store: TrackedFlightRecord) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Quota or serialization issue — best-effort, drop silently.
  }
}

function pruneStore(store: TrackedFlightRecord, { now = Date.now() }: TrackedFlightRecord = {}) {
  const out: TrackedFlightRecord = {};
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
export function getOrCreateTrackedFlight(callsign: unknown, options: TrackedFlightRecord = {}) {
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

export function getTrackedFlight(callsign: unknown, { now = Date.now() }: TrackedFlightRecord = {}) {
  const normalized = normalizeCallsign(callsign);
  if (!normalized || !isBrowser()) return null;
  const store = pruneStore(readStore(), { now });
  return store[normalized] || null;
}

export function clearTrackedFlight(callsign: unknown) {
  const normalized = normalizeCallsign(callsign);
  if (!normalized || !isBrowser()) return;
  const store = readStore();
  if (!store[normalized]) return;
  delete store[normalized];
  writeStore(store);
}

// Convenience: given a session, return the trace cutoff timestamp
// (firstTrackedAt - 30 minutes) the trace pipeline should clip against.
export function getTraceCutoffMs(session: TrackedFlightRecord | null | undefined) {
  if (!session || typeof session.firstTrackedAt !== "number") return null;
  return session.firstTrackedAt - TRACE_LOOKBACK_MS;
}
