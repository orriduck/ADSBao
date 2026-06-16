"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { AIRPORT_MAP_PANES } from "../../config/airportMap";
import { ensureAirportMapPane } from "../../features/airport/map/mapPane";
import {
  safeAddToMap,
  safeRemoveFromMap,
} from "../../features/airport/map/leafletLayerSafety";
import { useMapInstance } from "./MapContext";

const airportSurfaceClassName = (kind: string) =>
  `airport-surface-feature airport-surface-feature--${kind}`;

const airportSurfaceStyle = (feature: Record<string, any>) => {
  const kind = String(feature?.properties?.kind || "");
  const geometryType = String(feature?.geometry?.type || "");
  const polygon = geometryType === "Polygon" || geometryType === "MultiPolygon";

  if (kind === "apron") {
    return {
      className: airportSurfaceClassName(kind),
      color: "var(--airport-surface-apron-stroke)",
      fill: true,
      fillColor: "var(--airport-surface-apron-fill)",
      fillOpacity: 0.28,
      opacity: 0.42,
      stroke: true,
      weight: 1,
    };
  }

  if (kind === "runway") {
    return {
      className: airportSurfaceClassName(kind),
      color: "var(--airport-surface-runway-stroke)",
      fill: false,
      fillColor: "var(--airport-surface-runway-fill)",
      fillOpacity: 0,
      lineCap: "round",
      lineJoin: "round",
      opacity: 0.56,
      stroke: true,
      weight: polygon ? 4.6 : 5.2,
    };
  }

  if (kind === "taxilane") {
    return {
      className: airportSurfaceClassName(kind),
      color: "var(--airport-surface-taxilane-line)",
      fill: false,
      lineCap: "round",
      lineJoin: "round",
      opacity: 0.28,
      stroke: true,
      weight: 2.4,
    };
  }

  return {
    className: airportSurfaceClassName(kind || "taxiway"),
    color: "var(--airport-surface-taxiway-line)",
    fill: false,
    lineCap: "round",
    lineJoin: "round",
    opacity: 0.34,
    stroke: true,
    weight: 3.2,
  };
};

export default function AirportSurfaceLayer({
  surfaceMap = null,
  theme = "dark",
}: Record<string, any>) {
  const map = useMapInstance();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!map || !surfaceMap?.features?.features?.length) return undefined;

    safeRemoveFromMap(layerRef.current, map);
    const pane = ensureAirportMapPane(map, AIRPORT_MAP_PANES.surface);
    const renderer = L.svg({ pane, padding: 0.5 } as any);
    renderer.addTo(map);

    const layer = L.geoJSON(surfaceMap.features as any, {
      interactive: false,
      renderer,
      style(feature) {
        return airportSurfaceStyle(feature as Record<string, any>);
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
  }, [map, surfaceMap, theme]);

  return null;
}
