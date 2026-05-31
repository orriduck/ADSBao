import {
  AVIATION_PROXY_BASES,
  AVIATION_REQUEST_TIMEOUT_MS,
} from "../../config/aviation";
import { withAuditLogging } from "../../utils/apiLogger";
import { normalizeLatitude, normalizeLongitude } from "../../app/api/_shared/apiProxySecurity";
import { fetchJson } from "../aviation/httpClient";

const env = typeof process !== "undefined" ? process.env : {};

export const createLocalWeatherClient = ({
  fetchImpl = globalThis.fetch?.bind(globalThis),
  baseUrl =
    env.NEXT_PUBLIC_LOCAL_WEATHER_BASE || AVIATION_PROXY_BASES.localWeather,
} = {}) => {
  if (!fetchImpl) throw new Error("Local weather client requires fetch support");

  const auditedFetch = withAuditLogging(fetchImpl, {
    service: "Open-Meteo/CurrentWeather",
  });

  return {
    fetchCurrentWeather({ lat, lon }) {
      const numericLat = normalizeLatitude(lat);
      const numericLon = normalizeLongitude(lon);
      if (numericLat == null || numericLon == null) {
        return null;
      }
      return fetchJson(
        auditedFetch,
        `${baseUrl}/${encodeURIComponent(String(numericLat))}/${encodeURIComponent(
          String(numericLon),
        )}`,
        {
          timeoutMs: AVIATION_REQUEST_TIMEOUT_MS.localWeather,
        },
      );
    },
  };
};
