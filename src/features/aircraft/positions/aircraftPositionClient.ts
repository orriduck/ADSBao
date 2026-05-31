import {
  AIRCRAFT_TRAFFIC_CONFIG,
  AVIATION_PROXY_BASES,
  AVIATION_REQUEST_TIMEOUT_MS,
} from "../../../config/aviation";
import { withAuditLogging } from "../../../utils/apiLogger";
import {
  normalizeDistanceNm,
  normalizeLatitude,
  normalizeLongitude,
} from "../../../app/api/_shared/apiProxySecurity";
import { fetchJson } from "../../aviation/httpClient";

const env: Record<string, string | undefined> = typeof process !== "undefined" ? process.env : {};

export const createAircraftPositionClient = ({
  fetchImpl = globalThis.fetch?.bind(globalThis),
  baseUrl =
    env.NEXT_PUBLIC_AIRCRAFT_POSITIONS_BASE ||
    AVIATION_PROXY_BASES.aircraftPositions,
}: Record<string, any> = {}) => {
  if (!fetchImpl)
    throw new Error("Aircraft position client requires fetch support");

  const auditedFetch = withAuditLogging(fetchImpl, {
    service: "adsb.lol/Aircraft",
  });

  return {
    fetchNearbyAircraft({
      lat,
      lon,
      distNm = AIRCRAFT_TRAFFIC_CONFIG.rangeNm,
    }: Record<string, any>) {
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
