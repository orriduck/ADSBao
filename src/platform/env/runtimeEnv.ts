export type AdsbaoRuntimeEnvKey =
  | "VITE_ADSBAO_REALTIME_URL"
  | "VITE_CLERK_PUBLISHABLE_KEY"
  | "VITE_SITE_URL"
  | "VITE_AIRCRAFT_PHOTOS_BASE"
  | "VITE_AIRCRAFT_POSITIONS_BASE"
  | "VITE_AIRCRAFT_TRACE_BASE"
  | "VITE_LOCAL_WEATHER_BASE"
  | "VITE_METAR_PROXY_BASE";

export type AdsbaoRuntimeEnv = Partial<Record<AdsbaoRuntimeEnvKey, string>>;

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
