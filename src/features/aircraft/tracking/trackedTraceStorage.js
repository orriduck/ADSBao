// Browser-local cache that persists the merged trace points for each
// callsign the user is actively tracking. Pairs with
// `trackedFlightStorage` — that module remembers WHEN tracking started
// (the firstTrackedAt anchor); this one remembers WHAT trace points
// have been seen so a refresh doesn't drop the accumulated trail.
//
// The persisted set is the union of trace_full + trace_recent + live
// polls already clipped to the lookback cutoff. On reload the hook
// seeds this as a low-priority source so the trace is visible
// instantly; the fresh full/recent fetches then overlay corrections,
// and live polls overlay the leading edge.

const STORAGE_KEY = "adsbao:tracked-trace";

// Keep aligned with TRACKING_TTL_MS — once the tracking session expires
// the trace cache for that callsign is meaningless.
export const TRACE_STORAGE_TTL_MS = 24 * 60 * 60 * 1000;

// Soft cap to keep the localStorage payload reasonable. At the standard
// 3s poll cadence this is ~50 minutes of live ticks; the cutoff window
// is 30 minutes + the session, so this leaves headroom for long
// sessions without thrashing the 5MB quota. When we hit the cap we
// drop the oldest points (FIFO) — the trace pipeline cares about the
// leading edge, not the tail.
const MAX_POINTS_PER_FLIGHT = 2000;

const isBrowser = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

function normalizeCallsign(callsign) {
  return String(callsign || "").trim().toUpperCase();
}

function readStore() {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStore(store) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Quota or serialization issue — best-effort, drop silently.
  }
}

function pruneStore(store, { now = Date.now() } = {}) {
  const out = {};
  for (const [key, entry] of Object.entries(store || {})) {
    if (
      entry &&
      typeof entry.updatedAt === "number" &&
      now - entry.updatedAt < TRACE_STORAGE_TTL_MS
    ) {
      out[key] = entry;
    }
  }
  return out;
}

function sanitizePoints(points) {
  if (!Array.isArray(points)) return [];
  const out = [];
  for (const point of points) {
    const lat = Number(point?.lat);
    const lon = Number(point?.lon);
    const timestampMs = Number(point?.timestampMs);
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      !Number.isFinite(timestampMs)
    )
      continue;
    out.push({
      timestampMs,
      lat,
      lon,
      altitude: Number.isFinite(Number(point?.altitude))
        ? Number(point.altitude)
        : null,
      onGround: Boolean(point?.onGround),
      velocity: Number.isFinite(Number(point?.velocity))
        ? Number(point.velocity)
        : null,
      track: Number.isFinite(Number(point?.track)) ? Number(point.track) : null,
      baroRate: Number.isFinite(Number(point?.baroRate))
        ? Number(point.baroRate)
        : null,
    });
  }
  return out;
}

export function readTrackedTrace(callsign, { now = Date.now() } = {}) {
  const normalized = normalizeCallsign(callsign);
  if (!normalized || !isBrowser()) return [];
  const store = pruneStore(readStore(), { now });
  const entry = store[normalized];
  return Array.isArray(entry?.points) ? sanitizePoints(entry.points) : [];
}

export function writeTrackedTrace(callsign, points, { now = Date.now() } = {}) {
  const normalized = normalizeCallsign(callsign);
  if (!normalized || !isBrowser()) return;
  const sanitized = sanitizePoints(points);
  if (sanitized.length === 0) return;
  const trimmed =
    sanitized.length > MAX_POINTS_PER_FLIGHT
      ? sanitized.slice(sanitized.length - MAX_POINTS_PER_FLIGHT)
      : sanitized;
  const store = pruneStore(readStore(), { now });
  store[normalized] = { points: trimmed, updatedAt: now };
  writeStore(store);
}

export function clearTrackedTrace(callsign) {
  const normalized = normalizeCallsign(callsign);
  if (!normalized || !isBrowser()) return;
  const store = readStore();
  if (!store[normalized]) return;
  delete store[normalized];
  writeStore(store);
}
