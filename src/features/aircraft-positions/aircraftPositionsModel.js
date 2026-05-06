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
    positionTime: parseAdsbPositionTime(aircraft, responseNow, receiveTime),
    receiveTime,
  };
}

export function mergeAircraftSnapshots({
  wideJson,
  closeJson,
  receiveTime = Date.now(),
}) {
  const seen = new Map();
  const addSnapshots = (list, responseNow) => {
    for (const aircraft of list || []) {
      if (aircraft.lat == null || aircraft.lon == null) continue;
      const key = aircraft.hex || "";
      if (!key) continue;
      seen.set(
        key,
        normalizeAdsbAircraft(aircraft, { responseNow, receiveTime }),
      );
    }
  };

  addSnapshots(closeJson?.ac, closeJson?.now);
  addSnapshots(wideJson?.ac, wideJson?.now);
  return [...seen.values()];
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
