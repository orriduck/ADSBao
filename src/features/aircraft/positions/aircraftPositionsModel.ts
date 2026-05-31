import { parseAdsbPositionTime } from "../../../utils/aircraftMotion";

type AircraftPositionsModelRecord = Record<string, any>;

function parseTimestampMs(value: unknown) {
  if (value == null || value === "") return null;
  const number = Number(value);
  if (Number.isFinite(number)) {
    return number < 10_000_000_000 ? Math.round(number * 1000) : Math.round(number);
  }
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function resolvePositionTimestampMs(aircraft: AircraftPositionsModelRecord | null | undefined) {
  const sourceUpdatedAt = parseTimestampMs(
    aircraft?.positionQuality?.sourceUpdatedAt,
  );
  if (sourceUpdatedAt != null) return sourceUpdatedAt;
  return parseTimestampMs(aircraft?.positionTime);
}

export function normalizeAdsbAircraft(
  aircraft: AircraftPositionsModelRecord,
  { responseNow, receiveTime = Date.now() }: AircraftPositionsModelRecord = {},
) {
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
    category:
      typeof aircraft.category === "string"
        ? aircraft.category.trim().toUpperCase()
        : "",
    positionTime: parseAdsbPositionTime(aircraft, responseNow, receiveTime),
    receiveTime,
    positionQuality: aircraft.positionQuality || null,
    flightAwareUrl: aircraft.flightAwareUrl || "",
    origin: aircraft.origin || "",
    destination: aircraft.destination || "",
    route: aircraft.route || "",
  };
}

export function normalizeAircraftSnapshot({
  json,
  receiveTime = Date.now(),
}: AircraftPositionsModelRecord) {
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

export function resolveLastSuccessfulPositionDate(aircraft: AircraftPositionsModelRecord | AircraftPositionsModelRecord[]) {
  const entries = Array.isArray(aircraft) ? aircraft : [aircraft];
  const latest = entries.reduce((max, item) => {
    const timestamp = resolvePositionTimestampMs(item);
    return timestamp != null && timestamp > max ? timestamp : max;
  }, 0);

  return latest > 0 ? new Date(latest) : null;
}

export function isHttp4xxOr5xx(error: any) {
  const status = Number(error?.status ?? error?.statusCode);
  if (status >= 400 && status < 600) return true;
  const match = String(error?.message || "").match(/\bHTTP\s+(\d{3})\b/i);
  if (!match) return false;
  const parsed = Number(match[1]);
  return parsed >= 400 && parsed < 600;
}

export function describeAircraftFetchError(error: any) {
  const isTimeout =
    error.name === "TimeoutError" ||
    /timed out|signal timed out/i.test(error.message);
  return isTimeout ? "timeout" : error.message || "unknown";
}
