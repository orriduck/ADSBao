export const AIRPORT_MAP_ZOOM = {
  approach: 10,
  airport: 11,
  detail: 13.5,
};

// 机场地图自由缩放范围(Leaflet zoom)。预设作为滑条上的吸附点。
export const AIRPORT_MAP_ZOOM_MIN = 10;
export const AIRPORT_MAP_ZOOM_MAX = 15;
// Full-route and recorded-trace fitting may need a continent-scale viewport.
// This is intentionally separate from the user-facing 10–15 range slider:
// programmatic trace views can zoom farther out, while Follow aircraft keeps
// the familiar adjustable range.
export const AIRPORT_MAP_FIT_ZOOM_MIN = 2;

export const AIRPORT_EXPLORER_UI_CONFIG = {
  desktopSidebarWidth: "var(--app-sidebar-width)",
  mobileBreakpointPx: 768,
  adsbLoadingFadeMs: 180,
  airportMapRevealMs: 1_200,
};

export const AIRCRAFT_TRAFFIC_CONFIG = {
  pollMs: 3_000,
  pollBackoffMaxMs: 30_000,
  // The airport explorer keeps one stable, airport-centred traffic circle.
  // Panning the map stays inside this retained data radius rather than
  // starting a new live subscription for each viewport movement.
  rangeNm: 80,
  hiddenPollGraceMs: 5_000,
  hiddenPollMaxMs: 30_000,
  lostSignalTraceRefreshMs: 60_000,
  traceSteadyRefreshMs: 180_000,
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
  hitCacheMs: 30 * 60 * 1000,
  missCacheMs: 5 * 60 * 1000,
};
