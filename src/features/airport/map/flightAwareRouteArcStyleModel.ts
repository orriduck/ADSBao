import { SELECTED_AIRCRAFT_TRACE_STYLE } from "../../../config/airportMap";

export const FLIGHTAWARE_ROUTE_DASH_ARRAY = "10 12";

export function buildFlightAwareRouteLayerStyles({
  theme = "dark",
  opacity = 1,
} = {}) {
  const normalizedOpacity = Number.isFinite(Number(opacity))
    ? Number(opacity)
    : 1;
  const traceStyle =
    theme === "light"
      ? SELECTED_AIRCRAFT_TRACE_STYLE.light
      : SELECTED_AIRCRAFT_TRACE_STYLE.dark;
  const color = traceStyle.lineColor;

  return {
    glow: {
      color,
      opacity: 0.18 * normalizedOpacity,
      weight: traceStyle.glowWeight,
      dashArray: FLIGHTAWARE_ROUTE_DASH_ARRAY,
    },
    route: {
      color,
      opacity: 0.58 * normalizedOpacity,
      weight: Math.max(1, traceStyle.lineWeight - 0.4),
      dashArray: FLIGHTAWARE_ROUTE_DASH_ARRAY,
    },
  };
}
