import {
  AIRCRAFT_TRAFFIC_CONFIG,
  AVIATION_PROXY_BASES,
  AVIATION_REQUEST_TIMEOUT_MS,
} from "../../config/aviation.js";
import { withAuditLogging } from "../../utils/apiLogger.js";
import { fetchJson } from "./httpClient.js";

const env = typeof process !== "undefined" ? process.env : {};

export const createAircraftPositionClient = ({
  fetchImpl = globalThis.fetch?.bind(globalThis),
  baseUrl =
    env.NEXT_PUBLIC_AIRCRAFT_POSITIONS_BASE ||
    AVIATION_PROXY_BASES.aircraftPositions,
} = {}) => {
  if (!fetchImpl)
    throw new Error("Aircraft position client requires fetch support");

  const auditedFetch = withAuditLogging(fetchImpl, {
    service: "adsb.lol/Aircraft",
    getParams(url) {
      const p = url.split("/");
      return {
        lat: p[p.length - 3],
        lon: p[p.length - 2],
        distNm: p[p.length - 1],
      };
    },
  });

  return {
    fetchNearbyAircraft({
      lat,
      lon,
      distNm = AIRCRAFT_TRAFFIC_CONFIG.rangeNm,
    }) {
      const encodedLat = encodeURIComponent(String(lat));
      const encodedLon = encodeURIComponent(String(lon));
      const encodedDist = encodeURIComponent(String(distNm));
      return fetchJson(
        auditedFetch,
        `${baseUrl}/${encodedLat}/${encodedLon}/${encodedDist}`,
        {
          timeoutMs: AVIATION_REQUEST_TIMEOUT_MS.aircraftPositions,
        },
      );
    },
  };
};
