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
        tailOpacity: 0,
        midOpacity: traceStyle.lineOpacity * 0.34,
        headOpacity: traceStyle.lineOpacity,
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
          iconSize: [76, 30],
          iconAnchor: [38, 38],
        }),
        interactive: false,
        keyboard: false,
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

    // Helper: flip all label markers to visible. Used for both the
    // immediate (non-fresh / reduced-motion) path and the deferred
    // post-animation cascade.
    const revealLabels = (instant) => {
      labelMarkers.forEach((m) => {
        const el = m.getElement?.();
        if (!el) return;
        if (instant) {
          el.style.transition = "none";
          el.style.opacity = "1";
        } else {
          el.style.opacity = "1";
        }
      });
    };
    const flushPendingTrace = () => {
      if (pendingTraceRef.current?.aircraftHex !== aircraftHex) return;
      const pending = pendingTraceRef.current;
      pendingTraceRef.current = null;
      setCommittedTrace(pending);
    };
    const finishReveal = (segments = []) => {
      rafIdRef.current = null;
      revealTimeoutRef.current = null;
      isAnimatingRef.current = false;
      segments.forEach((seg) => {
        seg.path.style.transition = "";
        seg.path.style.strokeDasharray = "";
        seg.path.style.strokeDashoffset = "";
      });
      completedRevealKeyRef.current = traceRevealKey;
      flushPendingTrace();
    };

    if (!shouldAnimateReveal || reducedMotion) {
      revealLabels(true);
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

    // Synchronously hide all reveal paths via visibility:hidden so the
    // user doesn't see a flash of the full trace during the one-frame
    // defer below. visibility (vs opacity / display) doesn't trigger
    // reflow and is cheap to flip.
    const initialPaths = revealPolylines
      .map((polyline) => polyline.getElement?.())
      .filter(Boolean);
    initialPaths.forEach((path) => {
      path.style.visibility = "hidden";
    });

    isAnimatingRef.current = true;

    // Defer the actual dash setup + animation start by one rAF tick.
    // Leaflet's SVG renderer flushes path geometry on the next animation
    // frame after addTo; calling getTotalLength immediately can return 0
    // for a brief window (the symptom: animation block is reached but
    // every segment is filtered out and the polylines just appear at
    // full state). One rAF gets us past that.
    rafIdRef.current = requestAnimationFrame(() => {
      const segments = revealPolylines
        .map((polyline) => {
          const path = polyline.getElement?.();
          const length = path?.getTotalLength?.();
          if (!path || !Number.isFinite(length) || length <= 0) return null;
          return { path, pathLength: length };
        })
        .filter(Boolean);

      // Re-show paths (we'll control visibility via dashoffset from here).
      initialPaths.forEach((path) => {
        path.style.visibility = "";
      });

      if (segments.length === 0) {
        rafIdRef.current = null;
        isAnimatingRef.current = false;
        revealLabels(true);
        completedRevealKeyRef.current = traceRevealKey;
        flushPendingTrace();
        return;
      }

      // Stage: full reveal paths hidden via full dashoffset. Let CSS own
      // interpolation so the browser can schedule the paint without a JS
      // requestAnimationFrame loop writing strokeDashoffset every frame.
      segments.forEach((seg) => {
        seg.path.style.strokeDasharray = `${seg.pathLength}`;
        seg.path.style.strokeDashoffset = `${seg.pathLength}`;
        seg.path.style.transition = `stroke-dashoffset ${TRACE_GROWTH_DURATION_MS}ms ${TRACE_REVEAL_EASING}`;
      });
      // Labels fade in one-by-one while the trace is still drawing, so the
      // text reads as attached to the same reveal instead of arriving as a
      // separate overlay after the line has finished.
      revealLabels(false);

      rafIdRef.current = requestAnimationFrame(() => {
        segments.forEach((seg) => {
          seg.path.style.strokeDashoffset = "0";
        });
        revealTimeoutRef.current = setTimeout(
          () => finishReveal(segments),
          TRACE_GROWTH_DURATION_MS + TRACE_REVEAL_SETTLE_MS,
        );
      });
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
      // Restore visibility in case we tore down mid-defer before the rAF
      // callback got to re-show.
      initialPaths.forEach((path) => {
        path.style.visibility = "";
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
