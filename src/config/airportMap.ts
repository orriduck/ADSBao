import { AIRPORT_MAP_ZOOM } from "./aviation";

export const AIRPORT_MAP_FALLBACK_CENTER = {
  lat: 33.9416,
  lon: -118.4085,
};

export const AIRPORT_MAP_PANES = {
  // Ambient time-of-day/weather colour wash over the raw tile imagery only —
  // sits just above the (Leaflet default z=200) tile pane and below every
  // other annotation pane here, so it never tints runway surfaces, airspace
  // fills, badges, trace, or aircraft (whose orange/blue accent colours must
  // stay uncontaminated).
  ambientWash: {
    name: "airport-map-ambient-wash",
    zIndex: 250,
  },
  surface: {
    name: "airport-map-surface-overlay",
    zIndex: 360,
  },
  // Crisp-line runway/taxiway night lighting, just above the runway/taxiway
  // surfaces and below airspace.
  runwayLights: {
    name: "airport-map-runway-lights",
    zIndex: 380,
  },
  airspace: {
    name: "airport-map-airspace",
    zIndex: 395,
  },
  trace: {
    name: "airport-map-trace",
    zIndex: 405,
  },
  badge: {
    name: "airport-map-badge",
    zIndex: 420,
  },
  candidateSpot: {
    name: "airport-map-candidate-spot",
    zIndex: 430,
  },
  // Single canvas for all aircraft glyphs. Sits above the trace/badge panes so
  // planes draw on top of their own trail, matching the old marker pane (~600).
  aircraft: {
    name: "airport-map-aircraft",
    zIndex: 600,
  },
};

// Color values intentionally resolve through CSS variables so each
// theme/palette can own the map treatment without changing JS.
export const SELECTED_AIRCRAFT_TRACE_STYLE = {
  maxRenderPoints: 140,
  dark: {
    glowColor: "var(--aviation-trace-glow)",
    glowOpacity: 0.22,
    glowWeight: 12,
    lineColor: "var(--aviation-trace-line)",
    lineOpacity: 0.94,
    lineWeight: 3.2,
    pointColor: "var(--aviation-trace-point)",
    pointFillOpacity: 0.5,
    pointRadius: 2,
  },
  light: {
    glowColor: "var(--aviation-trace-glow)",
    glowOpacity: 0.18,
    glowWeight: 9,
    lineColor: "var(--aviation-trace-line)",
    lineOpacity: 0.82,
    lineWeight: 3,
    pointColor: "var(--aviation-trace-point)",
    pointFillOpacity: 0.34,
    pointRadius: 1.8,
  },
};

export const RUNWAY_APPROACH_BEAM_CONFIG = {
  arcSegments: 18,
  profiles: [
    {
      zoom: AIRPORT_MAP_ZOOM.approach,
      distanceSm: 3.2,
      angle: 7,
      nearDistance: 120,
      nearAngle: 3,
      nearWidth: 120,
      opacity: 0.18,
    },
    {
      zoom: AIRPORT_MAP_ZOOM.airport,
      distanceSm: 1.25,
      angle: 9,
      nearDistance: 70,
      nearAngle: 6,
      nearWidth: 64,
      opacity: 0.2,
    },
    {
      zoom: AIRPORT_MAP_ZOOM.detail,
      distanceSm: 0.62,
      angle: 13,
      nearDistance: 42,
      nearAngle: 10,
      nearWidth: 46,
      opacity: 0.22,
    },
  ],
};

export const RUNWAY_ANNOTATION_STYLE_CONFIG = {
  lineStyles: {
    dark: {
      color: "var(--aviation-runway-annotation-line)",
      weight: 5.2,
      opacity: 0.82,
    },
    night: {
      color: "var(--runway-night-line)",
      weight: 1.6,
      opacity: 0.52,
    },
    light: {
      color: "var(--aviation-runway-annotation-line)",
      weight: 3,
      opacity: 0.42,
    },
  },
  beamColors: {
    dark: "var(--aviation-runway-approach-beam)",
    night: "var(--runway-night-beam)",
    light: "var(--aviation-runway-approach-beam)",
  },
  beamGradientStops: [
    { offset: "0%", opacityScale: 1, maxOpacity: 0.42 },
    { offset: "34%", opacityScale: 0.7 },
    { offset: "72%", opacityScale: 0.2 },
    { offset: "100%", opacityScale: 0 },
  ],
};
