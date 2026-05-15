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

// Cubic ease-out — fast start that decelerates into the head, which reads as
// "the plane just left this trail" rather than a uniform linear stripe.
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

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
    // Reveal-eligible polylines (bands + glow). Each is built with REVERSED
    // coords so its SVG path starts at the head end — then stroke-dasharray /
    // stroke-dashoffset can animate the path being "drawn" from the head
    // backwards, which is GPU-accelerated and reads as a continuous trail
    // unfurling rather than a stepwise polyline replace.
    const reveal = [];

    // Bands ordered head-first (newest band's coords are highest indices,
    // so we reverse the band list so the head-most band animates first).
    const bandsHeadFirst = [...traceData.bands].reverse();
    bandsHeadFirst.forEach((band) => {
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
      reveal.push(polyline);
    });

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

    // Walk a single eased "revealed" length from 0 → totalLength across all
    // reveal polylines (bands ordered head-first, then glow). Each path is
    // already drawn from head→tail (reversed coords), so animating its own
    // stroke-dashoffset from `pathLength` → 0 reveals it from the head end
    // of its slice backwards. Sum-of-band-lengths gates when each band
    // starts revealing, so head bands fully draw before older bands begin —
    // visually a continuous trail unfurling backward from the plane.
    const segments = reveal
      .map((polyline) => {
        const path = polyline.getElement?.();
        const length = path?.getTotalLength?.();
        if (!path || !Number.isFinite(length) || length <= 0) return null;
        return { polyline, path, length };
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

    // For each segment, where its head-side end sits in the cumulative
    // length measured from the overall head. Bands come first (head-first
    // order), then the glow covers the entire curve.
    let cumulative = 0;
    const segmentRanges = segments.map((segment, index) => {
      // Glow is the last entry and spans the whole curve, but we treat it
      // as a parallel reveal anchored at 0 so it grows alongside the bands.
      const isGlow = index === segments.length - 1;
      const start = isGlow ? 0 : cumulative;
      const end = isGlow ? segment.length : cumulative + segment.length;
      if (!isGlow) cumulative += segment.length;
      return { ...segment, start, end };
    });
    const totalLength = cumulative || segmentRanges[0].length;

    // Initial frame: every path hidden via full dashoffset.
    segmentRanges.forEach((seg) => {
      seg.path.style.strokeDasharray = `${seg.length}`;
      seg.path.style.strokeDashoffset = `${seg.length}`;
    });

    const startTime =
      typeof performance !== "undefined" ? performance.now() : Date.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / TRACE_GROWTH_DURATION_MS);
      const revealed = easeOutCubic(t) * totalLength;

      segmentRanges.forEach((seg) => {
        if (revealed >= seg.end) {
          seg.path.style.strokeDashoffset = "0";
        } else if (revealed <= seg.start) {
          seg.path.style.strokeDashoffset = `${seg.length}`;
        } else {
          // Fraction of this segment that should be visible.
          const visibleLen = revealed - seg.start;
          seg.path.style.strokeDashoffset = `${seg.length - visibleLen}`;
        }
      });

      if (t < 1) {
        rafIdRef.current = requestAnimationFrame(tick);
      } else {
        // Clear dash properties so subsequent same-aircraft updates (which
        // re-create polylines from scratch) render normally.
        segmentRanges.forEach((seg) => {
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
