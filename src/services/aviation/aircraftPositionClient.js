import {
  AIRCRAFT_TRAFFIC_CONFIG,
  AVIATION_PROXY_BASES,
  AVIATION_REQUEST_TIMEOUT_MS,
} from "../../config/aviation.js";
import { withAuditLogging } from "../../utils/apiLogger.js";
import {
  normalizeDistanceNm,
  normalizeLatitude,
  normalizeLongitude,
} from "../apiProxySecurity.js";
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
      const normalizedLat = normalizeLatitude(lat);
      const normalizedLon = normalizeLongitude(lon);
      const normalizedDist = normalizeDistanceNm(distNm, { min: 1, max: 250 });
      if (
        normalizedLat == null ||
        normalizedLon == null ||
        normalizedDist == null
      ) {
        throw new Error("Invalid aircraft position query");
      }

      const encodedLat = encodeURIComponent(String(normalizedLat));
      const encodedLon = encodeURIComponent(String(normalizedLon));
      const encodedDist = encodeURIComponent(String(normalizedDist));
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
