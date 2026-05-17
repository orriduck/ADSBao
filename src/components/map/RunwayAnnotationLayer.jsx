"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMapInstance } from "./MapContext.js";
import {
  AIRPORT_MAP_PANES,
  RUNWAY_ANNOTATION_STYLE_CONFIG,
} from "../../config/airportMap.js";
import { ensureAirportMapPane } from "../../features/airport/map/mapPane.js";
import { createRunwayBeamGradientController } from "../../features/airport/map/runwayBeamGradientController.js";
import {
  buildRunwayApproachVisualization,
  buildRunwayCenterlineCollection,
  buildRunwayEndLabels,
} from "../../features/airport/map/runwayAnnotationModel.js";

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

// Renders the runway-approach visualisation in whichever shape the
// active theme prefers:
//   - dark theme  → soft glowing beam wedge (preserves the existing
//                   gradient-controller pipeline so the wedge fades
//                   outward from the threshold)
//   - light theme → dashed extended centerline (reads cleanly on the
//                   bright basemap; mirrors a chart-style approach
//                   path)
//
// The two pipelines are different enough (polygon + gradient vs.
// polyline + stroke dash) that the component dispatches on the
// visualisation `kind` returned by buildRunwayApproachVisualization
// instead of sharing a single style block.
const buildApproachLayer = ({ kind, data, theme }) => {
  if (kind === "approach-lines") {
    const stroke =
      theme === "light" ? "rgba(36,65,100,0.7)" : "rgba(216,189,131,0.78)";
    const layer = L.geoJSON(data, {
      interactive: false,
      style(feature) {
        return {
          className: "runway-approach-line",
          color: stroke,
          weight: 1.4,
          opacity: feature?.properties?.beamOpacity != null
            ? Math.min(1, 0.55 + Number(feature.properties.beamOpacity))
            : 0.95,
          dashArray: "6 8",
          lineCap: "butt",
          lineJoin: "round",
        };
      },
    });
    return { layer, beamLayer: null, beamRenderer: null };
  }

  // approach-beams (default — dark theme)
  // Use a dedicated renderer with extra padding so beams that extend
  // beyond the viewport edge are not clipped by the default SVG canvas.
  // At ZOOM_AIRPORT beams reach ~408 px; default padding (0.1) is ~80 px.
  const beamRenderer = L.svg({ padding: 1 });
  const layer = L.geoJSON(data, {
    renderer: beamRenderer,
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
  return { layer, beamLayer: layer, beamRenderer };
};

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
    let beamRenderer = null;

    if (showBeams) {
      const visualization = buildRunwayApproachVisualization(runwayMap, {
        zoom,
        theme,
      });
      const built = buildApproachLayer({
        kind: visualization.kind,
        data: visualization.data,
        theme,
      });
      sublayers.unshift(built.layer);
      beamLayer = built.beamLayer;
      beamRenderer = built.beamRenderer;
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

    // Gradient controller is only meaningful for the wedge variant;
    // the dashed line uses a plain stroke and doesn't need per-frame
    // gradient updates.
    const removeGradients = beamLayer
      ? createRunwayBeamGradientController({ map, beamLayer, theme })
      : () => {};

    return () => {
      removeGradients();
      layer.remove();
      beamRenderer?.remove();
      layerRef.current = null;
    };
  }, [map, runwayMap, theme, zoom, showBeams, showBadges]);

  return null;
}
