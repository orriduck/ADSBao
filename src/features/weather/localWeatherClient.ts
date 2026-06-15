import {
  AVIATION_PROXY_BASES,
  AVIATION_REQUEST_TIMEOUT_MS,
} from "../../config/aviation";
import { withAuditLogging } from "../../utils/apiLogger";
import { normalizeLatitude, normalizeLongitude } from "@/server/http/apiProxySecurity";
import { fetchJson } from "../aviation/httpClient";

const env: Record<string, string | undefined> = typeof process !== "undefined" ? process.env : {};

export const createLocalWeatherClient = ({
  fetchImpl = globalThis.fetch?.bind(globalThis),
  baseUrl =
    env.VITE_LOCAL_WEATHER_BASE || AVIATION_PROXY_BASES.localWeather,
}: Record<string, any> = {}) => {
  if (!fetchImpl) throw new Error("Local weather client requires fetch support");

  const auditedFetch = withAuditLogging(fetchImpl, {
    service: "Open-Meteo/CurrentWeather",
  });

  return {
    fetchCurrentWeather({ lat, lon }: Record<string, any>) {
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
