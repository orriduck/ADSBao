"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMapInstance } from "./MapContext.js";
import {
  buildProcedureSegmentCollection,
  getProcedureSegmentStyle,
} from "../../features/airport-map/procedureSegmentModel.js";

export default function ProcedureSegmentLayer({
  runwayProcedures,
  theme = "dark",
}) {
  const map = useMapInstance();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!map || !runwayProcedures?.runwayDirections?.length) return undefined;

    const segments = buildProcedureSegmentCollection(runwayProcedures);
    if (!segments.features.length) return undefined;

    const baseStyle = getProcedureSegmentStyle(theme);
    const layer = L.geoJSON(segments, {
      interactive: false,
      style(feature) {
        return {
          ...baseStyle,
          opacity:
            baseStyle.opacity * (feature.properties?.segmentOpacity ?? 1),
          lineCap: "round",
          lineJoin: "round",
        };
      },
    }).addTo(map);
    layerRef.current = layer;

    return () => {
      layer.remove();
      layerRef.current = null;
    };
  }, [map, runwayProcedures, theme]);

  return null;
}
