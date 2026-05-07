"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMapInstance } from "./MapContext.js";
import { AIRPORT_MAP_PANES } from "../../config/airportMap.js";
import { ensureAirportMapPane } from "../../features/airport-map/mapPane.js";
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
    const fixLabelPane = ensureAirportMapPane(map, AIRPORT_MAP_PANES.badge);
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
