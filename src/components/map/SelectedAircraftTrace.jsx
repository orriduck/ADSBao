"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { useReducedMotion } from "motion/react";
import { useMapInstance } from "./MapContext.js";
import {
  AIRPORT_MAP_PANES,
  SELECTED_AIRCRAFT_TRACE_STYLE,
} from "../../config/airportMap.js";
import { ensureAirportMapPane } from "../../features/airport-map/mapPane.js";
import {
  buildAircraftTraceCurve,
  downsampleTracePoints,
} from "../../features/aircraft-trace/aircraftTraceModel.js";
import { getAircraftIdentity } from "../../features/airport-context/airportContextUiModel.js";

const TRACE_GROWTH_DURATION_MS = 900;

const getTraceStyle = (theme) =>
  theme === "light"
    ? SELECTED_AIRCRAFT_TRACE_STYLE.light
    : SELECTED_AIRCRAFT_TRACE_STYLE.dark;

function removeLayers(layers = [], map) {
  layers.forEach((layer) => {
    if (layer && map?.hasLayer(layer)) layer.removeFrom(map);
  });
}

function sliceCurve(coords, startIndex, endIndex) {
  if (endIndex - startIndex < 1) return [];
  return coords.slice(startIndex, endIndex + 1);
}

function buildTraceBands(coords) {
  const bandCount = SELECTED_AIRCRAFT_TRACE_STYLE.bandCount;
  const segmentCount = Math.max(0, coords.length - 1);
  if (segmentCount < 1) return [];

  return Array.from({ length: bandCount }, (_, bandIndex) => {
    const startIndex = Math.floor((segmentCount * bandIndex) / bandCount);
    const endIndex = Math.floor((segmentCount * (bandIndex + 1)) / bandCount);
    return {
      index: bandIndex,
      startIndex,
      endIndex,
      coords: sliceCurve(coords, startIndex, endIndex),
      emphasis: bandIndex / Math.max(1, bandCount - 1),
    };
  }).filter((band) => band.coords.length >= 2);
}

function buildTraceSamplePoints(points) {
  const usable = points.slice(0, -1);
  if (usable.length <= 8) return usable;

  const stride = Math.max(1, Math.floor(usable.length / 8));
  return usable.filter((_, index) => index % stride === 0);
}

function buildHeadSweepCoords(coords) {
  const tailRatio = SELECTED_AIRCRAFT_TRACE_STYLE.sweepTailRatio;
  const startIndex = Math.max(
    0,
    Math.floor(coords.length - Math.max(8, coords.length * tailRatio)),
  );
  return coords.slice(startIndex);
}

