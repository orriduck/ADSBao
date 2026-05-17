export const AIRPORT_MAP_ZOOM = {
  approach: 10,
  airport: 11,
  detail: 13,
};

export const AIRPORT_EXPLORER_UI_CONFIG = {
  desktopSidebarWidth: "var(--app-sidebar-width)",
  mobileBreakpointPx: 768,
  adsbLoadingFadeMs: 1100,
};

export const AIRCRAFT_TRAFFIC_CONFIG = {
  pollMs: 3_000,
  rangeNm: 40,
  hiddenPollGraceMs: 5_000,
};

export const AVIATION_PROXY_BASES = {
  metar: "/api/proxy/metar",
  aircraftPositions: "/api/proxy/aircraft/positions",
  aircraftCallsign: "/api/proxy/aircraft/callsign",
  aircraftPhotos: "/api/proxy/aircraft/photos",
  aircraftTrace: "/api/proxy/aircraft/trace",
  flightRoute: "/api/proxy/flight-routes/callsign",
  localWeather: "/api/proxy/local-weather",
};

export const AVIATION_REQUEST_TIMEOUT_MS = {
  json: 14_000,
  metar: 10_000,
  localWeather: 10_000,
  aircraftPositions: AIRCRAFT_TRAFFIC_CONFIG.pollMs,
  aircraftCallsign: 6_000,
  aircraftPhoto: 8_000,
  aircraftTrace: 12_000,
  flightRoute: 10_000,
};

export const FLIGHT_ROUTE_LOOKUP_CONFIG = {
  hitCacheMs: 6 * 60 * 60 * 1000,
  missCacheMs: 2 * 60 * 60 * 1000,
  maxConcurrentLookups: 10,
  maxLookupsPerPass: 18,
  maxQueueSize: 60,
  auditLogIntervalMs: 2_000,
  queueIntervalMs: 167,
  rateLimitMaxTokens: 6,
  rateLimitRefillMs: 1000,
  backoffInitialMs: 2000,
  backoffMaxMs: 60_000,
  userAgent: "ADSBao/0.10.0 (https://github.com/orriduck/ADSBao)",
};

export const FAA_CIFP_CONFIG = {
  downloadPageUrl:
    "https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/cifp/download/",
  cacheMs: 6 * 60 * 60 * 1000,
  maxProceduresPerAirport: 12,
  maxZipBytes: 50 * 1024 * 1024,
  maxCifpBytes: 120 * 1024 * 1024,
  userAgent: "ADSBao/0.10.0 (https://github.com/orriduck/ADSBao)",
};
