"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import L from "leaflet";
import { AIRPORT_MAP_PANES } from "@/config/airportMap";
import {
  buildAirspaceOverlayAnimationPlan,
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
  const layerRef = useRef<L.GeoJSON | null>(null);
  const boundaryLabelsRef = useRef<SVGTextElement[]>([]);
  const labelFrameRef = useRef(0);
  const animationFrameRef = useRef(0);
  const selectedAirspaceIdRef = useRef(selectedAirspaceId);
  const visibleRef = useRef(visible);
  const onSelectRef = useRef(onSelectAirspace);
  onSelectRef.current = onSelectAirspace;
  selectedAirspaceIdRef.current = selectedAirspaceId;
  visibleRef.current = visible;
  const features = useMemo(
    () => buildAirspaceOverlayFeatures(airspaces),
    [airspaces],
  );

  useEffect(() => {
    if (!map || features.length === 0) return undefined;

    cancelAirspaceAnimation(animationFrameRef);
    window.cancelAnimationFrame(labelFrameRef.current);
    boundaryLabelsRef.current.forEach((label) => label.remove());
    boundaryLabelsRef.current = [];
    safeRemoveFromMap(layerRef.current, map);
    const boundaryLabels: SVGTextElement[] = [];
    const airspacePane = ensureAirportMapPane(map, AIRPORT_MAP_PANES.airspace);
    const paneElement = map.getPane(airspacePane);
    if (paneElement) paneElement.style.pointerEvents = visibleRef.current ? "auto" : "none";
    const polygonLayer = L.geoJSON(features as any, {
      interactive: Boolean(onSelectRef.current),
      pane: airspacePane,
      style(feature) {
        return resolveVisibleAirspaceStyle(
          feature as any,
          selectedAirspaceIdRef.current,
          visibleRef.current ? 1 : 0,
        );
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
    applyAirspaceGroupOpacity(
      polygonLayer,
      boundaryLabels,
      selectedAirspaceIdRef.current,
      visibleRef.current ? 1 : 0,
    );
    labelFrameRef.current = window.requestAnimationFrame(() => {
      boundaryLabels.push(
        ...attachBoundaryLabels(
          polygonLayer,
          selectedAirspaceIdRef.current,
          visibleRef.current ? 1 : 0,
        ),
      );
      boundaryLabelsRef.current = boundaryLabels;
    });

    return () => {
      cancelAirspaceAnimation(animationFrameRef);
      window.cancelAnimationFrame(labelFrameRef.current);
      boundaryLabels.forEach((label) => label.remove());
      boundaryLabelsRef.current = [];
      safeRemoveFromMap(polygonLayer, map);
      layerRef.current = null;
    };
  }, [map, features]);

  useEffect(() => {
    const polygonLayer = layerRef.current;
    if (!map || !polygonLayer) return;

    const airspacePane = ensureAirportMapPane(map, AIRPORT_MAP_PANES.airspace);
    const paneElement = map.getPane(airspacePane);
    if (paneElement) paneElement.style.pointerEvents = visible ? "auto" : "none";

    animateAirspaceGroupOpacity({
      layerGroup: polygonLayer,
      labels: boundaryLabelsRef.current,
      selectedAirspaceId,
      visible,
      animationFrameRef,
    });
  }, [map, selectedAirspaceId, visible]);

  return null;
}

function resolveVisibleAirspaceStyle(
  feature: Record<string, any>,
  selectedAirspaceId: string,
  opacityScale: number,
) {
  const style =
    selectedAirspaceId && feature?.properties?.id === selectedAirspaceId
      ? resolveAirspaceOverlayFocusStyle(feature)
      : resolveAirspaceOverlayStyle(feature);
  return {
    ...style,
    fillOpacity: Number(style.fillOpacity || 0) * opacityScale,
    opacity: Number(style.opacity || 0) * opacityScale,
  };
}

function animateAirspaceGroupOpacity({
  layerGroup,
  labels,
  selectedAirspaceId,
  visible,
  animationFrameRef,
}: {
  layerGroup: L.GeoJSON;
  labels: SVGTextElement[];
  selectedAirspaceId: string;
  visible: boolean;
  animationFrameRef: MutableRefObject<number>;
}) {
  cancelAirspaceAnimation(animationFrameRef);

  const layers = getAirspaceFeatureLayers(layerGroup);
  const reducedMotion = prefersReducedMotion();
  const plan = buildAirspaceOverlayAnimationPlan(
    layers,
    visible ? "enter" : "exit",
    { reducedMotion },
  );

  if (reducedMotion || plan.itemDurationMs === 0) {
    applyAirspaceGroupOpacity(layerGroup, labels, selectedAirspaceId, visible ? 1 : 0);
    return;
  }

  const labelGroups = groupLabelsByLayerIndex(labels);
  const startedAt = window.performance.now();
  const targetOpacity = visible ? 1 : 0;
  const animations = plan.steps.map((step) => {
    const layer = layers[step.index];
    return {
      layer,
      labels: labelGroups.get(step.index) || [],
      delayMs: step.delayMs,
      fromOpacity: readAirspaceLayerOpacityScale(layer, visible ? 0 : 1),
    };
  });

  const tick = (now: number) => {
    let complete = true;
    for (const animation of animations) {
      const elapsed = now - startedAt - animation.delayMs;
      if (elapsed < 0) {
        complete = false;
        continue;
      }

      const progress = Math.min(1, elapsed / plan.itemDurationMs);
      const opacityScale =
        animation.fromOpacity +
        (targetOpacity - animation.fromOpacity) * easeOutQuart(progress);
      applyAirspaceFeatureOpacity(
        animation.layer,
        animation.labels,
        selectedAirspaceId,
        opacityScale,
      );
      if (progress < 1) complete = false;
    }

    if (complete) {
      applyAirspaceGroupOpacity(layerGroup, labels, selectedAirspaceId, targetOpacity);
      animationFrameRef.current = 0;
      return;
    }

    animationFrameRef.current = window.requestAnimationFrame(tick);
  };

  animationFrameRef.current = window.requestAnimationFrame(tick);
}

function applyAirspaceGroupOpacity(
  layerGroup: L.GeoJSON,
  labels: SVGTextElement[],
  selectedAirspaceId: string,
  opacityScale: number,
) {
  const labelGroups = groupLabelsByLayerIndex(labels);
  getAirspaceFeatureLayers(layerGroup).forEach((layer, index) => {
    applyAirspaceFeatureOpacity(
      layer,
      labelGroups.get(index) || [],
      selectedAirspaceId,
      opacityScale,
    );
  });
}

function applyAirspaceFeatureOpacity(
  layer: any,
  labels: SVGTextElement[],
  selectedAirspaceId: string,
  opacityScale: number,
) {
  if (typeof layer?.setStyle === "function") {
    layer.setStyle(resolveVisibleAirspaceStyle(layer.feature, selectedAirspaceId, opacityScale));
  }
  layer.__airspaceOpacityScale = opacityScale;
  labels.forEach((label) => setBoundaryLabelState(label, selectedAirspaceId, opacityScale));
}

function getAirspaceFeatureLayers(layerGroup: L.GeoJSON) {
  const layers: any[] = [];
  layerGroup.eachLayer((layer: any) => layers.push(layer));
  return layers;
}

function groupLabelsByLayerIndex(labels: SVGTextElement[]) {
  const groups = new Map<number, SVGTextElement[]>();
  labels.forEach((label) => {
    const index = Number(label.dataset.airspaceLayerIndex);
    if (!Number.isInteger(index)) return;
    const group = groups.get(index) || [];
    group.push(label);
    groups.set(index, group);
  });
  return groups;
}

function readAirspaceLayerOpacityScale(layer: any, fallback: number) {
  const value = Number(layer?.__airspaceOpacityScale);
  return Number.isFinite(value) ? value : fallback;
}

function cancelAirspaceAnimation(animationFrameRef: MutableRefObject<number>) {
  if (!animationFrameRef.current) return;
  window.cancelAnimationFrame(animationFrameRef.current);
  animationFrameRef.current = 0;
}

function easeOutQuart(value: number) {
  return 1 - Math.pow(1 - value, 4);
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

function attachBoundaryLabels(
  layerGroup: L.GeoJSON,
  selectedAirspaceId = "",
  opacityScale = 1,
): SVGTextElement[] {
  const labels: SVGTextElement[] = [];

  let layerIndex = 0;
  layerGroup.eachLayer((layer: any) => {
    const currentLayerIndex = layerIndex;
    layerIndex += 1;
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
    const pathId = path.id || `airspace-boundary-${boundaryLabelSequence += 1}`;
    path.id = pathId;

    const lineOffsets =
      BOUNDARY_LABEL_OFFSETS_BY_COUNT[lines.length] ||
      BOUNDARY_LABEL_OFFSETS_BY_COUNT[4];
    lines.forEach((line, index) => {
      const label = document.createElementNS(SVG_NS, "text");
      label.dataset.airspaceLayerIndex = String(currentLayerIndex);
      label.dataset.airspaceFeatureId = String(layer.feature?.properties?.id || "");
      label.classList.add("airspace-boundary-label");
      setBoundaryLabelState(label, selectedAirspaceId, opacityScale);
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

function setBoundaryLabelState(
  label: SVGTextElement,
  selectedAirspaceId: string,
  opacityScale: number,
) {
  const isFocused =
    Boolean(selectedAirspaceId) &&
    label.dataset.airspaceFeatureId === selectedAirspaceId;
  label.classList.toggle("airspace-boundary-label--focused", isFocused);
  label.style.opacity = String((isFocused ? 1 : 0.5) * opacityScale);
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
