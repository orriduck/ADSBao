"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMapInstance } from "./MapContext.js";
import {
  buildProcedureLineCollection,
  getProcedureSilkStyles,
} from "../../features/airport-map/procedureOverlayModel.js";

export default function ProcedureOverlay({ geojson, theme = "dark" }) {
  const map = useMapInstance();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!map || !geojson) return undefined;
    const lineCollection = buildProcedureLineCollection(geojson);
    if (lineCollection.features.length === 0) return undefined;

    const layer = L.layerGroup(
      getProcedureSilkStyles(theme).map((style) =>
        L.geoJSON(lineCollection, {
          interactive: false,
          style: {
            ...style,
            lineCap: "round",
            lineJoin: "round",
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
