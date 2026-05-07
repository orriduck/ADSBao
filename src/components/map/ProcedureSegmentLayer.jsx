"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMapInstance } from "./MapContext.js";
import {
  buildProcedureFixLabels,
  buildProcedureSegmentCollection,
  getProcedureSegmentStyle,
} from "../../features/airport-map/procedureSegmentModel.js";

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });

const FIX_LABEL_PANE = "procedure-fix";

const ensureFixLabelPane = (map) => {
  let pane = map.getPane(FIX_LABEL_PANE);
  if (!pane) {
    pane = map.createPane(FIX_LABEL_PANE);
  }
  pane.style.zIndex = "360";
  pane.style.pointerEvents = "none";
  return FIX_LABEL_PANE;
};

const fixLabelIcon = (label, theme) =>
  L.divIcon({
    className: `procedure-fix-label procedure-fix-label--${theme}`,
    html: escapeHtml(label.fixIdent),
    iconSize: [38, 12],
    iconAnchor: [19, 6],
  });

export default function ProcedureSegmentLayer({
  runwayProcedures,
  fixLabelRunwayProcedures = runwayProcedures,
  theme = "dark",
  showFixLabels = false,
}) {
  const map = useMapInstance();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!map) return undefined;

    const segments = buildProcedureSegmentCollection(runwayProcedures);
    const labels = showFixLabels
      ? buildProcedureFixLabels(fixLabelRunwayProcedures)
      : [];
    if (!segments.features.length && !labels.length) return undefined;

    const baseStyle = getProcedureSegmentStyle(theme);
    const fixLabelPane = ensureFixLabelPane(map);
    const lineLayer = L.geoJSON(segments, {
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
    });
    const labelLayer = L.layerGroup(
      labels.map((label) =>
        L.marker([label.lat, label.lon], {
          interactive: false,
          keyboard: false,
          icon: fixLabelIcon(label, theme),
          pane: fixLabelPane,
        }),
      ),
    );
    const layer = L.layerGroup([lineLayer, labelLayer]).addTo(map);
    layerRef.current = layer;

    return () => {
      layer.remove();
      layerRef.current = null;
    };
  }, [fixLabelRunwayProcedures, map, runwayProcedures, showFixLabels, theme]);

  return null;
}
