export const AIRPORT_MAP_ZOOM = {
  approach: 10,
  airport: 11,
  detail: 13.5,
};

export const AIRPORT_EXPLORER_UI_CONFIG = {
  desktopSidebarWidth: "var(--app-sidebar-width)",
  mobileBreakpointPx: 768,
  adsbLoadingFadeMs: 180,
};

export const AIRCRAFT_TRAFFIC_CONFIG = {
  pollMs: 3_000,
  rangeNm: 40,
  hiddenPollGraceMs: 5_000,
  hiddenPollMaxMs: 30_000,
  flightAwareTraceRefreshMs: 60_000,
};

export const AVIATION_PROXY_BASES = {
  metar: "/api/proxy/metar",
  aircraftPositions: "/api/proxy/aircraft/positions",
  aircraftCallsign: "/api/proxy/aircraft/callsign",
  aircraftPhotos: "/api/proxy/aircraft/photos",
  aircraftTrace: "/api/proxy/aircraft/trace",
  localWeather: "/api/proxy/local-weather",
};

export const AVIATION_REQUEST_TIMEOUT_MS = {
  json: 14_000,
  metar: 10_000,
  localWeather: 10_000,
  aircraftPositions: 10_000,
  aircraftCallsign: 6_000,
  aircraftPhoto: 8_000,
  aircraftTrace: 12_000,
};

export const FLIGHT_ROUTE_LOOKUP_CONFIG = {
  hitCacheMs: 6 * 60 * 60 * 1000,
  missCacheMs: 2 * 60 * 60 * 1000,
  maxQueueSize: 60,
};
