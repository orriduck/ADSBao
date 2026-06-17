import { AIRPORT_MAP_ZOOM } from "./aviation";

export const AIRPORT_MAP_FALLBACK_CENTER = {
  lat: 33.9416,
  lon: -118.4085,
};

export const AIRPORT_MAP_PANES = {
  surface: {
    name: "airport-map-surface-overlay",
    zIndex: 360,
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

// FAA AIM Ch.2 §3 lighting geometry. Spacing/zone distances are in feet
// (FAA spec units); the model converts to meters. Colors are NOT here — the
// renderer maps each light's semantic color role to a CSS variable so themes
// stay the source of truth (see --atc-runway-light-* in style.css).
export const RUNWAY_FAA_LIGHTING_CONFIG = {
  // Longitudinal spacing along the runway. NOTE: these are intentionally WIDER
  // than the real FAA spacing (edge 200ft, centerline 50ft). At the map's max
  // usable zoom, true spacing packs the dots into a solid line; widening the
  // gaps keeps individual lights legible. Color ZONES below stay distance-exact
  // (in feet), so the FAA color pattern is preserved regardless of spacing.
  edgeSpacingFt: 600,
  centerlineSpacingFt: 400,
  // Symmetric color zones, measured from the nearer threshold.
  edgeCautionFt: 2000, // edge turns amber within last 2000ft (or half, whichever less)
  centerlineRedFt: 1000, // centerline all-red within last 1000ft
  centerlineAltFt: 3000, // centerline alternates red/white from 3000ft to 1000ft remaining
  // Touchdown zone lights: from `tdzStartFt` past the (displaced) threshold,
  // extending up to `tdzLengthFt` or the runway midpoint, whichever is less.
  tdzStartFt: 100,
  tdzLengthFt: 3000,
  tdzBarSpacingFt: 500, // widened for legibility (real ~100ft)
  tdzBarHalfCount: 2, // lights per side of a single TDZ bar
  // Threshold / runway-end bar: number of lights across the runway width.
  endBarLightCount: 5,
  // REIL: a pair of synchronized flashing strobes flanking each threshold.
  reilOffsetFt: 40, // lateral offset outboard of the runway edge
  // Taxiway lights (OSM geometry; width is estimated since OSM rarely has it).
  // Also widened from real spacing (centerline 50ft, edge 200ft) for legibility.
  taxiwayCenterlineSpacingFt: 400,
  taxiwayEdgeSpacingFt: 600,
  taxiwayDefaultHalfWidthFt: 38, // ~11.5m assumed half-width for blue edge offset
  // Per-band decimation: keep mid-zoom point counts sane.
  midCenterlineDecimation: 2, // render every Nth centerline light at mid band
  // Canvas point radius (screen px) per color role bucket — the core dot.
  // A subtle glow halo (radius × glowMultiplier, low opacity) is drawn
  // underneath in the canvas renderer.
  radius: {
    edge: 1.0,
    centerline: 0.6,
    tdz: 0.6,
    endBar: 0.85,
    reil: 1.05,
    approach: 0.75,
    taxiway: 0.35,
  },
  glow: {
    multiplier: 3.2, // glow halo radius = core radius × this
    fillOpacity: 0.22,
  },
} as const;

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