// Cubic ease-in-out — slow start that accelerates through the middle then
// settles into the tail. Reads as "the trail is being unfurled" rather than
// "snap then crawl", which is what plain ease-out produced for this geometry.
const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export default function SelectedAircraftTrace({
  aircraft = null,
  tracePoints = [],
  theme = "dark",
}) {
  const map = useMapInstance();
  const layersRef = useRef([]);
  const rafIdRef = useRef(null);
  const previousHexRef = useRef(null);
  const reducedMotion = useReducedMotion();

  const traceData = useMemo(() => {
    const sourcePoints =
      tracePoints.length > 1
        ? tracePoints
        : (aircraft?.traceHistory || []).map((point) => ({
            ...point,
            timestampMs: point?.timestampMs ?? point?.time ?? null,
          }));
    const sampled = downsampleTracePoints(
      sourcePoints,
      SELECTED_AIRCRAFT_TRACE_STYLE.maxRenderPoints,
    );
    const curve = buildAircraftTraceCurve(sampled, 5);

    return {
      curve,
      bands: buildTraceBands(curve),
      samplePoints: buildTraceSamplePoints(sampled),
      sweepCoords: buildHeadSweepCoords(curve),
    };
  }, [aircraft, tracePoints]);

  useEffect(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    removeLayers(layersRef.current, map);
    layersRef.current = [];

    if (!map || traceData.curve.length < 2) {
      previousHexRef.current = null;
      return undefined;
    }

    // aircraft is explicitly null after a deselect, and getAircraftIdentity's
    // default param `= {}` doesn't fire on null. Guard explicitly.
    const currentHex = aircraft ? getAircraftIdentity(aircraft) || null : null;
    const isFreshSelection = previousHexRef.current !== currentHex;
    previousHexRef.current = currentHex;

    const pane = ensureAirportMapPane(map, AIRPORT_MAP_PANES.trace);
    const traceStyle = getTraceStyle(theme);
    const layers = [];
    // Reveal-eligible polylines (bands + glow). Each carries its
    // [startIndex, endIndex] within traceData.curve so the animation can
    // drive every polyline from a single back-cursor in curve-index space —
    // they all show the same visible curve range at any moment, which is
    // what makes a 7-band trail look like one unfurling line instead of
    // staggered segments.
    const reveal = [];

    traceData.bands.forEach((band) => {
      const opacity = 0.08 + band.emphasis * traceStyle.lineOpacity;
      const weight = traceStyle.lineWeight * (0.82 + band.emphasis * 0.28);
      const polyline = L.polyline(band.coords.slice().reverse(), {
        pane,
        color: traceStyle.lineColor,
        opacity,
        weight,
        interactive: false,
        lineCap: "round",
        lineJoin: "round",
        className: "aircraft-trace aircraft-trace--band",
      }).addTo(map);
      layers.push(polyline);
      reveal.push({
        polyline,
        startIndex: band.startIndex,
        endIndex: band.endIndex,
      });
    });

    const headIndex = Math.max(1, traceData.curve.length - 1);
    const glowPolyline = L.polyline(traceData.curve.slice().reverse(), {
      pane,
      color: traceStyle.glowColor,
      opacity: traceStyle.glowOpacity,
      weight: traceStyle.glowWeight,
      interactive: false,
      lineCap: "round",
      lineJoin: "round",
      className: "aircraft-trace aircraft-trace--glow",
    }).addTo(map);
    layers.push(glowPolyline);
    reveal.push({
      polyline: glowPolyline,
      startIndex: 0,
      endIndex: headIndex,
    });

    if (traceData.sweepCoords.length >= 2) {
      layers.push(
        L.polyline(traceData.sweepCoords, {
          pane,
          color: traceStyle.sweepColor,
          opacity: traceStyle.sweepOpacity,
          weight: traceStyle.sweepWeight,
          interactive: false,
          lineCap: "round",
          lineJoin: "round",
          dashArray: "12 18",
          className: "aircraft-trace aircraft-trace--sweep",
        }).addTo(map),
      );
    }

    traceData.samplePoints.forEach((point, index) => {
      const emphasis = (index + 1) / traceData.samplePoints.length;
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

    layersRef.current = layers;

    // Only grow the trace from origin → head on a fresh selection. On
    // poll-driven re-renders for the same aircraft we want the new tail
    // points to extend in place without replaying the whole sweep.
    if (!isFreshSelection || reducedMotion) {
      return () => {
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        removeLayers(layersRef.current, map);
        layersRef.current = [];
      };
    }

    // Resolve each reveal polyline's SVG <path> element and its rendered
    // length. Skip any whose path or length isn't ready (canvas renderer,
    // unmounted layer) — that polyline just appears instantly.
    const segments = reveal
      .map((entry) => {
        const path = entry.polyline.getElement?.();
        const length = path?.getTotalLength?.();
        if (!path || !Number.isFinite(length) || length <= 0) return null;
        return { ...entry, path, pathLength: length };
      })
      .filter(Boolean);

    if (segments.length === 0) {
      return () => {
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        removeLayers(layersRef.current, map);
        layersRef.current = [];
      };
    }

    // Initial frame: every path hidden by setting dashoffset to its own
    // pathLength. dasharray = pathLength so the dash + gap together cover
    // 2× the path and we can interpolate the offset between [0, pathLength].
    segments.forEach((seg) => {
      seg.path.style.strokeDasharray = `${seg.pathLength}`;
      seg.path.style.strokeDashoffset = `${seg.pathLength}`;
    });

    const startTime =
      typeof performance !== "undefined" ? performance.now() : Date.now();

    // Single back-cursor in curve-index space drives every polyline. The
    // cursor starts at headIndex (no reveal) and walks toward 0 (full
    // reveal). Each polyline reveals only the part of its index range that
    // currently sits between the cursor and headIndex — so the head band
    // and the glow draw the SAME curve segment at the SAME time, no matter
    // their independent path lengths.
    const tick = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / TRACE_GROWTH_DURATION_MS);
      const cursor = headIndex * (1 - easeInOutCubic(t));

      segments.forEach((seg) => {
        if (cursor <= seg.startIndex) {
          seg.path.style.strokeDashoffset = "0";
        } else if (cursor >= seg.endIndex) {
          seg.path.style.strokeDashoffset = `${seg.pathLength}`;
        } else {
          // f = fraction of this polyline's index range that the cursor
          // has NOT yet swept through (= the part still hidden, measured
          // from the tail side of this polyline's curve range).
          const f = (cursor - seg.startIndex) / (seg.endIndex - seg.startIndex);
          seg.path.style.strokeDashoffset = `${f * seg.pathLength}`;
        }
      });

      if (t < 1) {
        rafIdRef.current = requestAnimationFrame(tick);
      } else {
        // Clear dash properties so subsequent same-aircraft updates (which
        // recreate the polylines on each poll) don't inherit stale dash
        // styling on the freshly-built paths.
        segments.forEach((seg) => {
          seg.path.style.strokeDasharray = "";
          seg.path.style.strokeDashoffset = "";
        });
        rafIdRef.current = null;
      }
    };
    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      removeLayers(layersRef.current, map);
      layersRef.current = [];
    };
  }, [map, theme, traceData, aircraft, reducedMotion]);

  return null;
}
