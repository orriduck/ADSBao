const STORAGE_KEY = "adsbao:tracked-flight-metadata";

export const TRACKED_FLIGHT_METADATA_TTL_MS = 6 * 60 * 60 * 1000;

const isBrowser = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

type TrackedFlightMetadataRecord = Record<string, any>;
type TrackedFlightMetadataStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function normalizeCallsign(callsign: unknown) {
  return String(callsign || "").trim().toUpperCase();
}

function clean(value: unknown) {
  return String(value || "").trim().toUpperCase();
}

function getLocalStorage(): TrackedFlightMetadataStorage | null {
  return isBrowser() ? window.localStorage : null;
}

function readStore(): TrackedFlightMetadataRecord {
  if (!isBrowser()) return {};
  try {
    const raw = getLocalStorage()?.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStore(store: TrackedFlightMetadataRecord) {
  if (!isBrowser()) return;
  try {
    getLocalStorage()?.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Metadata is an opportunistic UI cache; quota failures can be ignored.
  }
}

function pruneStore(
  store: TrackedFlightMetadataRecord,
  { now = Date.now(), ttlMs = TRACKED_FLIGHT_METADATA_TTL_MS }: TrackedFlightMetadataRecord = {},
) {
  const out: TrackedFlightMetadataRecord = {};
  const ttl = Math.max(1, Number(ttlMs) || TRACKED_FLIGHT_METADATA_TTL_MS);
  for (const [key, entry] of Object.entries(store || {})) {
    if (
      entry &&
      typeof entry.updatedAt === "number" &&
      now - entry.updatedAt < ttl
    ) {
      out[key] = entry;
    }
  }
  return out;
}

function sanitizeFlightRoute(route: unknown) {
  if (!route || typeof route !== "object" || Array.isArray(route)) return null;
  return route;
}

function extractMetadata(aircraft: TrackedFlightMetadataRecord = {}) {
  const metadata = {
    type: clean(aircraft.type),
    category: clean(aircraft.category),
    origin: clean(aircraft.origin),
    destination: clean(aircraft.destination),
    route: clean(aircraft.route),
    flightRoute: sanitizeFlightRoute(aircraft.flightRoute),
  };
  const hasAny = Object.values(metadata).some(Boolean);
  return hasAny ? metadata : null;
}

export function writeTrackedFlightMetadata(
  callsign: unknown,
  {
    aircraft = null,
    now = Date.now(),
    ttlMs = TRACKED_FLIGHT_METADATA_TTL_MS,
  }: TrackedFlightMetadataRecord = {},
) {
  const normalized = normalizeCallsign(callsign || aircraft?.callsign);
  const metadata = extractMetadata(aircraft);
  if (!normalized || !metadata || !isBrowser()) return null;

  const store = pruneStore(readStore(), { now, ttlMs });
  const prior = store[normalized] || {};
  const next = {
    ...prior,
    ...Object.fromEntries(
      Object.entries(metadata).filter(([, value]) => Boolean(value)),
    ),
    updatedAt: now,
  };
  store[normalized] = next;
  writeStore(store);
  return next;
}

export function readTrackedFlightMetadata(
  callsign: unknown,
  {
    now = Date.now(),
    ttlMs = TRACKED_FLIGHT_METADATA_TTL_MS,
  }: TrackedFlightMetadataRecord = {},
) {
  const normalized = normalizeCallsign(callsign);
  if (!normalized || !isBrowser()) return null;
  const store = pruneStore(readStore(), { now, ttlMs });
  const entry = store[normalized] || null;
  writeStore(store);
  return entry;
}

export function mergeTrackedFlightMetadata({
  aircraft = null,
  metadata = null,
}: TrackedFlightMetadataRecord = {}) {
  if (!aircraft || !metadata) return aircraft;
  return {
    ...aircraft,
    type: clean(aircraft.type) || metadata.type || "",
    category: clean(aircraft.category) || metadata.category || "",
    origin: clean(aircraft.origin) || metadata.origin || "",
    destination: clean(aircraft.destination) || metadata.destination || "",
    route: clean(aircraft.route) || metadata.route || "",
    flightRoute: aircraft.flightRoute || metadata.flightRoute || null,
  };
}
