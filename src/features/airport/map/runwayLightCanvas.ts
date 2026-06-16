// Shared Leaflet canvas rendering for synthesized airport lights.
//
// FAA-accurate density (50ft centerline + TDZL + taxiway) produces thousands of
// points; rendering them as SVG circleMarkers would create thousands of DOM
// nodes and rebuild on every zoom. A single `L.canvas()` renderer collapses all
// of them to ONE <canvas>. Used by both RunwayAnnotationLayer and
// AirportSurfaceLayer (taxiway lights).
//
// Canvas cannot read CSS variables, so light colors are resolved from the FAA
// color tokens (--atc-runway-light-*) into concrete values ONCE per build via
// getComputedStyle. Tokens remain the source of truth; this is the one place
// they are read into JS. Re-resolved whenever the layer rebuilds (theme change).

import L from "leaflet";
import { runwayLightRadius, type LightColorRole } from "./runwayLightingModel";

const FALLBACK_LIGHT_COLORS: Record<LightColorRole, string> = {
  white: "#fff2c0",
  amber: "#ffd36a",
  red: "#ff5a52",
  green: "#54e08a",
  blue: "#5aa6ff",
};

const resolveLightColors = (map: any): Record<LightColorRole, string> => {
  try {
    const styles = getComputedStyle(map.getContainer());
    const read = (name: string, fallback: string) =>
      styles.getPropertyValue(name).trim() || fallback;
    return {
      white: read("--atc-runway-light-white", FALLBACK_LIGHT_COLORS.white),
      amber: read("--atc-runway-light-amber", FALLBACK_LIGHT_COLORS.amber),
      red: read("--atc-runway-light-red", FALLBACK_LIGHT_COLORS.red),
      green: read("--atc-runway-light-green", FALLBACK_LIGHT_COLORS.green),
      blue: read("--atc-runway-light-blue", FALLBACK_LIGHT_COLORS.blue),
    };
  } catch {
    return FALLBACK_LIGHT_COLORS;
  }
};

const REIL_ON_OPACITY = 0.95;

// Build a single canvas layer for a FeatureCollection of light points. Returns
// the geoJSON layer, the canvas renderer (add/remove on the map alongside it),
// and the subset of flashing REIL markers for the flash timer.
export const buildRunwayLightCanvasLayer = ({
  data,
  map,
}: {
  data: Record<string, any>;
  map: any;
}) => {
  const renderer = L.canvas({ padding: 0.5 });
  const colors = resolveLightColors(map);
  const reilMarkers: any[] = [];

  const layer = L.geoJSON(data as any, {
    interactive: false,
    pointToLayer(feature: any, latlng: any) {
      const props = feature?.properties || {};
      const colorRole = (props.color || "white") as LightColorRole;
      const color = colors[colorRole] || colors.white;
      const marker = L.circleMarker(latlng, {
        renderer,
        interactive: false,
        bubblingMouseEvents: false,
        color,
        fill: true,
        fillColor: color,
        fillOpacity: 0.92,
        opacity: 0.65,
        radius: faaLightRadiusFor(props.role),
        stroke: false,
        weight: 0,
      } as any);
      if (props.flashing) reilMarkers.push(marker);
      return marker;
    },
  } as any);

  return { layer, renderer, reilMarkers };
};

const faaLightRadiusFor = (role: unknown) =>
  runwayLightRadius((role as any) || "centerline");

// Synchronized REIL flash (~1.5 Hz) driven by one shared timer. Honors
// prefers-reduced-motion by leaving the strobes steady-on (no timer). Returns a
// cleanup function.
export const startReilFlashTimer = (reilMarkers: any[]): (() => void) => {
  if (!reilMarkers.length) return () => {};
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) return () => {};

  let on = true;
  const timer = window.setInterval(() => {
    on = !on;
    const fillOpacity = on ? REIL_ON_OPACITY : 0;
    const opacity = on ? REIL_ON_OPACITY : 0;
    reilMarkers.forEach((marker) => {
      try {
        marker.setStyle({ fillOpacity, opacity });
      } catch {
        // marker removed mid-cycle — ignore
      }
    });
  }, 640);

  return () => window.clearInterval(timer);
};
