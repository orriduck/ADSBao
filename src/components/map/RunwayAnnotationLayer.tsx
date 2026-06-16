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
  buildRunwayApproachLightCollection,
  buildRunwayApproachVisualization,
  buildRunwayCenterlineCollection,
  buildRunwayEndLabels,
  buildRunwayLightCollection,
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

const runwayLightRadius = (feature: Record<string, any>) => {
  const kind = String(feature?.properties?.kind || "");
  if (kind === "threshold") return 1.7;
  if (kind === "centerline") return 0.82;
  const progress = Number(feature?.properties?.progress);
  if (progress === 0 || progress === 1) return 1.55;
  return 1.12;
};

const runwayApproachLightRadius = (feature: Record<string, any>) => {
  const progress = Number(feature?.properties?.progress);
  if (!Number.isFinite(progress)) return 1.08;
  return Math.max(0.72, 1.24 - progress * 0.42);
};

const isLeafletLayer = (layer: unknown): layer is L.Layer =>
  Boolean(
    layer &&
      typeof (layer as L.Layer).addTo === "function" &&
      typeof (layer as L.Layer).remove === "function",
  );

// Dispatches on the `kind` returned by buildRunwayApproachVisualization:
// light theme draws a dashed extended centerline; dark theme keeps the
// glowing wedge + gradient controller. The pipelines are different
// enough (polyline vs. polygon + per-frame gradient) that a single
// style block would be artificial.
const buildApproachLayer = ({ kind, data, map, theme }: Record<string, any>) => {
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
  beamRenderer.addTo(map);
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

const buildRunwayLightLayer = ({ data }: Record<string, any>) =>
  L.geoJSON(data as any, {
    interactive: false,
    pointToLayer(feature, latlng) {
      const kind = String(feature?.properties?.kind || "");
      const isCenterline = kind === "centerline";
      const isThreshold = kind === "threshold";
      return L.circleMarker(latlng, {
        bubblingMouseEvents: false,
        className:
          isThreshold
            ? "runway-light-dot runway-threshold-light-dot"
            : "runway-light-dot",
        color: "var(--runway-light-core)",
        fill: true,
        fillColor: isCenterline
          ? "var(--runway-light-core)"
          : "var(--runway-light)",
        fillOpacity: isCenterline ? 0.68 : isThreshold ? 0.96 : 0.86,
        opacity: isCenterline ? 0.62 : isThreshold ? 0.96 : 0.88,
        radius: runwayLightRadius(feature as Record<string, any>),
        stroke: true,
        weight: isThreshold ? 0.5 : 0.45,
      });
    },
  } as any);

const buildRunwayApproachLightLayer = ({ data }: Record<string, any>) =>
  L.geoJSON(data as any, {
    interactive: false,
    pointToLayer(feature, latlng) {
      return L.circleMarker(latlng, {
        bubblingMouseEvents: false,
        className: "runway-approach-light-dot",
        color: "var(--runway-light-core)",
        fill: true,
        fillColor: "var(--runway-light)",
        fillOpacity: 0.78,
        opacity: 0.76,
        radius: runwayApproachLightRadius(feature as Record<string, any>),
        stroke: true,
        weight: 0.38,
      });
    },
  } as any);

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

    const sublayers: L.Layer[] = [lineLayer].filter(isLeafletLayer);
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
        map,
        theme,
      });
      if (isLeafletLayer(built.layer)) sublayers.unshift(built.layer);
      beamLayer = isLeafletLayer(built.beamLayer) ? built.beamLayer : null;
      beamRenderer = built.beamRenderer;

      if (theme !== "light") {
        const approachLights = buildRunwayApproachLightCollection(runwayMap, {
          zoom,
        });
        if (approachLights.features.length) {
          const approachLightLayer = buildRunwayApproachLightLayer({
            data: approachLights,
          });
          if (isLeafletLayer(approachLightLayer)) sublayers.push(approachLightLayer);
        }

        const runwayLights = buildRunwayLightCollection(runwayMap);
        if (runwayLights.features.length) {
          const lightLayer = buildRunwayLightLayer({ data: runwayLights });
          if (isLeafletLayer(lightLayer)) sublayers.push(lightLayer);
        }
      }
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
      if (isLeafletLayer(labelLayer)) sublayers.push(labelLayer);
    }

    if (!sublayers.length) return undefined;

    const layer = L.layerGroup().addTo(map);
    layerRef.current = layer;

    let beamLayerAdded = false;
    const addSublayer = (sublayer: L.Layer, label: string) => {
      try {
        layer.addLayer(sublayer);
        if (sublayer === beamLayer) beamLayerAdded = true;
      } catch (error) {
        console.warn(`[RunwayAnnotationLayer] skipped ${label}`, error);
      }
    };

    sublayers.forEach((sublayer, index) => {
      addSublayer(sublayer, `sublayer-${index}`);
    });

    const removeGradients = beamLayer && beamLayerAdded
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
