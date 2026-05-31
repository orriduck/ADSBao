"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMapInstance } from "./MapContext";
import {
  AIRPORT_MAP_PANES,
  RUNWAY_ANNOTATION_STYLE_CONFIG,
} from "../../config/airportMap";
import { ensureAirportMapPane } from "../../features/airport/map/mapPane";
import { createRunwayBeamGradientController } from "../../features/airport/map/runwayBeamGradientController";
import {
  buildRunwayApproachVisualization,
  buildRunwayCenterlineCollection,
  buildRunwayEndLabels,
} from "../../features/airport/map/runwayAnnotationModel";

const escapeHtml = (value: unknown) =>
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

const runwayLineStyle = (theme: string) =>
  RUNWAY_ANNOTATION_STYLE_CONFIG.lineStyles[theme] ||
  RUNWAY_ANNOTATION_STYLE_CONFIG.lineStyles.dark;

const runwayBeamColor = (theme: string) =>
  RUNWAY_ANNOTATION_STYLE_CONFIG.beamColors[theme] ||
  RUNWAY_ANNOTATION_STYLE_CONFIG.beamColors.dark;

const runwayLabelIcon = (ident: string, theme: string) =>
  L.divIcon({
    className: `runway-end-label runway-end-label--${theme}`,
    html: `<span class="notranslate" translate="no">${escapeHtml(ident)}</span>`,
    iconSize: [34, 18],
    iconAnchor: [17, 22],
  });

// Dispatches on the `kind` returned by buildRunwayApproachVisualization:
// light theme draws a dashed extended centerline; dark theme keeps the
// glowing wedge + gradient controller. The pipelines are different
// enough (polyline vs. polygon + per-frame gradient) that a single
// style block would be artificial.
const buildApproachLayer = ({ kind, data, theme }: Record<string, any>) => {
  if (kind === "approach-lines") {
    const layer = L.geoJSON(data as any, {
      interactive: false,
      style(feature) {
        return {
          className: "runway-approach-line",
          color: "var(--runway-approach-line)",
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

  // Extra renderer padding so beams that extend past the viewport edge
  // aren't clipped — default 0.1 is ~80px but beams can reach ~408px.
  const beamRenderer = L.svg({ padding: 1 });
  const layer = L.geoJSON(data as any, {
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
  } as any);
  return { layer, beamLayer: layer, beamRenderer };
};

export default function RunwayAnnotationLayer({
  runwayMap,
  theme = "dark",
  zoom,
  showBeams = true,
  showBadges = true,
}: Record<string, any>) {
  const map = useMapInstance();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!map || !runwayMap?.runways?.length) return undefined;

    const centerlines = buildRunwayCenterlineCollection(runwayMap);
    const lineLayer = L.geoJSON(centerlines as any, {
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
      sublayers.unshift(built.layer as any);
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
      sublayers.push(labelLayer as any);
    }

    const layer = L.layerGroup(sublayers).addTo(map);
    layerRef.current = layer;

    const removeGradients = beamLayer
      ? createRunwayBeamGradientController({ map, beamLayer: beamLayer as any, theme })
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
