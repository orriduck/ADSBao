"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMapInstance } from "./MapContext.js";

const themeStyles = {
  dark: {
    line: "#f59e0b",
    point: "#fde68a",
  },
  light: {
    line: "#b45309",
    point: "#92400e",
  },
};

export default function ProcedureOverlay({ geojson, theme = "dark" }) {
  const map = useMapInstance();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!map || !geojson) return undefined;
    const colors = themeStyles[theme] || themeStyles.dark;

    const layer = L.geoJSON(geojson, {
      interactive: false,
      style(feature) {
        if (feature.geometry?.type !== "LineString") return {};
        return {
          color: colors.line,
          weight: 2,
          opacity: 0.82,
          dashArray: feature.properties?.unsupported ? "4 4" : undefined,
        };
      },
      pointToLayer(feature, latlng) {
        return L.circleMarker(latlng, {
          radius: feature.properties?.legType === "IF" ? 4 : 3,
          color: colors.point,
          weight: 1,
          fillColor: colors.line,
          fillOpacity: 0.72,
          opacity: 0.9,
        });
      },
    }).addTo(map);

    layerRef.current = layer;

    return () => {
      layer.remove();
      layerRef.current = null;
    };
  }, [geojson, map, theme]);

  return null;
}
