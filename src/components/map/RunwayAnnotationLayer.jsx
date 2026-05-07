"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMapInstance } from "./MapContext.js";
import {
  AIRPORT_MAP_PANES,
  RUNWAY_ANNOTATION_STYLE_CONFIG,
} from "../../config/airportMap.js";
import { ensureAirportMapPane } from "../../features/airport-map/mapPane.js";
import { createRunwayBeamGradientController } from "../../features/airport-map/runwayBeamGradientController.js";
import {
  buildRunwayApproachBeamCollection,
  buildRunwayCenterlineCollection,
  buildRunwayEndLabels,
} from "../../features/airport-map/runwayAnnotationModel.js";

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

const runwayLineStyle = (theme) =>
  RUNWAY_ANNOTATION_STYLE_CONFIG.lineStyles[theme] ||
  RUNWAY_ANNOTATION_STYLE_CONFIG.lineStyles.dark;

const runwayBeamColor = (theme) =>
  RUNWAY_ANNOTATION_STYLE_CONFIG.beamColors[theme] ||
  RUNWAY_ANNOTATION_STYLE_CONFIG.beamColors.dark;

const runwayLabelIcon = (ident, theme) =>
  L.divIcon({
    className: `runway-end-label runway-end-label--${theme}`,
    html: `<span>${escapeHtml(ident)}</span>`,
    iconSize: [34, 18],
    iconAnchor: [17, 22],
  });

export default function RunwayAnnotationLayer({
  runwayMap,
  theme = "dark",
  zoom,
  showBeams = true,
  showBadges = true,
}) {
  const map = useMapInstance();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!map || !runwayMap?.runways?.length) return undefined;

    const centerlines = buildRunwayCenterlineCollection(runwayMap);
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

    const sublayers = [lineLayer];
    let beamLayer = null;

    if (showBeams) {
      const beams = buildRunwayApproachBeamCollection(runwayMap, { zoom });
      beamLayer = L.geoJSON(beams, {
        interactive: false,
        style() {
          return {
            className: "runway-approach-beam",
            fill: true,
            fillColor: runwayBeamColor(theme),
            fillOpacity: 1,
            opacity: 0,
            stroke: false,
          };
        },
      });
      sublayers.unshift(beamLayer);
    }

    if (showBadges) {
      const labels = buildRunwayEndLabels(runwayMap, { zoom });
      const labelLayer = L.layerGroup(
        labels.map((label) =>
          L.marker([label.lat, label.lon], {
            interactive: false,
            keyboard: false,
            icon: runwayLabelIcon(label.ident, theme),
            pane: ensureAirportMapPane(map, AIRPORT_MAP_PANES.badge),
          }),
        ),
      );
      sublayers.push(labelLayer);
    }

    const layer = L.layerGroup(sublayers).addTo(map);
    layerRef.current = layer;

    const removeGradients = beamLayer
      ? createRunwayBeamGradientController({ map, beamLayer, theme })
      : () => {};

    return () => {
      removeGradients();
      layer.remove();
      layerRef.current = null;
    };
  }, [map, runwayMap, theme, zoom, showBeams, showBadges]);

  return null;
}
