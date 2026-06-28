import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { AIRPORT_MAP_ZOOM } from "../../config/aviation";
import { AIRPORT_MAP_PANES } from "../../config/airportMap";
import { ZOOM_DETAIL } from "../../utils/airportMapDisplay";
import { ensureAirportMapPane } from "../../features/airport/map/mapPane";
import { buildRenderableAirportSurfaceFeatureCollection } from "../../features/airport/map/runwayAnnotationModel";
import {
  safeAddToMap,
  safeRemoveFromMap,
} from "../../features/airport/map/leafletLayerSafety";
import { useMapInstance } from "./MapContext";

const airportSurfaceClassName = (kind: string) =>
  `airport-surface-feature airport-surface-feature--${kind}`;

const shouldShowAirportSurfaceForZoom = (zoom: unknown) => {
  const numericZoom = Number(zoom);
  return !Number.isFinite(numericZoom) || numericZoom > AIRPORT_MAP_ZOOM.approach;
};

const shouldRenderAirportSurfaceFeature = (
  feature: Record<string, any>,
  nightLighting: boolean,
) => {
  const kind = String(feature?.properties?.kind || "");
  // At night, taxiways are drawn as lit green/blue lines by
  // AirportGroundLightingLayer — suppress the generic pavement line here.
  if (nightLighting && (kind === "taxiway" || kind === "taxilane")) return false;
  return (
    kind === "runway" ||
    kind === "taxiway" ||
    kind === "taxilane" ||
    kind === "apron" ||
    kind === "terminal" ||
    kind === "building"
  );
};

const airportSurfaceStyle = (
  feature: Record<string, any>,
  theme: string,
  nightLighting: boolean,
  midZoom: boolean,
) => {
  const kind = String(feature?.properties?.kind || "");
  const geometryType = String(feature?.geometry?.type || "");
  const polygon = geometryType === "Polygon" || geometryType === "MultiPolygon";
  const isLight = theme === "light";

  if (kind === "runway") {
    // Runway stroke graduates with zoom:
    //   far  (<= approach)      full stroke — the runway is the only cue
    //   mid  (approach..detail) thin clean bar — a wide bar reads unnatural here
    //   detail dark (night)     dim full-width body under the bright dashed edges
    const baseWeight = isLight ? (polygon ? 1.8 : 2.4) : polygon ? 5.6 : 6.2;
    let weight = baseWeight;
    let opacity = isLight ? 0.28 : 0.68;
    if (nightLighting) {
      opacity = 0.34;
    } else if (midZoom) {
      weight = isLight ? 1.4 : 1.8;
      opacity = isLight ? 0.42 : 0.6;
    }
    return {
      className: airportSurfaceClassName(kind),
      color: "var(--airport-surface-runway-stroke)",
      fill: false,
      fillColor: "var(--airport-surface-runway-fill)",
      fillOpacity: 0,
      lineCap: "round",
      lineJoin: "round",
      opacity,
      stroke: true,
      weight,
    };
  }

  // Filled airport structures. Terminals get a distinct accent; other
  // buildings a muted fill; aprons a subtle pavement tone. Colors resolve from
  // theme tokens so both light and dark stay in the design system.
  if (kind === "terminal" || kind === "building" || kind === "apron") {
    const variant = kind === "apron" ? "apron" : kind === "terminal" ? "terminal" : "building";
    return {
      className: airportSurfaceClassName(kind),
      color: `var(--airport-surface-${variant}-stroke)`,
      fill: true,
      fillColor: `var(--airport-surface-${variant}-fill)`,
      fillOpacity: isLight ? 0.42 : 0.5,
      lineCap: "round",
      lineJoin: "round",
      opacity: isLight ? 0.5 : 0.6,
      stroke: true,
      weight: isLight ? 0.7 : 0.8,
    };
  }

  if (kind === "taxilane") {
    return {
      className: airportSurfaceClassName(kind),
      color: "var(--airport-surface-taxilane-line)",
      fill: false,
      lineCap: "round",
      lineJoin: "round",
      opacity: isLight ? 0.3 : 0.54,
      stroke: true,
      weight: isLight ? 1.15 : 1.05,
    };
  }

  return {
    className: airportSurfaceClassName(kind || "taxiway"),
    color: "var(--airport-surface-taxiway-line)",
    fill: false,
    lineCap: "round",
    lineJoin: "round",
    opacity: isLight ? 0.34 : 0.58,
    stroke: true,
    weight: isLight ? 1.25 : 1.15,
  };
};

export default function AirportSurfaceLayer({
  runwayMap = null,
  surfaceMap = null,
  theme = "dark",
  zoom,
}: Record<string, any>) {
  const map = useMapInstance();
  const layerRef = useRef(null);
  const surfaceFeatures = useMemo(
    () => buildRenderableAirportSurfaceFeatureCollection(surfaceMap, runwayMap),
    [runwayMap, surfaceMap],
  );
  // Night lighting is on in the dark theme at airport-detail zoom and closer;
  // taxiway pavement lines are then suppressed (the lighting layer draws lit
  // green/blue taxiways) and the runway pavement dims under the bright edges.
  const nightLighting = theme === "dark" && Number(zoom) >= ZOOM_DETAIL;
  // Second-level ("airport") zoom band, between the wide approach view and the
  // detail view — the runway is drawn as a thin clean bar here.
  const midZoom =
    Number(zoom) > AIRPORT_MAP_ZOOM.approach && Number(zoom) < ZOOM_DETAIL;
  const surfaceVisible = useMemo(
    () => shouldShowAirportSurfaceForZoom(zoom),
    [zoom],
  );

  useEffect(() => {
    if (!map || !surfaceFeatures?.features?.length) return undefined;
    if (!surfaceVisible) return undefined;

    safeRemoveFromMap(layerRef.current, map);
    const pane = ensureAirportMapPane(map, AIRPORT_MAP_PANES.surface);
    const renderer = L.svg({ pane, padding: 0.5 } as any);
    renderer.addTo(map);

    const layer = L.geoJSON(surfaceFeatures as any, {
      interactive: false,
      renderer,
      filter(feature) {
        return shouldRenderAirportSurfaceFeature(
          feature as Record<string, any>,
          nightLighting,
        );
      },
      style(feature) {
        return airportSurfaceStyle(
          feature as Record<string, any>,
          theme,
          nightLighting,
          midZoom,
        );
      },
    } as any);

    const added = safeAddToMap(layer, map, { label: "AirportSurfaceLayer" });
    if (!added) {
      renderer.remove();
      return undefined;
    }
    layerRef.current = layer;

    return () => {
      safeRemoveFromMap(layer, map);
      renderer.remove();
      layerRef.current = null;
    };
  }, [map, surfaceFeatures, theme, surfaceVisible, nightLighting, midZoom]);

  return null;
}
