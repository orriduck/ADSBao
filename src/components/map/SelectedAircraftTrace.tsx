"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { usePrefersReducedMotion } from "@/components/effects/usePrefersReducedMotion";
import { useMapInstance } from "./MapContext";
import {
  AIRPORT_MAP_PANES,
  SELECTED_AIRCRAFT_TRACE_STYLE,
} from "../../config/airportMap";
import { ensureAirportMapPane } from "../../features/airport/map/mapPane";
import { computeTraceGeometry } from "../../features/aircraft/trace/traceGeometry";
import {
  getTraceLabelRevealDelay,
  getTraceRevealKey,
  shouldRenderCommittedTrace,
} from "../../features/aircraft/trace/traceRevealModel";
import { useSelectedAircraftTrace } from "../aircraft/trace/SelectedAircraftTraceContext";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { AIRCRAFT_COLORS } from "../../constants/aircraft";
import { ARRIVAL, DEPARTURE } from "../../utils/aircraftMovement";

const TRACE_LABEL_FADE_STAGGER_MS = 70;
const TRACE_LABEL_FADE_DURATION_MS = 360;
const SVG_NS = "http://www.w3.org/2000/svg";

// Core trace gradient opacity envelope. Tail floor keeps the oldest segment
// visible (20%) rather than fading completely to invisible; head ceiling
// stays just under fully opaque (95%) so the live aircraft marker still
// reads as the brightest thing on the trail.
const TRACE_CORE_TAIL_OPACITY = 0.2;
const TRACE_CORE_HEAD_OPACITY = 0.95;
const TRACE_CORE_MID_OPACITY =
  TRACE_CORE_TAIL_OPACITY +
  (TRACE_CORE_HEAD_OPACITY - TRACE_CORE_TAIL_OPACITY) * 0.34;
const TRACE_CONNECTOR_OPACITY = 0.34;

