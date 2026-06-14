type RealtimeChannelRequest = {
  channel: string;
  params: {
    lat?: number;
    lon?: number;
    distNm?: number;
    routeProvider?: string;
  };
};

const MAX_AIRCRAFT_RANGE_NM = 250;
const DEFAULT_AIRPORT_RANGE_NM = 40;
const CENTER_GRID_DEGREES = 0.1;

function toFiniteNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeRangeNm(value: unknown, fallback = DEFAULT_AIRPORT_RANGE_NM) {
  const number = toFiniteNumber(value);
  const next = number == null ? fallback : number;
  return Math.max(1, Math.min(MAX_AIRCRAFT_RANGE_NM, Math.round(next)));
}

function isLatitude(value: number | null): value is number {
  return value != null && value >= -90 && value <= 90;
}

function isLongitude(value: number | null): value is number {
  return value != null && value >= -180 && value <= 180;
}

function roundToGrid(value: number, grid = CENTER_GRID_DEGREES) {
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

export function buildCenterTrafficChannel({
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
  if (!isLatitude(normalizedLat) || !isLongitude(normalizedLon)) return null;
  const roundedLat = roundToGrid(normalizedLat);
  const roundedLon = roundToGrid(normalizedLon);
  const normalizedDist = normalizeRangeNm(distNm);
  return {
    channel: `traffic:center:${formatNumber(roundedLat)}:${formatNumber(roundedLon)}:${normalizedDist}`,
    params: {},
  };
}

export function buildAircraftTrafficChannel({
  lat,
  lon,
  distNm,
}: {
  lat: unknown;
  lon: unknown;
  distNm?: unknown;
}): RealtimeChannelRequest | null {
  return buildCenterTrafficChannel({ lat, lon, distNm });
}

export function buildCallsignChannel(callsign: unknown) {
  const normalized = normalizeCallsign(callsign);
  return normalized ? `callsign:${normalized}` : "";
}

function normalizeRouteContext(routeContext: Record<string, unknown> = {}) {
  const airportIcao = normalizeAirportCode(routeContext.icao);
  if (airportIcao) return `airport:${airportIcao}`;

  const lat = toFiniteNumber(routeContext.lat);
  const lon = toFiniteNumber(routeContext.lon);
  if (!isLatitude(lat) || !isLongitude(lon)) return "";
  return `center:${formatNumber(roundToGrid(lat))}:${formatNumber(roundToGrid(lon))}`;
}

function normalizeRouteProvider(value: unknown) {
  const provider = String(value || "").trim().toLowerCase();
  return provider === "flightaware" || provider === "adsbdb" ? provider : "";
}

function normalizeTrafficChannel(value: string) {
  const [anchor, ...parts] = value.split(":");
  if (anchor === "center") {
    if (parts.length !== 3) return "";
    const [lat, lon, distNm] = parts;
    return buildCenterTrafficChannel({ lat, lon, distNm })?.channel || "";
  }
  return "";
}

function normalizeRouteChannel(value: string) {
  const [rawCallsign, anchor, ...parts] = value.split(":");
  const normalized = normalizeCallsign(rawCallsign);
  if (!normalized || !/^[A-Z][A-Z0-9]{2,7}$/.test(normalized)) return "";
  if (anchor === "airport") {
    if (parts.length !== 1) return "";
    const context = normalizeRouteContext({ icao: parts[0] });
    return context ? `route:${normalized}:${context}` : "";
  }
  if (anchor === "center") {
    if (parts.length !== 2) return "";
    const context = normalizeRouteContext({ lat: parts[0], lon: parts[1] });
    return context ? `route:${normalized}:${context}` : "";
  }
  return parts.length === 0 && !anchor ? `route:${normalized}` : "";
}

export function buildRouteChannel(
  callsign: unknown,
  routeContext: Record<string, unknown> = {},
): RealtimeChannelRequest | null {
  const normalized = normalizeCallsign(callsign);
  if (!normalized || !/^[A-Z][A-Z0-9]{2,7}$/.test(normalized)) return null;
  const context = normalizeRouteContext(routeContext);
  const routeProvider = normalizeRouteProvider(routeContext.routeProvider);
  return {
    channel: `route:${normalized}${context ? `:${context}` : ""}`,
    params: routeProvider ? { routeProvider } : {},
  };
}

export function normalizeRealtimeChannel(channel: unknown) {
  const raw = String(channel || "").trim();
  const separatorIndex = raw.indexOf(":");
  if (separatorIndex <= 0) return "";
  const type = raw.slice(0, separatorIndex).toLowerCase();
  const value = raw.slice(separatorIndex + 1);
  if (type === "aircraft") {
    const hex = normalizeAircraftHex(value);
    return hex ? `aircraft:${hex}` : "";
  }
  if (type === "callsign") {
    const callsign = normalizeCallsign(value);
    return callsign ? `callsign:${callsign}` : "";
  }
  if (type === "route") {
    return normalizeRouteChannel(value);
  }
  if (type === "traffic") {
    return normalizeTrafficChannel(value);
  }
  return "";
}
