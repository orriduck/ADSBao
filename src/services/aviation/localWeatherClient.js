import {
  AVIATION_PROXY_BASES,
  AVIATION_REQUEST_TIMEOUT_MS,
} from "../../config/aviation.js";
import { withAuditLogging } from "../../utils/apiLogger.js";
import { normalizeLatitude, normalizeLongitude } from "../apiProxySecurity.js";
import { fetchJson } from "./httpClient.js";

const env = typeof process !== "undefined" ? process.env : {};

export const createLocalWeatherClient = ({
  fetchImpl = globalThis.fetch?.bind(globalThis),
  baseUrl =
    env.NEXT_PUBLIC_LOCAL_WEATHER_BASE || AVIATION_PROXY_BASES.localWeather,
} = {}) => {
  if (!fetchImpl) throw new Error("Local weather client requires fetch support");

  const auditedFetch = withAuditLogging(fetchImpl, {
    service: "Open-Meteo/CurrentWeather",
    getParams(url) {
      const p = url.split("/");
      return {
        lat: p[p.length - 2],
        lon: p[p.length - 1],
      };
    },
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
