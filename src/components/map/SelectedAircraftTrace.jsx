"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { useReducedMotion } from "motion/react";
import { useMapInstance } from "./MapContext.js";
import {
  AIRPORT_MAP_PANES,
  SELECTED_AIRCRAFT_TRACE_STYLE,
} from "../../config/airportMap.js";
import { ensureAirportMapPane } from "../../features/airport-map/mapPane.js";
import { computeTraceGeometry } from "../../features/aircraft-trace/traceGeometry.js";
import {
  getTraceLabelRevealDelay,
  getTraceRevealKey,
  shouldRenderCommittedTrace,
} from "../../features/aircraft-trace/traceRevealModel.js";
import { getAircraftIdentity } from "../../features/airport-context/airportContextUiModel.js";

const TRACE_GROWTH_DURATION_MS = 900;
const TRACE_LABEL_FADE_STAGGER_MS = 70;
const TRACE_LABEL_FADE_DURATION_MS = 360;
const TRACE_REVEAL_EASING = "cubic-bezier(0.25, 1, 0.5, 1)";
const TRACE_REVEAL_SETTLE_MS = 80;
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
  stop.setAttribute("stop-color", color);
  stop.setAttribute("stop-opacity", String(opacity));
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

export default function SelectedAircraftTrace({
  aircraft = null,
  tracePoints = [],
  theme = "dark",
}) {
  const map = useMapInstance();
  const layersRef = useRef([]);
  const gradientElsRef = useRef([]);
  const rafIdRef = useRef(null);
  const revealTimeoutRef = useRef(null);
  const completedRevealKeyRef = useRef("");
  const isAnimatingRef = useRef(false);
  const pendingTraceRef = useRef(null);
  const reducedMotion = useReducedMotion();
  const aircraftHex = aircraft ? getAircraftIdentity(aircraft) || null : null;

  // Local "committed" trace points decouple render from prop. While the
  // growth animation is running, live poll appends are held in
  // pendingTraceRef and applied once the animation settles. Keeping the
  // aircraft id on the committed payload prevents a one-frame stale trace
  // flash when the user switches selections quickly.
  const [committedTrace, setCommittedTrace] = useState({
    aircraftHex: aircraftHex || "",
    tracePoints: [],
  });

  // Sync prop → committed when not animating. When animating, stash the
  // aircraft id with the points so a later selection change can't flush
  // the previous aircraft's trace into the new selection.
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

  // Pre-computed render geometry. Pure function of committed trace points.
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

  useEffect(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = null;
    }
    removeLayers(layersRef.current, map);
    layersRef.current = [];
    removeElements(gradientElsRef.current);
    gradientElsRef.current = [];

    if (!map || !geometry) {
      if (!aircraftHex) completedRevealKeyRef.current = "";
      isAnimatingRef.current = false;
      return undefined;
    }

    const shouldAnimateReveal =
      traceRevealKey && completedRevealKeyRef.current !== traceRevealKey;

    const pane = ensureAirportMapPane(map, AIRPORT_MAP_PANES.trace);
    const traceStyle = getTraceStyle(theme);
    const layers = [];
    const gradientEls = [];
    const gradientBase = `${gradientIdPart(aircraftHex)}-${Date.now().toString(36)}`;

    const corePolyline = L.polyline(geometry.curve.slice().reverse(), {
      pane,
      color: traceStyle.lineColor,
      opacity: 1,
      weight: traceStyle.lineWeight,
      interactive: false,
      lineCap: "round",
      lineJoin: "round",
      className: "aircraft-trace aircraft-trace--core",
    }).addTo(map);
    layers.push(corePolyline);
    gradientEls.push(
      applyTraceGradient({
        map,
        polyline: corePolyline,
        curve: geometry.curve,
        gradientId: `aircraft-trace-core-${gradientBase}`,
        color: traceStyle.lineColor,
        tailOpacity: TRACE_CORE_TAIL_OPACITY,
        midOpacity: TRACE_CORE_MID_OPACITY,
        headOpacity: TRACE_CORE_HEAD_OPACITY,
      }),
    );

    const glowPolyline = L.polyline(geometry.curve.slice().reverse(), {
      pane,
      color: traceStyle.glowColor,
      opacity: 1,
      weight: traceStyle.glowWeight,
      interactive: false,
      lineCap: "round",
      lineJoin: "round",
      className: "aircraft-trace aircraft-trace--glow",
    }).addTo(map);
    layers.push(glowPolyline);
    gradientEls.push(
      applyTraceGradient({
        map,
        polyline: glowPolyline,
        curve: geometry.curve,
        gradientId: `aircraft-trace-glow-${gradientBase}`,
        color: traceStyle.glowColor,
        tailOpacity: 0,
        midOpacity: traceStyle.glowOpacity * 0.38,
        headOpacity: traceStyle.glowOpacity,
      }),
    );
    const revealPolylines = [corePolyline, glowPolyline];

    geometry.samplePoints.forEach((point, index) => {
      const emphasis = (index + 1) / geometry.samplePoints.length;
      layers.push(
        L.circleMarker([point.lat, point.lon], {
          pane,
          radius: traceStyle.pointRadius,
          stroke: false,
          fillColor: traceStyle.pointColor,
          fillOpacity: traceStyle.pointFillOpacity * (0.3 + emphasis * 0.7),
          interactive: false,
          className: "aircraft-trace-point",
        }).addTo(map),
      );
    });

    // Time / altitude labels for historic sample points. Built head→tail so
    // the head label can fade in first when we cascade the visibility flip.
    const labelMarkers = [];
    [...geometry.labelPoints].reverse().forEach((point, index) => {
      const time = formatTraceLabelTime(point.timestampMs);
      const altitude = formatTraceLabelAltitude(point);
      if (!time && !altitude) return;
      const isGround = altitude === "GND";
      const altRow = isGround
        ? `<span class="aircraft-trace-label__alt aircraft-trace-label__alt--ground">GND</span>`
        : altitude
          ? `<span class="aircraft-trace-label__alt">${altitude}<span class="aircraft-trace-label__alt-unit">FT</span></span>`
          : "";
      const marker = L.marker([point.lat, point.lon], {
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
        // Head-first iteration means index 0 is the freshest sample; give it
        // the highest stacking offset so overlapping older cards sit beneath.
        zIndexOffset: (geometry.labelPoints.length - index) * 10,
      }).addTo(map);
      const el = marker.getElement?.();
      if (el) {
        el.style.transitionDuration = reducedMotion
          ? "0ms"
          : `${TRACE_LABEL_FADE_DURATION_MS}ms`;
        el.style.transitionDelay = `${getTraceLabelRevealDelay({
          index,
          growthDurationMs: TRACE_GROWTH_DURATION_MS,
          staggerMs: TRACE_LABEL_FADE_STAGGER_MS,
          reducedMotion,
        })}ms`;
      }
      labelMarkers.push(marker);
      layers.push(marker);
    });

    layersRef.current = layers;
    gradientElsRef.current = gradientEls.filter(Boolean);

    // Helper: flip all label markers to visible.
    // - mode "instant": no transition (reduced-motion).
    // - mode "staggered": keep the per-marker transitionDelay set at marker
    //   creation so labels cascade in head-first during a fresh reveal.
    // - mode "uniform": override delay to 0 so poll-driven re-renders fade
    //   in together quickly instead of inheriting the long fresh-reveal
    //   stagger.
    const revealLabels = (mode = "uniform") => {
      if (mode === "instant") {
        labelMarkers.forEach((m) => {
          const el = m.getElement?.();
          if (!el) return;
          el.style.transition = "none";
          el.style.opacity = "1";
        });
        return;
      }

      if (mode === "uniform") {
        labelMarkers.forEach((m) => {
          const el = m.getElement?.();
          if (el) el.style.transitionDelay = "0ms";
        });
      }

      // Defer one frame so the browser sees the CSS opacity:0 baseline
      // before the inline opacity:1 lands. Without this, freshly-mounted
      // labels can skip the transition because the browser hasn't
      // computed a baseline opacity to interpolate from.
      requestAnimationFrame(() => {
        labelMarkers.forEach((m) => {
          const el = m.getElement?.();
          if (!el) return;
          el.style.opacity = "1";
        });
      });
    };
    const flushPendingTrace = () => {
      if (pendingTraceRef.current?.aircraftHex !== aircraftHex) return;
      const pending = pendingTraceRef.current;
      pendingTraceRef.current = null;
      setCommittedTrace(pending);
    };
    const finishReveal = (paths = []) => {
      rafIdRef.current = null;
      revealTimeoutRef.current = null;
      isAnimatingRef.current = false;
      paths.forEach((path) => {
        path.style.transition = "";
        path.style.opacity = "";
      });
      completedRevealKeyRef.current = traceRevealKey;
      flushPendingTrace();
    };

    if (!shouldAnimateReveal || reducedMotion) {
      // Poll-driven re-renders (same aircraft) still fade the labels in so
      // they don't pop every 3s. reducedMotion users get the instant flip.
      revealLabels(reducedMotion ? "instant" : "uniform");
      if (traceRevealKey) completedRevealKeyRef.current = traceRevealKey;
      return () => {
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        removeLayers(layersRef.current, map);
        layersRef.current = [];
        removeElements(gradientElsRef.current);
        gradientElsRef.current = [];
      };
    }

    // Resolve the SVG <path> elements for the core + glow polylines. Any
    // path that isn't ready (canvas renderer, unmounted) just renders at
    // full state — same fallback as before, no animation.
    const revealPaths = revealPolylines
      .map((polyline) => polyline.getElement?.())
      .filter(Boolean);

    if (revealPaths.length === 0) {
      revealLabels("instant");
      completedRevealKeyRef.current = traceRevealKey;
      flushPendingTrace();
      return () => {
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        removeLayers(layersRef.current, map);
        layersRef.current = [];
        removeElements(gradientElsRef.current);
        gradientElsRef.current = [];
      };
    }

    isAnimatingRef.current = true;

    // Stage: paths at opacity 0 with transitions off so the next paint
    // commits the hidden state without interpolating from the implicit
    // default of 1.
    revealPaths.forEach((path) => {
      path.style.transition = "none";
      path.style.opacity = "0";
    });

    // One rAF later, flip transition on and opacity to 1 — the browser
    // sees the committed 0 state, schedules the GPU transition, and runs
    // the fade natively. No per-frame JS, no stroke-dasharray gymnastics.
    rafIdRef.current = requestAnimationFrame(() => {
      revealPaths.forEach((path) => {
        path.style.transition = `opacity ${TRACE_GROWTH_DURATION_MS}ms ${TRACE_REVEAL_EASING}`;
        path.style.opacity = "1";
      });
      // Labels fade in mid-trace-fade so the text reads as attached to
      // the same reveal instead of arriving as a separate overlay.
      revealLabels("staggered");

      revealTimeoutRef.current = setTimeout(
        () => finishReveal(revealPaths),
        TRACE_GROWTH_DURATION_MS + TRACE_REVEAL_SETTLE_MS,
      );
    });

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (revealTimeoutRef.current) {
        clearTimeout(revealTimeoutRef.current);
        revealTimeoutRef.current = null;
      }
      // Restore inline styles if we tore down mid-fade — otherwise stale
      // opacity:0 / transition values can carry over to the next render.
      revealPaths.forEach((path) => {
        path.style.transition = "";
        path.style.opacity = "";
      });
      isAnimatingRef.current = false;
      removeLayers(layersRef.current, map);
      layersRef.current = [];
      removeElements(gradientElsRef.current);
      gradientElsRef.current = [];
    };
  }, [map, theme, geometry, aircraftHex, reducedMotion, traceRevealKey]);

  return null;
}
