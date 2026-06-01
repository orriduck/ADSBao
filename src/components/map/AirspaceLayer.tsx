"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { AIRPORT_MAP_PANES } from "@/config/airportMap";
import {
  buildAirspaceOverlayFeatures,
  resolveAirspaceOverlayFocusStyle,
  resolveAirspaceOverlayStyle,
} from "@/features/airport/map/airspaceOverlayModel";
import { ensureAirportMapPane } from "@/features/airport/map/mapPane";
import {
  safeAddToMap,
  safeRemoveFromMap,
} from "@/features/airport/map/leafletLayerSafety";
import { useMapInstance } from "./MapContext";

const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";
const BOUNDARY_LABEL_MIN_LENGTH = 180;
const BOUNDARY_LABEL_OFFSETS_BY_COUNT: Record<number, number[]> = {
  1: [0],
  2: [-12, 12],
  3: [-20, 0, 20],
  4: [-30, -10, 10, 30],
};
let boundaryLabelSequence = 0;

export default function AirspaceLayer({
  airspaces = [],
  visible = true,
  selectedAirspaceId = "",
  onSelectAirspace = null,
}: {
  airspaces?: Record<string, any>[];
  visible?: boolean;
  selectedAirspaceId?: string;
  onSelectAirspace?: ((airspaceId: string) => void) | null;
}) {
  const map = useMapInstance();
  const layerRef = useRef(null);
  const onSelectRef = useRef(onSelectAirspace);
  onSelectRef.current = onSelectAirspace;
  const features = useMemo(
    () => buildAirspaceOverlayFeatures(airspaces),
    [airspaces],
  );

  useEffect(() => {
    if (!map || !visible || features.length === 0) return undefined;

    safeRemoveFromMap(layerRef.current, map);
    const boundaryLabels: SVGTextElement[] = [];
    let labelFrame = 0;
    const airspacePane = ensureAirportMapPane(map, AIRPORT_MAP_PANES.airspace);
    const paneElement = map.getPane(airspacePane);
    if (paneElement) paneElement.style.pointerEvents = "auto";
    const polygonLayer = L.geoJSON(features as any, {
      interactive: Boolean(onSelectRef.current),
      pane: airspacePane,
      style(feature) {
        const style = resolveAirspaceOverlayStyle(feature as any);
        if (selectedAirspaceId && feature?.properties?.id === selectedAirspaceId) {
          return resolveAirspaceOverlayFocusStyle(feature as any);
        }
        return style;
      },
      onEachFeature(feature, featureLayer) {
        featureLayer.on("click", (event) => {
          event?.originalEvent?.stopPropagation?.();
          const id = String(feature.properties?.id || "");
          if (id) onSelectRef.current?.(id);
        });
      },
    });

    const added = safeAddToMap(polygonLayer, map, { label: "AirspaceLayer" });
    if (!added) return undefined;
    layerRef.current = polygonLayer;
    labelFrame = window.requestAnimationFrame(() => {
      boundaryLabels.push(...attachBoundaryLabels(polygonLayer, selectedAirspaceId));
    });

    return () => {
      window.cancelAnimationFrame(labelFrame);
      boundaryLabels.forEach((label) => label.remove());
      safeRemoveFromMap(polygonLayer, map);
      layerRef.current = null;
    };
  }, [map, features, selectedAirspaceId, visible]);

  return null;
}

function attachBoundaryLabels(
  layerGroup: L.GeoJSON,
  selectedAirspaceId = "",
): SVGTextElement[] {
  const labels: SVGTextElement[] = [];

  layerGroup.eachLayer((layer: any) => {
    const path = typeof layer.getElement === "function"
      ? layer.getElement()
      : null;
    if (!path?.ownerSVGElement) return;
    const pathLength = typeof path.getTotalLength === "function"
      ? path.getTotalLength()
      : 0;
    if (pathLength > 0 && pathLength < BOUNDARY_LABEL_MIN_LENGTH) {
      return;
    }

    const lines = boundaryLabelLines(layer.feature?.properties || {}, path, pathLength);
    if (lines.length === 0) return;
    const isFocused =
      Boolean(selectedAirspaceId) &&
      String(layer.feature?.properties?.id || "") === selectedAirspaceId;

    const pathId = path.id || `airspace-boundary-${boundaryLabelSequence += 1}`;
    path.id = pathId;

    const lineOffsets =
      BOUNDARY_LABEL_OFFSETS_BY_COUNT[lines.length] ||
      BOUNDARY_LABEL_OFFSETS_BY_COUNT[4];
    lines.forEach((line, index) => {
      const label = document.createElementNS(SVG_NS, "text");
      label.classList.add("airspace-boundary-label");
      if (isFocused) label.classList.add("airspace-boundary-label--focused");
      label.setAttribute("opacity", isFocused ? "1" : "0.5");
      label.setAttribute("dy", String(lineOffsets[index] || 0));
      const textPath = document.createElementNS(SVG_NS, "textPath");
      textPath.setAttribute("href", `#${pathId}`);
      textPath.setAttributeNS(XLINK_NS, "xlink:href", `#${pathId}`);
      textPath.setAttribute("startOffset", "50%");
      textPath.setAttribute("text-anchor", "middle");
      textPath.textContent = line;
      label.appendChild(textPath);
      path.ownerSVGElement.appendChild(label);
      labels.push(label);
    });
  });

  return labels;
}

function boundaryLabelLines(
  properties: Record<string, any>,
  path: SVGPathElement,
  pathLength: number,
) {
  const classLabel = String(properties.classLabel || "").trim();
  const name = String(properties.name || "").trim();
  const upper = formatBoundaryLimit(properties.upperLimitLabel);
  const lower = formatBoundaryLimit(properties.lowerLimitLabel);
  const vertical = [upper, lower].filter(Boolean).join(" - ");
  const bounds = path.getBoundingClientRect();
  const compact =
    (pathLength > 0 && pathLength < 420) ||
    Math.min(bounds.width, bounds.height) < 155;

  if (compact) {
    return [
      [classLabel && classLabel.length <= 2 ? classLabel : "", name].filter(Boolean).join(" "),
      vertical,
    ].filter(Boolean);
  }

  return [
    classLabel && classLabel.length <= 2 ? classLabel : "",
    name,
    upper,
    lower,
  ].filter(Boolean);
}

function formatBoundaryLimit(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/\bft\b/gi, "FT")
    .replace(/\bm\b/g, "M")
    .replace(/\bmsl\b/gi, "MSL")
    .replace(/\bgnd\b/gi, "GND")
    .replace(/\bfl\b/gi, "FL");
}
