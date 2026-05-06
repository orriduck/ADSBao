"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMapInstance } from "./MapContext.js";
import {
  buildRunwayCenterlineCollection,
  buildRunwayEndLabels,
} from "../../features/airport-map/runwayAnnotationModel.js";

const RUNWAY_LINE_STYLES = {
  dark: {
    color: "#8fb7d6",
    weight: 2,
    opacity: 0.82,
  },
  light: {
    color: "#244164",
    weight: 2,
    opacity: 0.76,
  },
};

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

const runwayLineStyle = (theme) => RUNWAY_LINE_STYLES[theme] || RUNWAY_LINE_STYLES.dark;

const runwayLabelIcon = (ident, theme) =>
  L.divIcon({
    className: `runway-end-label runway-end-label--${theme}`,
    html: `<span>${escapeHtml(ident)}</span>`,
    iconSize: [34, 18],
    iconAnchor: [17, 9],
  });

export default function RunwayAnnotationLayer({
  runwayMap,
  theme = "dark",
  zoom,
}) {
  const map = useMapInstance();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!map || !runwayMap?.runways?.length) return undefined;

    const centerlines = buildRunwayCenterlineCollection(runwayMap);
    const labels = buildRunwayEndLabels(runwayMap, { zoom });
    if (!centerlines.features.length && !labels.length) return undefined;

    const lineLayer = L.geoJSON(centerlines, {
      interactive: false,
      style() {
        return {
          ...runwayLineStyle(theme),
          lineCap: "butt",
          lineJoin: "round",
        };
      },
    });
    const labelLayer = L.layerGroup(
      labels.map((label) =>
        L.marker([label.lat, label.lon], {
          interactive: false,
          keyboard: false,
          icon: runwayLabelIcon(label.ident, theme),
          zIndexOffset: 460,
        }),
      ),
    );
    const layer = L.layerGroup([lineLayer, labelLayer]).addTo(map);
    layerRef.current = layer;

    return () => {
      layer.remove();
      layerRef.current = null;
    };
  }, [map, runwayMap, theme, zoom]);

  return null;
}
