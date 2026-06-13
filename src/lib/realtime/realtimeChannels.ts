type RealtimeChannelRequest = {
  channel: string;
  params: {
    lat?: number;
    lon?: number;
    distNm?: number;
  };
};

const MAX_AIRCRAFT_RANGE_NM = 250;
const DEFAULT_AIRPORT_RANGE_NM = 40;
const VIEWPORT_GRID_DEGREES = 0.1;

function toFiniteNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeRangeNm(value: unknown, fallback = DEFAULT_AIRPORT_RANGE_NM) {
  const number = toFiniteNumber(value);
  const next = number == null ? fallback : number;
  return Math.max(1, Math.min(MAX_AIRCRAFT_RANGE_NM, Math.round(next)));
}

function roundToGrid(value: number, grid = VIEWPORT_GRID_DEGREES) {
  return Number((Math.round(value / grid) * grid).toFixed(4));
}

function formatNumber(value: number) {
  return String(Number(value.toFixed(4)));
}

function normalizeAirportCode(value: unknown) {
  const code = String(value || "").trim().toUpperCase();
  return /^[A-Z][A-Z0-9]{3}$/.test(code) ? code : "";
}

function normalizeAircraftHex(value: unknown) {
  const hex = String(value || "").trim().toUpperCase();
  return /^[A-F0-9]{6}$/.test(hex) ? hex : "";
}

function normalizeCallsign(value: unknown) {
  const callsign = String(value || "").trim().toUpperCase().replace(/\s+/g, "");
  return /^[A-Z0-9]{2,12}$/.test(callsign) ? callsign : "";
}

export function buildAirportAircraftChannel(
  icao: unknown,
  lat: unknown,
  lon: unknown,
  distNm: unknown = DEFAULT_AIRPORT_RANGE_NM,
): RealtimeChannelRequest | null {
  const code = normalizeAirportCode(icao);
  const normalizedLat = toFiniteNumber(lat);
  const normalizedLon = toFiniteNumber(lon);
  if (!code || normalizedLat == null || normalizedLon == null) return null;
  return {
    channel: `airport:${code}`,
    params: {
      lat: normalizedLat,
      lon: normalizedLon,
      distNm: normalizeRangeNm(distNm),
    },
  };
}

export function buildViewportAircraftChannel({
  lat,
  lon,
  distNm = DEFAULT_AIRPORT_RANGE_NM,
}: {
  lat: unknown;
  lon: unknown;
  distNm?: unknown;
}): RealtimeChannelRequest | null {
  const normalizedLat = toFiniteNumber(lat);
  const normalizedLon = toFiniteNumber(lon);
  if (normalizedLat == null || normalizedLon == null) return null;
  const roundedLat = roundToGrid(normalizedLat);
  const roundedLon = roundToGrid(normalizedLon);
  const normalizedDist = normalizeRangeNm(distNm);
  return {
    channel: `viewport:${formatNumber(roundedLat)}:${formatNumber(roundedLon)}:${normalizedDist}`,
    params: {
      lat: roundedLat,
      lon: roundedLon,
      distNm: normalizedDist,
    },
  };
}

export function buildAircraftHexChannel(hex: unknown) {
  const normalized = normalizeAircraftHex(hex);
  return normalized ? `aircraft:${normalized}` : "";
}

export function buildCallsignChannel(callsign: unknown) {
  const normalized = normalizeCallsign(callsign);
  return normalized ? `callsign:${normalized}` : "";
}

export function buildRouteChannel(callsign: unknown): RealtimeChannelRequest | null {
  const normalized = normalizeCallsign(callsign);
  if (!normalized || !/^[A-Z][A-Z0-9]{2,7}$/.test(normalized)) return null;
  return { channel: `route:${normalized}`, params: {} };
}

export function normalizeRealtimeChannel(channel: unknown) {
  const raw = String(channel || "").trim();
  const separatorIndex = raw.indexOf(":");
  if (separatorIndex <= 0) return "";
  const type = raw.slice(0, separatorIndex).toLowerCase();
  const value = raw.slice(separatorIndex + 1);
  if (type === "airport") {
    const code = normalizeAirportCode(value);
    return code ? `airport:${code}` : "";
  }
  if (type === "aircraft") {
    const hex = normalizeAircraftHex(value);
    return hex ? `aircraft:${hex}` : "";
  }
  if (type === "callsign") {
    const callsign = normalizeCallsign(value);
    return callsign ? `callsign:${callsign}` : "";
  }
  if (type === "route") {
    return buildRouteChannel(value)?.channel || "";
  }
  if (type === "viewport") {
    const [lat, lon, distNm] = value.split(":");
    return (
      buildViewportAircraftChannel({ lat, lon, distNm })?.channel || ""
    );
  }
  return "";
}
