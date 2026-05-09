import { parseAdsbPositionTime } from "../../utils/aircraftMotion.js";

export function normalizeAdsbAircraft(
  aircraft,
  { responseNow, receiveTime = Date.now() } = {},
) {
  return {
    icao24: aircraft.hex || "",
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
  };
}

export function normalizeAircraftSnapshot({ json, receiveTime = Date.now() }) {
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

export function isHttp4xxOr5xx(error) {
  const status = Number(error?.status ?? error?.statusCode);
  if (status >= 400 && status < 600) return true;
  const match = String(error?.message || "").match(/\bHTTP\s+(\d{3})\b/i);
  if (!match) return false;
  const parsed = Number(match[1]);
  return parsed >= 400 && parsed < 600;
}

export function describeAircraftFetchError(error) {
  const isTimeout =
    error.name === "TimeoutError" ||
    /timed out|signal timed out/i.test(error.message);
  return isTimeout ? "timeout" : error.message || "unknown";
}
