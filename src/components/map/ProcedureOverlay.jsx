"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMapInstance } from "./MapContext.js";
import { buildProcedureRenderLayers } from "../../features/airport/map/procedureOverlayModel.js";

export default function ProcedureOverlay({ geojson, theme = "dark" }) {
  const map = useMapInstance();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!map || !geojson) return undefined;
    const renderLayers = buildProcedureRenderLayers(geojson, theme);
    if (renderLayers.every((layer) => layer.geojson.features.length === 0)) {
      return undefined;
    }

    const layer = L.layerGroup(
      renderLayers.map(({ geojson: layerGeoJson, style }) =>
        L.geoJSON(layerGeoJson, {
          interactive: false,
          style(feature) {
            return {
              ...style,
              opacity: feature.properties?.layerOpacity ?? style.opacity,
              lineCap: "round",
              lineJoin: "round",
            };
          },
        }),
      ),
    ).addTo(map);

    layerRef.current = layer;

    return () => {
      layer.remove();
      layerRef.current = null;
    };
  }, [geojson, map, theme]);

  return null;
}