function formatTraceLabelTime(timestampMs) {
  if (!Number.isFinite(timestampMs)) return "";
  const d = new Date(timestampMs);
  return d.toLocaleTimeString([], {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTraceLabelAltitude(point) {
  if (!point) return "";
  if (point.onGround || point.altitude === 0) return "GND";
  const altitude = Number(point.altitude);
  if (!Number.isFinite(altitude)) return "";
  return Math.round(altitude).toLocaleString();
}

const getTraceStyle = (theme) =>
  theme === "light"
    ? SELECTED_AIRCRAFT_TRACE_STYLE.light
    : SELECTED_AIRCRAFT_TRACE_STYLE.dark;

function removeLayers(layers = [], map) {
  layers.forEach((layer) => {
    if (layer && map?.hasLayer(layer)) layer.removeFrom(map);
  });
}

function removeElements(elements = []) {
  elements.forEach((element) => element?.remove?.());
}

function isLeafletMapReady(map) {
  return Boolean(map?._container && map?._mapPane && map?.getPane?.("overlayPane"));
}

function addLayerToReadyMap(layer, map, layers) {
  if (!layer || !isLeafletMapReady(map)) return null;
  try {
    layer.addTo(map);
    layers.push(layer);
    return layer;
  } catch {
    layer.remove?.();
    return null;
  }
}

function gradientIdPart(value) {
  return String(value || "trace").replace(/[^a-zA-Z0-9_-]/g, "-");
}

function ensureSvgDefs(svg) {
  let defs = svg.querySelector("defs");
  if (!defs) {
    defs = document.createElementNS(SVG_NS, "defs");
    svg.prepend(defs);
  }
  return defs;
}

function addGradientStop(gradient, offset, color, opacity) {
  const stop = document.createElementNS(SVG_NS, "stop");
  stop.setAttribute("offset", offset);
  // Inline style instead of attribute so CSS variables work — the
  // aircraft accent colors live in --aircraft-departure / --aircraft-
  // arrival and the gradient needs to resolve them at render time.
  stop.style.stopColor = color;
  stop.style.stopOpacity = String(opacity);
  gradient.append(stop);
}

function applyTraceGradient({
  map,
  polyline,
  curve,
  gradientId,
  color,
  tailOpacity,
  midOpacity,
  headOpacity,
}) {
  const path = polyline.getElement?.();
  const svg = path?.ownerSVGElement;
  const tail = curve[0];
  const head = curve.at(-1);
  if (!path || !svg || !tail || !head) return null;

  const tailPoint = map.latLngToLayerPoint(L.latLng(tail[0], tail[1]));
  const headPoint = map.latLngToLayerPoint(L.latLng(head[0], head[1]));
  const gradient = document.createElementNS(SVG_NS, "linearGradient");
  gradient.setAttribute("id", gradientId);
  gradient.setAttribute("gradientUnits", "userSpaceOnUse");
  gradient.setAttribute("x1", String(tailPoint.x));
  gradient.setAttribute("y1", String(tailPoint.y));
  gradient.setAttribute("x2", String(headPoint.x));
  gradient.setAttribute("y2", String(headPoint.y));
  addGradientStop(gradient, "0%", color, tailOpacity);
  addGradientStop(gradient, "52%", color, midOpacity);
  addGradientStop(gradient, "100%", color, headOpacity);
  ensureSvgDefs(svg).append(gradient);

  path.setAttribute("stroke", `url(#${gradientId})`);
  return gradient;
}

// Stable signature of the label set: same string ⇒ same set of historic
// sample points (positions and altitudes), so the label-effect dep stays
// referentially equal across polls and the labels don't tear down / rebuild.
function makeLabelKey(labelPoints) {
  if (!Array.isArray(labelPoints) || labelPoints.length === 0) return "";
  return labelPoints
    .map(
      (p) =>
        `${Number(p?.timestampMs) || 0}|${Math.round(p?.altitude || 0)}|${p?.onGround ? 1 : 0}`,
    )
    .join("·");
}

// Default export reads the trace context and renders one or two trace
// instances (e.g. focal + selected on the flight detail page). Each
// SingleAircraftTrace manages its own animation/layer state, so two
// instances coexist cleanly without sharing refs.
export default function SelectedAircraftTrace({ theme = "dark" }) {
  const ctx = useSelectedAircraftTrace();
  const traces = Array.isArray(ctx?.traces) && ctx.traces.length > 0
    ? ctx.traces
    : [
        {
          aircraftHex: ctx?.aircraftHex,
          movement: ctx?.movement,
          tracePoints: ctx?.tracePoints || [],
        },
      ];

  return (
    <>
      {traces.map((trace) =>
        trace?.aircraftHex ? (
          <SingleAircraftTrace
            key={trace.aircraftHex}
            theme={theme}
            aircraftHex={trace.aircraftHex}
            movement={trace.movement}
            tracePoints={trace.tracePoints}
            opacity={typeof trace.opacity === "number" ? trace.opacity : 1}
          />
        ) : null,
      )}
    </>
  );
}

function SingleAircraftTrace({
  theme = "dark",
  aircraftHex,
  movement,
  tracePoints,
  opacity = 1,
}) {
  const { t } = useI18n();
  const map = useMapInstance();
  const lineLayersRef = useRef([]);
  const labelMarkersRef = useRef([]);
  const gradientElsRef = useRef([]);
  const rafIdRef = useRef(null);
  const revealTimeoutRef = useRef(null);
  const labelRafIdRef = useRef(null);
  const completedRevealKeyRef = useRef("");
  const isAnimatingRef = useRef(false);
  const pendingTraceRef = useRef(null);
  const reducedMotion = usePrefersReducedMotion();

  // Local "committed" trace points decouple render from context. While the
  // growth fade is running, live poll appends are held in pendingTraceRef
  // and applied once the animation settles. The aircraft id rides along on
  // the payload so a fast selection change can't flush the previous
  // aircraft's data into the new selection.
  const [committedTrace, setCommittedTrace] = useState({
    aircraftHex: aircraftHex || "",
    tracePoints: [],
  });

  useEffect(() => {
    const nextTrace = {
      aircraftHex: aircraftHex || "",
      tracePoints,
    };
    if (!aircraftHex) {
      pendingTraceRef.current = null;
      setCommittedTrace(nextTrace);
      return;
    }
    if (isAnimatingRef.current) {
      pendingTraceRef.current = nextTrace;
      return;
    }
    pendingTraceRef.current = null;
    setCommittedTrace(nextTrace);
  }, [aircraftHex, tracePoints]);

  const geometry = useMemo(() => {
    if (
      !shouldRenderCommittedTrace({
        aircraftHex,
        committedAircraftHex: committedTrace.aircraftHex,
        tracePoints: committedTrace.tracePoints,
      })
    ) {
      return null;
    }
    return computeTraceGeometry({
      tracePoints: committedTrace.tracePoints,
      maxRenderPoints: SELECTED_AIRCRAFT_TRACE_STYLE.maxRenderPoints,
    });
  }, [aircraftHex, committedTrace.aircraftHex, committedTrace.tracePoints]);

  const traceRevealKey = useMemo(
    () =>
      getTraceRevealKey({
        aircraftHex,
        tracePoints: committedTrace.tracePoints,
      }),
    [aircraftHex, committedTrace.tracePoints],
  );

  // Accent color tracks the aircraft marker's color when its movement
  // is recognized — trail visually pairs with its plane. Falls back to
  // null (theme default) when the aircraft hasn't been classified.
  const accentColor = useMemo(() => {
    if (movement === DEPARTURE) return AIRCRAFT_COLORS.departure;
    if (movement === ARRIVAL) return AIRCRAFT_COLORS.arrival;
    return null;
  }, [movement]);

  // labelKey is a string derived from labelPoints. As long as the historic
  // sample set is stable (same timestamps + altitudes), the key is the
  // same string and the label-effect dep doesn't change — labels stay
  // mounted across polls instead of re-rendering every 3 seconds.
  const labelKey = useMemo(
    () => (geometry ? makeLabelKey(geometry.labelPoints) : ""),
    [geometry],
  );
  // Latest labelPoints stay in a ref so the label effect can read them
  // without subscribing to geometry's reference. geometry is a fresh
  // object every poll (because the curve extends with the live head),
  // and including it in deps would re-fire the label effect on every
  // poll even though the label set is stable.
  const labelPointsRef = useRef(geometry?.labelPoints || []);
  labelPointsRef.current = geometry?.labelPoints || [];

  // -------------------------------------------------------------------
  // Effect 1: line + glow + sample dots. Re-runs on every geometry change
  // (poll-driven head extensions are visible here as the curve extends).
  // Trace paths now mount settled. The Endfield-style loading and row
  // replacement effects carry motion elsewhere, so the map trace avoids the
  // old long opacity animation on production hot paths.
  // -------------------------------------------------------------------
  useEffect(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = null;
    }
    removeLayers(lineLayersRef.current, map);
    lineLayersRef.current = [];
    removeElements(gradientElsRef.current);
    gradientElsRef.current = [];

    if (!map || !geometry || !isLeafletMapReady(map)) {
      if (!aircraftHex) completedRevealKeyRef.current = "";
      isAnimatingRef.current = false;
      return undefined;
    }

    const pane = ensureAirportMapPane(map, AIRPORT_MAP_PANES.trace);
    const traceStyle = getTraceStyle(theme);
    const lineColor = accentColor || traceStyle.lineColor;
    const glowColor = accentColor || traceStyle.glowColor;
    const dotColor = accentColor || traceStyle.pointColor;
    const layers = [];
    const gradientEls = [];
    const gradientBase = `${gradientIdPart(aircraftHex)}-${Date.now().toString(36)}`;

    geometry.connectors.forEach((connector) => {
      addLayerToReadyMap(
        L.polyline(connector.curve.slice().reverse(), {
          pane,
          color: lineColor,
          opacity: TRACE_CONNECTOR_OPACITY * opacity,
          weight: Math.max(1, traceStyle.lineWeight - 1),
          interactive: false,
          lineCap: "round",
          lineJoin: "round",
          dashArray: "5 9",
          className: "aircraft-trace aircraft-trace--connector",
        }),
        map,
        layers,
      );
    });

    geometry.segments.forEach((segment) => {
      const segmentId = gradientIdPart(segment.id);
      const corePolyline = addLayerToReadyMap(
        L.polyline(segment.curve.slice().reverse(), {
          pane,
          color: lineColor,
          opacity: 1,
          weight: traceStyle.lineWeight,
          interactive: false,
          lineCap: "round",
          lineJoin: "round",
          className: "aircraft-trace aircraft-trace--core",
        }),
        map,
        layers,
      );
      if (corePolyline) {
        gradientEls.push(
          applyTraceGradient({
            map,
            polyline: corePolyline,
            curve: segment.curve,
            gradientId: `aircraft-trace-core-${gradientBase}-${segmentId}`,
            color: lineColor,
            tailOpacity: TRACE_CORE_TAIL_OPACITY * opacity,
            midOpacity: TRACE_CORE_MID_OPACITY * opacity,
            headOpacity: TRACE_CORE_HEAD_OPACITY * opacity,
          }),
        );
      }

      const glowPolyline = addLayerToReadyMap(
        L.polyline(segment.curve.slice().reverse(), {
          pane,
          color: glowColor,
          opacity: 1,
          weight: traceStyle.glowWeight,
          interactive: false,
          lineCap: "round",
          lineJoin: "round",
          className: "aircraft-trace aircraft-trace--glow",
        }),
        map,
        layers,
      );
      if (glowPolyline) {
        gradientEls.push(
          applyTraceGradient({
            map,
            polyline: glowPolyline,
            curve: segment.curve,
            gradientId: `aircraft-trace-glow-${gradientBase}-${segmentId}`,
            color: glowColor,
            tailOpacity: 0,
            midOpacity: traceStyle.glowOpacity * 0.38 * opacity,
            headOpacity: traceStyle.glowOpacity * opacity,
          }),
        );
      }
    });

    geometry.samplePoints.forEach((point, index) => {
      const emphasis = (index + 1) / geometry.samplePoints.length;
      addLayerToReadyMap(
        L.circleMarker([point.lat, point.lon], {
          pane,
          radius: traceStyle.pointRadius,
          stroke: false,
          fillColor: dotColor,
          fillOpacity:
            traceStyle.pointFillOpacity * (0.3 + emphasis * 0.7) * opacity,
          interactive: false,
          className: "aircraft-trace-point",
        }),
        map,
        layers,
      );
    });

    lineLayersRef.current = layers;
    gradientElsRef.current = gradientEls.filter(Boolean);
    if (traceRevealKey) completedRevealKeyRef.current = traceRevealKey;
    pendingTraceRef.current = null;
    isAnimatingRef.current = false;

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (revealTimeoutRef.current) {
        clearTimeout(revealTimeoutRef.current);
        revealTimeoutRef.current = null;
      }
      isAnimatingRef.current = false;
      removeLayers(lineLayersRef.current, map);
      lineLayersRef.current = [];
      removeElements(gradientElsRef.current);
      gradientElsRef.current = [];
    };
  }, [
    map,
    theme,
    geometry,
    aircraftHex,
    accentColor,
    traceRevealKey,
    opacity,
  ]);

  // -------------------------------------------------------------------
  // Effect 2: historic time/altitude labels. Keyed by labelKey so it only
  // re-runs when the sample SET changes (sampling stride shifts, aircraft
  // changes). Same-aircraft polls leave the label markers mounted —
  // they stay at full opacity without a re-fade.
  // -------------------------------------------------------------------
  useEffect(() => {
    if (labelRafIdRef.current) {
      cancelAnimationFrame(labelRafIdRef.current);
      labelRafIdRef.current = null;
    }
    removeLayers(labelMarkersRef.current, map);
    labelMarkersRef.current = [];

    if (!map || !labelKey || !isLeafletMapReady(map)) return undefined;
    const labelPoints = labelPointsRef.current;
    if (!Array.isArray(labelPoints) || labelPoints.length === 0) {
      return undefined;
    }

    const pane = ensureAirportMapPane(map, AIRPORT_MAP_PANES.trace);
    const labelMarkers = [];
    [...labelPoints].reverse().forEach((point, index) => {
      const time = formatTraceLabelTime(point.timestampMs);
      const altitude = formatTraceLabelAltitude(point);
      if (!time && !altitude) return;
      const isGround = altitude === "GND";
      const altRow = isGround
        ? `<span class="aircraft-trace-label__alt aircraft-trace-label__alt--ground">${t("aircraft.gnd")}</span>`
        : altitude
          ? `<span class="aircraft-trace-label__alt">${altitude}<span class="aircraft-trace-label__alt-unit">FT</span></span>`
          : "";
      const marker = addLayerToReadyMap(
        L.marker([point.lat, point.lon], {
          pane,
          icon: L.divIcon({
            className: "aircraft-trace-label",
            html: `
              <span class="aircraft-trace-label__time">${time}</span>
              ${altRow}
            `,
            iconSize: [56, 24],
            iconAnchor: [-4, 28],
          }),
          interactive: false,
          keyboard: false,
          zIndexOffset: (labelPoints.length - index) * 10,
        }),
        map,
        labelMarkers,
      );
      if (!marker) return;
      const el = marker.getElement?.();
      if (el) {
        el.style.transitionDuration = reducedMotion
          ? "0ms"
          : `${TRACE_LABEL_FADE_DURATION_MS}ms`;
        // Stagger only meaningful for the fresh reveal; recomputed below.
        el.style.transitionDelay = `${getTraceLabelRevealDelay({
          index,
          growthDurationMs: 0,
          staggerMs: TRACE_LABEL_FADE_STAGGER_MS,
          reducedMotion,
        })}ms`;
      }
    });
    labelMarkersRef.current = labelMarkers;

    if (reducedMotion) {
      labelMarkers.forEach((m) => {
        const el = m.getElement?.();
        if (!el) return;
        el.style.transition = "none";
        el.style.opacity = String(opacity);
      });
      return () => {
        if (labelRafIdRef.current) {
          cancelAnimationFrame(labelRafIdRef.current);
          labelRafIdRef.current = null;
        }
        removeLayers(labelMarkersRef.current, map);
        labelMarkersRef.current = [];
      };
    }

    // If the line is currently animating, this is a fresh reveal — keep
    // the staggered per-marker delays so labels cascade in head-first
    // mid-line-fade. Otherwise (label set just shifted while line is
    // settled), override delays to 0 so the new labels fade in together.
    const fresh = isAnimatingRef.current;
    if (!fresh) {
      labelMarkers.forEach((m) => {
        const el = m.getElement?.();
        if (el) el.style.transitionDelay = "0ms";
      });
    }

    labelRafIdRef.current = requestAnimationFrame(() => {
      labelMarkers.forEach((m) => {
        const el = m.getElement?.();
        if (!el) return;
        el.style.opacity = String(opacity);
      });
    });

    return () => {
      if (labelRafIdRef.current) {
        cancelAnimationFrame(labelRafIdRef.current);
        labelRafIdRef.current = null;
      }
      removeLayers(labelMarkersRef.current, map);
      labelMarkersRef.current = [];
    };
    // labelPoints is intentionally accessed via ref so we don't subscribe
    // to geometry's per-poll reference churn. labelKey changes iff the
    // sample set actually shifts, at which point the ref's value is the
    // new set.
  }, [map, labelKey, reducedMotion, opacity, t]);

  return null;
}
