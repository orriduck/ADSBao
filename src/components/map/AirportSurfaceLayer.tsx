"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { AIRPORT_MAP_ZOOM } from "../../config/aviation";
import { AIRPORT_MAP_PANES } from "../../config/airportMap";
import { ensureAirportMapPane } from "../../features/airport/map/mapPane";
import { buildRenderableAirportSurfaceFeatureCollection } from "../../features/airport/map/runwayAnnotationModel";
import { buildTaxiwayLightCollection } from "../../features/airport/map/runwayLightingModel";
import { runwayLightingLodForZoom } from "../../features/airport/map/airportMapZoomFeatures";
import { buildRunwayLightCanvasLayer } from "../../features/airport/map/runwayLightCanvas";
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
) => {
  const kind = String(feature?.properties?.kind || "");
  return kind === "runway" || kind === "taxiway" || kind === "taxilane";
};

const airportSurfaceStyle = (
  feature: Record<string, any>,
  theme: string,
) => {
  const kind = String(feature?.properties?.kind || "");
  const geometryType = String(feature?.geometry?.type || "");
  const polygon = geometryType === "Polygon" || geometryType === "MultiPolygon";
  const isLight = theme === "light";

  if (kind === "runway") {
    return {
      className: airportSurfaceClassName(kind),
      color: "var(--airport-surface-runway-stroke)",
      fill: false,
      fillColor: "var(--airport-surface-runway-fill)",
      fillOpacity: 0,
      lineCap: "round",
      lineJoin: "round",
      opacity: isLight ? 0.28 : 0.68,
      stroke: true,
      weight: isLight
        ? polygon ? 1.8 : 2.4
        : polygon ? 5.6 : 6.2,
    };
  }

  if (kind === "taxilane") {
    return {
      className: airportSurfaceClassName(kind),
      color: "var(--airport-surface-taxilane-line)",
      fill: false,
      lineCap: "round",
      lineJoin: "round",
      opacity: isLight ? 0.24 : 0.3,
      stroke: true,
      weight: isLight ? 1.8 : 3,
    };
  }

  return {
    className: airportSurfaceClassName(kind || "taxiway"),
    color: "var(--airport-surface-taxiway-line)",
    fill: false,
    lineCap: "round",
    lineJoin: "round",
    opacity: isLight ? 0.3 : 0.38,
    stroke: true,
    weight: isLight ? 2.4 : 4,
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

  useEffect(() => {
    if (!map || !surfaceFeatures?.features?.length) return undefined;
    if (!shouldShowAirportSurfaceForZoom(zoom)) return undefined;

    safeRemoveFromMap(layerRef.current, map);
    const pane = ensureAirportMapPane(map, AIRPORT_MAP_PANES.surface);
    const renderer = L.svg({ pane, padding: 0.5 } as any);
    renderer.addTo(map);

    const layer = L.geoJSON(surfaceFeatures as any, {
      interactive: false,
      renderer,
      filter(feature) {
        return shouldRenderAirportSurfaceFeature(feature as Record<string, any>);
      },
      style(feature) {
        return airportSurfaceStyle(feature as Record<string, any>, theme);
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
  }, [map, surfaceFeatures, theme, zoom]);

  // Taxiway lights (green centerline + blue edge) on a shared canvas. Near band
  // only — taxiway lights are dense and low-value when zoomed out. Rebuilds only
  // on band crossing / airport / theme change, not on every fractional zoom.
  const lightingBand = useMemo(() => runwayLightingLodForZoom(zoom), [zoom]);
  useEffect(() => {
    if (!map || !surfaceFeatures?.features?.length) return undefined;
    if (lightingBand !== "near") return undefined;

    const lights = buildTaxiwayLightCollection(surfaceFeatures, { band: lightingBand });
    if (!lights.features.length) return undefined;

    const { layer, renderer } = buildRunwayLightCanvasLayer({ data: lights, map });
    renderer.addTo(map);
    layer.addTo(map);

    return () => {
      layer.remove();
      renderer.remove();
    };
  }, [map, surfaceFeatures, lightingBand, theme]);

  return null;
}
