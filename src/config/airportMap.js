import { AIRCRAFT_COLORS } from "../constants/aircraft.js";
import { AIRPORT_MAP_ZOOM } from "./aviation.js";

export const AIRPORT_MAP_FALLBACK_CENTER = {
  lat: 33.9416,
  lon: -118.4085,
};

export const AIRPORT_MAP_TRAFFIC_LEGEND = [
  { id: "departure", label: "DEP", color: AIRCRAFT_COLORS.departure },
  { id: "unknown", label: "UNKN", color: AIRCRAFT_COLORS.unknown },
  { id: "arrival", label: "ARR", color: AIRCRAFT_COLORS.arrival },
];

export const AIRPORT_MAP_PANES = {
  trace: {
    name: "airport-map-trace",
    zIndex: 405,
  },
  badge: {
    name: "airport-map-badge",
    zIndex: 420,
  },
};

export const SELECTED_AIRCRAFT_TRACE_STYLE = {
  maxRenderPoints: 140,
  dark: {
    glowColor: "#8ec5ff",
    glowOpacity: 0.18,
    glowWeight: 12,
    lineColor: "#d5ecff",
    lineOpacity: 0.94,
    lineWeight: 3.2,
    pointColor: "#d5ecff",
    pointFillOpacity: 0.42,
    pointRadius: 2,
  },
  light: {
    glowColor: "#9ab7d6",
    glowOpacity: 0.1,
    glowWeight: 9,
    lineColor: "#234a73",
    lineOpacity: 0.86,
    lineWeight: 3,
    pointColor: "#234a73",
    pointFillOpacity: 0.28,
    pointRadius: 1.8,
  },
};

export const RUNWAY_APPROACH_BEAM_CONFIG = {
  arcSegments: 18,
  profiles: [
    {
      zoom: AIRPORT_MAP_ZOOM.approach,
      distanceSm: 10,
      angle: 10,
      nearDistance: 180,
      nearAngle: 3.2,
      nearWidth: 520,
      opacity: 0.3,
    },
    {
      zoom: AIRPORT_MAP_ZOOM.airport,
      distanceSm: 3.6,
      angle: 12,
      nearDistance: 95,
      nearAngle: 7,
      nearWidth: 135,
      opacity: 0.25,
    },
    {
      zoom: AIRPORT_MAP_ZOOM.detail,
      distanceSm: 1.45,
      angle: 16,
      nearDistance: 70,
      nearAngle: 12,
      nearWidth: 92,
      opacity: 0.27,
    },
  ],
};

export const RUNWAY_ANNOTATION_STYLE_CONFIG = {
  lineStyles: {
    dark: {
      color: "#8fb7d6",
      weight: 3,
      opacity: 0.5,
    },
    light: {
      color: "#244164",
      weight: 3,
      opacity: 0.5,
    },
  },
  beamColors: {
    dark: "#d8bd83",
    light: "#8b6f47",
  },
  beamGradientStops: [
    { offset: "0%", opacityScale: 1, maxOpacity: 0.42 },
    { offset: "34%", opacityScale: 0.7 },
    { offset: "72%", opacityScale: 0.2 },
    { offset: "100%", opacityScale: 0 },
  ],
};
