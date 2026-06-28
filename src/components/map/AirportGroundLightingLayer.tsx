import { useEffect, useMemo } from "react";
import L from "leaflet";
import { AIRPORT_MAP_PANES } from "../../config/airportMap";
import { ZOOM_DETAIL } from "../../utils/airportMapDisplay";
import { ensureAirportMapPane } from "../../features/airport/map/mapPane";
import {
  buildRenderableAirportSurfaceFeatureCollection,
  buildRunwayMapFromSurfaceMap,
} from "../../features/airport/map/runwayAnnotationModel";
import { buildRunwayGroundLightingCollection } from "../../features/airport/map/runwayGroundLightingModel";
import {
  safeAddToMap,
  safeRemoveFromMap,
} from "../../features/airport/map/leafletLayerSafety";
import { useMapInstance } from "./MapContext";

// Crisp, performance-safe night lighting. SVG paths so colors resolve straight
// from the --atc-runway-light-* CSS tokens (theme-reactive) and dashArray is
// guaranteed; "edge lights" are a single DASHED line, not point markers. No
// blur, no glow, no dim polygon. Leaflet reprojects the static geometry on
// pan/zoom without recompute, so there is no per-frame work — only the REIL
// strobes animate (a handful of points toggled by one shared timer).

const REIL_FLASH_MS = 640;
const REIL_ON_OPACITY = 0.95;

// Style by feature `role` from runwayGroundLightingModel. Colors are CSS tokens
// so a [data-theme] flip retints without a rebuild.
const RUNWAY_LIGHT_LINE_STYLE: Record<string, Record<string, any>> = {
  edge: {
    color: "var(--atc-runway-light-white)",
    weight: 2,
    opacity: 0.95,
    dashArray: "1 7",
    lineCap: "round",
  },
  "edge-caution": {
    color: "var(--atc-runway-light-amber)",
    weight: 2,
    opacity: 0.97,
    dashArray: "1 7",
    lineCap: "round",
  },
  centerline: {
    color: "var(--atc-runway-light-white)",
    weight: 1.1,
    opacity: 0.55,
    dashArray: "3 6",
    lineCap: "butt",
  },
  endbar: {
    color: "var(--atc-runway-light-white)",
    weight: 2.4,
    opacity: 0.92,
    lineCap: "round",
  },
};

const TAXIWAY_BLUE_STYLE = {
  color: "var(--atc-runway-light-blue)",
  weight: 1.3,
  opacity: 0.5,
  lineCap: "round" as const,
  fill: false,
};

const TAXIWAY_GREEN_STYLE = {
  color: "var(--atc-runway-light-green)",
  weight: 1.2,
  opacity: 0.82,
  dashArray: "1.5 4",
  lineCap: "round" as const,
  fill: false,
};

const isTaxiwayFeature = (feature: Record<string, any>) => {
  const kind = String(feature?.properties?.kind || "");
  return kind === "taxiway" || kind === "taxilane";
};

export default function AirportGroundLightingLayer({
  runwayMap = null,
  surfaceMap = null,
  theme = "dark",
  zoom,
}: Record<string, any>) {
  const map = useMapInstance();

  // Night lighting only renders in the dark theme, at airport-detail zoom and
  // closer. This boolean is the primary perf guard — below the threshold nothing
  // is built or drawn. Gating on the boolean (not raw zoom) means the layer
  // rebuilds only when crossing the threshold, not on every fractional zoom.
  const lightsVisible = theme === "dark" && Number(zoom) >= ZOOM_DETAIL;

  const annotationRunwayMap = useMemo(
    () => buildRunwayMapFromSurfaceMap(surfaceMap, runwayMap) || runwayMap,
    [runwayMap, surfaceMap],
  );
  const surfaceFeatures = useMemo(
    () => buildRenderableAirportSurfaceFeatureCollection(surfaceMap, runwayMap),
    [runwayMap, surfaceMap],
  );
  const runwayLighting = useMemo(
    () => buildRunwayGroundLightingCollection(annotationRunwayMap),
    [annotationRunwayMap],
  );
  const taxiwayLines = useMemo(() => {
    const features = (surfaceFeatures?.features || []).filter((feature: Record<string, any>) =>
      isTaxiwayFeature(feature),
    );
    return { type: "FeatureCollection", features };
  }, [surfaceFeatures]);

  useEffect(() => {
    if (!map || !lightsVisible) return undefined;
    if (!runwayLighting.features.length && !taxiwayLines.features.length) {
      return undefined;
    }

    const pane = ensureAirportMapPane(map, AIRPORT_MAP_PANES.runwayLights);
    const renderer = L.svg({ pane, padding: 0.5 } as any);
    renderer.addTo(map);
    const group = L.layerGroup();
    const reilMarkers: any[] = [];

    // Taxiways: thin blue edge under a green dashed centerline (same geometry,
    // both thinner than the runway so the runway stays dominant).
    if (taxiwayLines.features.length) {
      group.addLayer(
        L.geoJSON(taxiwayLines as any, {
          renderer,
          interactive: false,
          style: () => ({ ...TAXIWAY_BLUE_STYLE }),
        } as any),
      );
      group.addLayer(
        L.geoJSON(taxiwayLines as any, {
          renderer,
          interactive: false,
          style: () => ({ ...TAXIWAY_GREEN_STYLE }),
        } as any),
      );
    }

    // Runway edges / centerline / end bars (lines) + REIL strobes (points).
    if (runwayLighting.features.length) {
      group.addLayer(
        L.geoJSON(runwayLighting as any, {
          renderer,
          interactive: false,
          style: (feature: any) => {
            const role = String(feature?.properties?.role || "edge");
            return {
              fill: false,
              lineJoin: "round",
              ...(RUNWAY_LIGHT_LINE_STYLE[role] || RUNWAY_LIGHT_LINE_STYLE.edge),
            };
          },
          pointToLayer: (feature: any, latlng: any) => {
            const marker = L.circleMarker(latlng, {
              renderer,
              interactive: false,
              radius: 1.8,
              color: "var(--atc-runway-light-white)",
              fillColor: "var(--atc-runway-light-white)",
              fill: true,
              fillOpacity: REIL_ON_OPACITY,
              opacity: REIL_ON_OPACITY,
              stroke: false,
              weight: 0,
            } as any);
            if (feature?.properties?.role === "reil") reilMarkers.push(marker);
            return marker;
          },
        } as any),
      );
    }

    const added = safeAddToMap(group, map, { label: "AirportGroundLightingLayer" });
    if (!added) {
      renderer.remove();
      return undefined;
    }

    // REIL flash: one shared ~1.5 Hz timer toggling a few points. Honors
    // prefers-reduced-motion (left steady-on). Touches only the REIL elements,
    // so it does not force a full-map repaint.
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let flashTimer = 0;
    if (reilMarkers.length && !prefersReducedMotion) {
      let on = true;
      flashTimer = window.setInterval(() => {
        on = !on;
        const value = on ? REIL_ON_OPACITY : 0.06;
        for (const marker of reilMarkers) {
          try {
            marker.setStyle({ fillOpacity: value, opacity: value });
          } catch {
            // marker removed mid-cycle — ignore
          }
        }
      }, REIL_FLASH_MS);
    }

    return () => {
      if (flashTimer) window.clearInterval(flashTimer);
      safeRemoveFromMap(group, map);
      renderer.remove();
    };
  }, [map, lightsVisible, runwayLighting, taxiwayLines]);

  return null;
}
