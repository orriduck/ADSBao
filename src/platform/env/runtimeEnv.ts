export type AdsbaoRuntimeEnvKey =
  | "VITE_SITE_URL"
  | "VITE_NEW_RELIC_ACCOUNT_ID"
  | "VITE_NEW_RELIC_BROWSER_APP_ID"
  | "VITE_NEW_RELIC_BROWSER_LICENSE_KEY"
  | "VITE_AIRCRAFT_PHOTOS_BASE"
  | "VITE_AIRCRAFT_POSITIONS_BASE"
  | "VITE_AIRCRAFT_TRACE_BASE"
  | "VITE_LOCAL_WEATHER_BASE"
  | "VITE_METAR_PROXY_BASE"
  | "VITE_THREE_OSM_RASTER_SOURCE_ID"
  | "VITE_THREE_OSM_RASTER_URL_TEMPLATE"
  | "VITE_THREE_OSM_RASTER_ATTRIBUTION"
  | "VITE_THREE_OSM_RASTER_ATTRIBUTION_URL";

export type AdsbaoRuntimeEnv = Partial<Record<AdsbaoRuntimeEnvKey, string>>;

export const ADSBAO_OFFLINE_TILE_RUNTIME_ENV: AdsbaoRuntimeEnv = {
  VITE_THREE_OSM_RASTER_SOURCE_ID: "",
  VITE_THREE_OSM_RASTER_URL_TEMPLATE: "",
  VITE_THREE_OSM_RASTER_ATTRIBUTION: "",
  VITE_THREE_OSM_RASTER_ATTRIBUTION_URL: "",
};

declare global {
  interface Window {
    __ADSBAO_ENV__?: AdsbaoRuntimeEnv;
  }
}

export function runtimeEnvValue(key: AdsbaoRuntimeEnvKey, fallback = "") {
  if (typeof window === "undefined") return fallback;
  const value = window.__ADSBAO_ENV__?.[key];
  return typeof value === "string" ? value : fallback;
}

export function runtimeEnvHasKey(key: AdsbaoRuntimeEnvKey) {
  if (typeof window === "undefined") return false;
  const runtimeEnv = window.__ADSBAO_ENV__;
  if (!runtimeEnv) return false;
  return (
    Object.prototype.hasOwnProperty.call(runtimeEnv, key) &&
    typeof runtimeEnv[key] === "string"
  );
}

export function buildRuntimeEnvAssignment(values: AdsbaoRuntimeEnv) {
  return `window.__ADSBAO_ENV__ = Object.assign({}, window.__ADSBAO_ENV__, ${JSON.stringify(values)});\n`;
}
