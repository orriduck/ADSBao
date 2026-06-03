import { parseAdsbPositionTime } from "../../../utils/aircraftMotion";
import { resolveFlightPositionSource } from "../../aviation/sourceDisplayModel";

type AircraftPositionQuality = {
  sourceUpdatedAt?: unknown;
  [key: string]: unknown;
};

type RawAdsbAircraft = {
  hex?: string;
  r?: string;
  flight?: string;
  lat?: unknown;
  lon?: unknown;
  alt_baro?: unknown;
  alt_geom?: unknown;
  baro_rate?: unknown;
  geom_rate?: unknown;
  nav_altitude_mcp?: unknown;
  gnd?: boolean;
  gs?: unknown;
  track?: unknown;
  t?: string;
  desc?: string;
  category?: string;
  positionTime?: unknown;
  positionQuality?: AircraftPositionQuality | null;
  flightAwareUrl?: string;
  origin?: string;
  destination?: string;
  route?: string;
  [key: string]: unknown;
};

type NormalizedAircraftPosition = {
  icao24: string;
  registration: string;
  callsign: string;
  lat: unknown;
  lon: unknown;
  altitude: unknown;
  baroRate: unknown;
  geomRate: unknown;
  navAltitudeMcp: unknown;
  onGround: boolean;
  velocity: unknown;
  track: unknown;
  type: string;
  desc: string;
  category: string;
  positionTime: unknown;
  receiveTime: number;
  positionQuality: AircraftPositionQuality | null;
  flight_position_source: string;
  flightAwareUrl: string;
  origin: string;
  destination: string;
  route: string;
};

type AircraftSnapshotPayload = {
  ac?: RawAdsbAircraft[];
  now?: unknown;
};

type NormalizeAircraftOptions = {
  responseNow?: unknown;
  receiveTime?: number;
};

type NormalizeSnapshotOptions = {
  json?: AircraftSnapshotPayload | null;
  receiveTime?: number;
};

type AircraftFetchError = {
  status?: unknown;
  statusCode?: unknown;
  name?: unknown;
  message?: unknown;
};

type PositionTimestampCandidate = {
  positionTime?: unknown;
  receiveTime?: unknown;
  positionQuality?: AircraftPositionQuality | null;
  [key: string]: unknown;
};

function parseTimestampMs(value: unknown) {
  if (value == null || value === "") return null;
  const number = Number(value);
  if (Number.isFinite(number)) {
    return number < 10_000_000_000 ? Math.round(number * 1000) : Math.round(number);
  }
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function resolvePositionTimestampMs(aircraft: PositionTimestampCandidate | null | undefined) {
  const sourceUpdatedAt = parseTimestampMs(
    aircraft?.positionQuality?.sourceUpdatedAt,
  );
  if (sourceUpdatedAt != null) return sourceUpdatedAt;
  return parseTimestampMs(aircraft?.positionTime);
}

export function normalizeAdsbAircraft(
  aircraft: RawAdsbAircraft,
  { responseNow, receiveTime = Date.now() }: NormalizeAircraftOptions = {},
): NormalizedAircraftPosition {
  const positionQuality = aircraft.positionQuality || null;
  return {
    icao24: aircraft.hex || "",
    registration: typeof aircraft.r === "string" ? aircraft.r.trim().toUpperCase() : "",
    callsign: (aircraft.flight || aircraft.r || "").trim(),
    lat: aircraft.lat,
    lon: aircraft.lon,
    altitude: aircraft.alt_baro ?? aircraft.alt_geom ?? null,
    baroRate: aircraft.baro_rate ?? null,
    geomRate: aircraft.geom_rate ?? null,
    navAltitudeMcp: aircraft.nav_altitude_mcp ?? null,
    onGround: aircraft.gnd ?? false,
    velocity: aircraft.gs ?? null,
    track: aircraft.track ?? 0,
    type: typeof aircraft.t === "string" ? aircraft.t.trim().toUpperCase() : "",
    desc: typeof aircraft.desc === "string" ? aircraft.desc.trim() : "",
    category:
      typeof aircraft.category === "string"
        ? aircraft.category.trim().toUpperCase()
        : "",
    positionTime: parseAdsbPositionTime(aircraft, responseNow, receiveTime),
    receiveTime,
    positionQuality,
    flight_position_source: resolveFlightPositionSource({
      source: aircraft.source || positionQuality?.source || "adsb.lol",
      kind: positionQuality?.kind,
      isEstimated: positionQuality?.isEstimated,
      flight_position_source:
        aircraft.flight_position_source || positionQuality?.flight_position_source,
    }),
    flightAwareUrl: aircraft.flightAwareUrl || "",
    origin: aircraft.origin || "",
    destination: aircraft.destination || "",
    route: aircraft.route || "",
  };
}

export function normalizeAircraftSnapshot({
  json,
  receiveTime = Date.now(),
}: NormalizeSnapshotOptions) {
  return (json?.ac || [])
    .filter((aircraft) => aircraft.lat != null && aircraft.lon != null)
    .filter((aircraft) => aircraft.hex)
    .map((aircraft) =>
      normalizeAdsbAircraft(aircraft, {
        responseNow: json?.now,
        receiveTime,
      }),
    );
}

export function resolveLastSuccessfulPositionDate(
  aircraft: PositionTimestampCandidate | PositionTimestampCandidate[],
) {
  const entries = Array.isArray(aircraft) ? aircraft : [aircraft];
  const latest = entries.reduce((max, item) => {
    const timestamp = resolvePositionTimestampMs(item);
    return timestamp != null && timestamp > max ? timestamp : max;
  }, 0);

  return latest > 0 ? new Date(latest) : null;
}

export function isHttp4xxOr5xx(error: AircraftFetchError) {
  const status = Number(error?.status ?? error?.statusCode);
  if (status >= 400 && status < 600) return true;
  const match = String(error?.message || "").match(/\bHTTP\s+(\d{3})\b/i);
  if (!match) return false;
  const parsed = Number(match[1]);
  return parsed >= 400 && parsed < 600;
}

export function describeAircraftFetchError(error: AircraftFetchError) {
  const isTimeout =
    error?.name === "TimeoutError" ||
    /timed out|signal timed out/i.test(String(error?.message || ""));
  return isTimeout ? "timeout" : String(error?.message || "unknown");
}
