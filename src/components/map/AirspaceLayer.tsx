import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import L from "leaflet";
import { AIRPORT_MAP_PANES } from "@/config/airportMap";
import {
  buildAirspaceOverlayAnimationPlan,
  buildAirspaceOverlayFeatures,
  resolveAirspaceInitialOpacity,
  resolveAirspaceInteriorPattern,
  resolveAirspaceOverlayFocusStyle,
  resolveAirspaceOverlayStyle,
} from "@/features/airport/map/airspaceOverlayModel";
import {
  airspaceFeatureIdsAtClientPoint,
  resolveAirspaceClientPoint,
  resolveClickedAirspaceId,
  shouldHandleAirspaceSelection,
} from "@/features/airport/map/airspaceSelectionModel";
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
  selectableAirspaceIds = [],
  visible = true,
  showBoundaryLabels = false,
  selectedAirspaceId = "",
  onSelectAirspace = null,
}: {
  airspaces?: Record<string, any>[];
  selectableAirspaceIds?: string[];
  visible?: boolean;
  showBoundaryLabels?: boolean;
  selectedAirspaceId?: string;
  onSelectAirspace?: ((airspaceId: string) => void) | null;
}) {
  const map = useMapInstance();
  const layerRef = useRef<L.GeoJSON | null>(null);
  const boundaryLabelsRef = useRef<SVGTextElement[]>([]);
  const boundaryEdgesRef = useRef<SVGElement[]>([]);
  const interiorHatchesRef = useRef<SVGElement[]>([]);
  const labelFrameRef = useRef(0);
  const animationFrameRef = useRef(0);
  const hasAnimatedInitialEnterRef = useRef(false);
  const skipNextVisibilityAnimationRef = useRef(false);
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
  const selectableAirspaceIdSet = useMemo(
    () => new Set(selectableAirspaceIds.map((id) => String(id)).filter(Boolean)),
    [selectableAirspaceIds],
  );

  useEffect(() => {
    if (!map || features.length === 0) return undefined;

    cancelAirspaceAnimation(animationFrameRef);
    window.cancelAnimationFrame(labelFrameRef.current);
    boundaryLabelsRef.current.forEach((label) => label.remove());
    boundaryLabelsRef.current = [];
    boundaryEdgesRef.current.forEach((edge) => edge.remove());
    boundaryEdgesRef.current = [];
    interiorHatchesRef.current.forEach((hatch) => hatch.remove());
    interiorHatchesRef.current = [];
    safeRemoveFromMap(layerRef.current, map);
    const boundaryLabels: SVGTextElement[] = [];
    const boundaryEdges: SVGElement[] = [];
    const interiorHatches: SVGElement[] = [];
    const animateInitialEnter =
      visibleRef.current && !hasAnimatedInitialEnterRef.current;
    const initialOpacity = resolveAirspaceInitialOpacity({
      visible: visibleRef.current,
      animateInitialEnter,
    });
    if (animateInitialEnter) {
      hasAnimatedInitialEnterRef.current = true;
      skipNextVisibilityAnimationRef.current = true;
    }
    const airspacePane = ensureAirportMapPane(map, AIRPORT_MAP_PANES.airspace);
    const paneElement = map.getPane(airspacePane);
    if (paneElement) paneElement.style.pointerEvents = visibleRef.current ? "auto" : "none";
    const handleNativeAirspacePointer = (event: PointerEvent | TouchEvent) => {
      if (
        typeof PointerEvent !== "undefined" &&
        event instanceof PointerEvent &&
        event.pointerType === "mouse"
      ) {
        return;
      }
      if (
        !shouldHandleAirspaceSelection({
          visible: visibleRef.current,
          onSelectAirspace: onSelectRef.current,
        })
      ) {
        return;
      }
      const clientPoint = resolveAirspaceClientPoint(event);
      const hitIds = airspaceFeatureIdsAtClientPoint(clientPoint);
      const clickedId = hitIds[0] || "";
      if (!clickedId && hitIds.length === 0) return;
      const latlng = resolveAirspaceLatLngFromClientPoint(map, clientPoint);
      const id = resolveClickedAirspaceId({
        hitIds,
        features,
        latlng,
        clickedId,
        selectableAirspaceIds: selectableAirspaceIdSet,
        selectedAirspaceId: selectedAirspaceIdRef.current,
      });
      if (!id) return;
      L.DomEvent.stop(event as any);
      event.preventDefault?.();
      onSelectRef.current?.(id);
    };
    const usePointerEvents = typeof window.PointerEvent !== "undefined";
    const nativeAirspacePointerOptions = { passive: false, capture: true };
    paneElement?.addEventListener(
      usePointerEvents ? "pointerup" : "touchend",
      handleNativeAirspacePointer as EventListener,
      nativeAirspacePointerOptions,
    );
    const polygonLayer = L.geoJSON(features as any, {
      interactive: Boolean(onSelectRef.current),
      pane: airspacePane,
      style(feature) {
        return resolveVisibleAirspaceStyle(
          feature as any,
          selectedAirspaceIdRef.current,
          initialOpacity,
        );
      },
      onEachFeature(feature, featureLayer) {
        const featureId = String(feature.properties?.id || "");
        featureLayer.on("add", () => {
          setAirspaceLayerDomMetadata(featureLayer, featureId);
        });
        featureLayer.on("click", (event) => {
          if (
            !shouldHandleAirspaceSelection({
              visible: visibleRef.current,
              onSelectAirspace: onSelectRef.current,
            })
          ) {
            return;
          }
          if (event?.originalEvent) {
            L.DomEvent.stop(event.originalEvent);
            event.originalEvent.stopPropagation?.();
          }
          const clientPoint = resolveAirspaceClientPoint(event?.originalEvent);
          const hitIds = airspaceFeatureIdsAtClientPoint(clientPoint);
          const id = resolveClickedAirspaceId({
            hitIds,
            features,
            latlng: event?.latlng,
            clickedId: featureId,
            selectableAirspaceIds: selectableAirspaceIdSet,
            selectedAirspaceId: selectedAirspaceIdRef.current,
          });
          if (id) onSelectRef.current?.(id);
        });
      },
    });

    const added = safeAddToMap(polygonLayer, map, { label: "AirspaceLayer" });
    if (!added) {
      paneElement?.removeEventListener(
        usePointerEvents ? "pointerup" : "touchend",
        handleNativeAirspacePointer as EventListener,
        nativeAirspacePointerOptions,
      );
      return undefined;
    }
    layerRef.current = polygonLayer;
    applyAirspaceGroupOpacity(
      polygonLayer,
      boundaryLabels,
      boundaryEdges,
      interiorHatches,
      selectedAirspaceIdRef.current,
      initialOpacity,
    );
    labelFrameRef.current = window.requestAnimationFrame(() => {
      boundaryEdges.push(
        ...attachBoundaryEdges(
          polygonLayer,
          selectedAirspaceIdRef.current,
          initialOpacity,
        ),
      );
      boundaryEdgesRef.current = boundaryEdges;
      interiorHatches.push(
        ...attachInteriorHatches(
          polygonLayer,
          selectedAirspaceIdRef.current,
          initialOpacity,
        ),
      );
      interiorHatchesRef.current = interiorHatches;
      boundaryLabels.push(
        ...attachBoundaryLabels(
          polygonLayer,
          selectedAirspaceIdRef.current,
          initialOpacity,
          showBoundaryLabels,
        ),
      );
      boundaryLabelsRef.current = boundaryLabels;
      if (animateInitialEnter) {
        animateAirspaceGroupOpacity({
          layerGroup: polygonLayer,
          labels: boundaryLabels,
          edges: boundaryEdges,
          hatches: interiorHatches,
          selectedAirspaceId: selectedAirspaceIdRef.current,
          visible: true,
          animationFrameRef,
        });
      }
    });

    return () => {
      cancelAirspaceAnimation(animationFrameRef);
      window.cancelAnimationFrame(labelFrameRef.current);
      boundaryLabels.forEach((label) => label.remove());
      boundaryLabelsRef.current = [];
      boundaryEdges.forEach((edge) => edge.remove());
      boundaryEdgesRef.current = [];
      interiorHatches.forEach((hatch) => hatch.remove());
      interiorHatchesRef.current = [];
      safeRemoveFromMap(polygonLayer, map);
      layerRef.current = null;
      paneElement?.removeEventListener(
        usePointerEvents ? "pointerup" : "touchend",
        handleNativeAirspacePointer as EventListener,
        nativeAirspacePointerOptions,
      );
    };
  }, [map, features, selectableAirspaceIdSet, showBoundaryLabels]);

  useEffect(() => {
    const polygonLayer = layerRef.current;
    if (!map || !polygonLayer) return;

    const airspacePane = ensureAirportMapPane(map, AIRPORT_MAP_PANES.airspace);
    const paneElement = map.getPane(airspacePane);
    if (paneElement) paneElement.style.pointerEvents = visible ? "auto" : "none";

    if (skipNextVisibilityAnimationRef.current) {
      skipNextVisibilityAnimationRef.current = false;
      return;
    }

    animateAirspaceGroupOpacity({
      layerGroup: polygonLayer,
      labels: boundaryLabelsRef.current,
      edges: boundaryEdgesRef.current,
      hatches: interiorHatchesRef.current,
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
  edges,
  hatches,
  selectedAirspaceId,
  visible,
  animationFrameRef,
}: {
  layerGroup: L.GeoJSON;
  labels: SVGTextElement[];
  edges: SVGElement[];
  hatches: SVGElement[];
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
    applyAirspaceGroupOpacity(
      layerGroup,
      labels,
      edges,
      hatches,
      selectedAirspaceId,
      visible ? 1 : 0,
    );
    return;
  }

  const labelGroups = groupLabelsByLayerIndex(labels);
  const edgeGroups = groupLabelsByLayerIndex(edges);
  const hatchGroups = groupLabelsByLayerIndex(hatches);
  const startedAt = window.performance.now();
  const targetOpacity = visible ? 1 : 0;
  const animations = plan.steps.map((step) => {
    const layer = layers[step.index];
    return {
      layer,
      labels: labelGroups.get(step.index) || [],
      edges: edgeGroups.get(step.index) || [],
      hatches: hatchGroups.get(step.index) || [],
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
        animation.edges,
        animation.hatches,
        selectedAirspaceId,
        opacityScale,
      );
      if (progress < 1) complete = false;
    }

    if (complete) {
      applyAirspaceGroupOpacity(
        layerGroup,
        labels,
        edges,
        hatches,
        selectedAirspaceId,
        targetOpacity,
      );
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
  edges: SVGElement[],
  hatches: SVGElement[],
  selectedAirspaceId: string,
  opacityScale: number,
) {
  const labelGroups = groupLabelsByLayerIndex(labels);
  const edgeGroups = groupLabelsByLayerIndex(edges);
  const hatchGroups = groupLabelsByLayerIndex(hatches);
  getAirspaceFeatureLayers(layerGroup).forEach((layer, index) => {
    applyAirspaceFeatureOpacity(
      layer,
      labelGroups.get(index) || [],
      edgeGroups.get(index) || [],
      hatchGroups.get(index) || [],
      selectedAirspaceId,
      opacityScale,
    );
  });
}

function applyAirspaceFeatureOpacity(
  layer: any,
  labels: SVGTextElement[],
  edges: SVGElement[],
  hatches: SVGElement[],
  selectedAirspaceId: string,
  opacityScale: number,
) {
  if (typeof layer?.setStyle === "function") {
    layer.setStyle(resolveVisibleAirspaceStyle(layer.feature, selectedAirspaceId, opacityScale));
  }
  layer.__airspaceOpacityScale = opacityScale;
  labels.forEach((label) => setBoundaryLabelState(label, selectedAirspaceId, opacityScale));
  edges.forEach((edge) => setBoundaryEdgeState(edge, selectedAirspaceId, opacityScale));
  hatches.forEach((hatch) => setInteriorHatchState(hatch, selectedAirspaceId, opacityScale));
}

function getAirspaceFeatureLayers(layerGroup: L.GeoJSON) {
  const layers: any[] = [];
  layerGroup.eachLayer((layer: any) => layers.push(layer));
  return layers;
}

function resolveAirspaceLatLngFromClientPoint(
  map: L.Map,
  point?: { x: number; y: number } | null,
) {
  if (!point || typeof map.containerPointToLatLng !== "function") return null;
  const container = map.getContainer?.();
  const rect = container?.getBoundingClientRect?.();
  if (!rect) return null;
  return map.containerPointToLatLng(L.point(point.x - rect.left, point.y - rect.top));
}

function setAirspaceLayerDomMetadata(layer: any, airspaceId: string) {
  const path = typeof layer?.getElement === "function"
    ? layer.getElement()
    : null;
  if (!path || !airspaceId) return;
  path.dataset.airspaceFeatureId = airspaceId;
}

function groupLabelsByLayerIndex<T extends SVGElement>(elements: T[]) {
  const groups = new Map<number, T[]>();
  elements.forEach((element) => {
    const index = Number(element.dataset.airspaceLayerIndex);
    if (!Number.isInteger(index)) return;
    const group = groups.get(index) || [];
    group.push(element);
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

function ensureSvgDefs(svg: SVGSVGElement) {
  let defs = svg.querySelector("defs");
  if (!defs) {
    defs = document.createElementNS(SVG_NS, "defs");
    svg.prepend(defs);
  }
  return defs;
}

function attachBoundaryLabels(
  layerGroup: L.GeoJSON,
  selectedAirspaceId = "",
  opacityScale = 1,
  showBoundaryLabels = true,
): SVGTextElement[] {
  const labels: SVGTextElement[] = [];
  if (!showBoundaryLabels) return labels;

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

function attachBoundaryEdges(
  layerGroup: L.GeoJSON,
  selectedAirspaceId = "",
  opacityScale = 1,
): SVGElement[] {
  const edges: SVGElement[] = [];

  let layerIndex = 0;
  layerGroup.eachLayer((layer: any) => {
    const currentLayerIndex = layerIndex;
    layerIndex += 1;
    const path = typeof layer.getElement === "function"
      ? layer.getElement()
      : null;
    const svg = path?.ownerSVGElement;
    if (!path || !svg) return;

    const pathId = path.id || `airspace-boundary-${boundaryLabelSequence += 1}`;
    path.id = pathId;
    const clipId = `airspace-boundary-clip-${boundaryLabelSequence += 1}`;
    const defs = ensureSvgDefs(svg);
    const clipPath = document.createElementNS(SVG_NS, "clipPath");
    clipPath.id = clipId;
    const clipUse = document.createElementNS(SVG_NS, "use");
    clipUse.setAttribute("href", `#${pathId}`);
    clipUse.setAttributeNS(XLINK_NS, "xlink:href", `#${pathId}`);
    clipPath.appendChild(clipUse);
    defs.appendChild(clipPath);

    const edge = document.createElementNS(SVG_NS, "use");
    edge.dataset.airspaceLayerIndex = String(currentLayerIndex);
    edge.dataset.airspaceFeatureId = String(layer.feature?.properties?.id || "");
    edge.classList.add("airspace-boundary-edge");
    edge.setAttribute("href", `#${pathId}`);
    edge.setAttributeNS(XLINK_NS, "xlink:href", `#${pathId}`);
    edge.setAttribute("clip-path", `url(#${clipId})`);
    edge.setAttribute("fill", "none");
    edge.setAttribute("stroke", "var(--airspace-boundary-label)");
    edge.setAttribute("stroke-dasharray", "5 72");
    edge.setAttribute("stroke-linecap", "round");
    edge.setAttribute("stroke-linejoin", "round");
    edge.setAttribute("stroke-width", "8");
    edge.setAttribute("pointer-events", "none");
    setBoundaryEdgeState(edge, selectedAirspaceId, opacityScale);
    svg.appendChild(edge);
    edges.push(edge, clipPath);
  });

  return edges;
}

function attachInteriorHatches(
  layerGroup: L.GeoJSON,
  selectedAirspaceId = "",
  opacityScale = 1,
): SVGElement[] {
  const hatches: SVGElement[] = [];

  let layerIndex = 0;
  layerGroup.eachLayer((layer: any) => {
    const currentLayerIndex = layerIndex;
    layerIndex += 1;
    const pattern = resolveAirspaceInteriorPattern(layer.feature);
    if (!pattern.enabled) return;

    const path = typeof layer.getElement === "function"
      ? layer.getElement()
      : null;
    const svg = path?.ownerSVGElement;
    if (!path || !svg) return;

    const pathId = path.id || `airspace-boundary-${boundaryLabelSequence += 1}`;
    path.id = pathId;
    const clipId = `airspace-interior-hatch-clip-${boundaryLabelSequence += 1}`;
    const defs = ensureSvgDefs(svg);
    const clipPath = document.createElementNS(SVG_NS, "clipPath");
    clipPath.id = clipId;
    const clipUse = document.createElementNS(SVG_NS, "use");
    clipUse.setAttribute("href", `#${pathId}`);
    clipUse.setAttributeNS(XLINK_NS, "xlink:href", `#${pathId}`);
    clipPath.appendChild(clipUse);
    defs.appendChild(clipPath);

    // Dashed inner stroke along the boundary edge — extends ~10px inward
    const hatchEdge = document.createElementNS(SVG_NS, "use");
    hatchEdge.dataset.airspaceLayerIndex = String(currentLayerIndex);
    hatchEdge.dataset.airspaceFeatureId = String(layer.feature?.properties?.id || "");
    hatchEdge.dataset.airspacePatternOpacity = String(pattern.opacity);
    hatchEdge.classList.add("airspace-interior-hatch");
    hatchEdge.setAttribute("href", `#${pathId}`);
    hatchEdge.setAttributeNS(XLINK_NS, "xlink:href", `#${pathId}`);
    hatchEdge.setAttribute("clip-path", `url(#${clipId})`);
    hatchEdge.setAttribute("fill", "none");
    hatchEdge.setAttribute("stroke", pattern.color);
    hatchEdge.setAttribute("stroke-dasharray", "3 16");
    hatchEdge.setAttribute("stroke-linecap", "round");
    hatchEdge.setAttribute("stroke-width", "20");
    hatchEdge.setAttribute("pointer-events", "none");
    setInteriorHatchState(hatchEdge, selectedAirspaceId, opacityScale);
    svg.appendChild(hatchEdge);
    hatches.push(hatchEdge, clipPath);
  });

  return hatches;
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

function setBoundaryEdgeState(
  edge: SVGElement,
  selectedAirspaceId: string,
  opacityScale: number,
) {
  const isFocused =
    Boolean(selectedAirspaceId) &&
    edge.dataset.airspaceFeatureId === selectedAirspaceId;
  edge.classList.toggle("airspace-boundary-edge--focused", isFocused);
  edge.style.opacity = String((isFocused ? 0.78 : 0.46) * opacityScale);
}

function setInteriorHatchState(
  hatch: SVGElement,
  selectedAirspaceId: string,
  opacityScale: number,
) {
  const isFocused =
    Boolean(selectedAirspaceId) &&
    hatch.dataset.airspaceFeatureId === selectedAirspaceId;
  hatch.classList.toggle("airspace-interior-hatch--focused", isFocused);
  const baseOpacity = Number(hatch.dataset.airspacePatternOpacity) || 0;
  hatch.style.opacity = String((isFocused ? baseOpacity + 0.12 : baseOpacity) * opacityScale);
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
