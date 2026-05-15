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

const TRACE_GROWTH_DURATION_MS = 700;

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

    const currentHex = getAircraftIdentity(aircraft) || null;
    const isFreshSelection = previousHexRef.current !== currentHex;
    previousHexRef.current = currentHex;

    const pane = ensureAirportMapPane(map, AIRPORT_MAP_PANES.trace);
    const traceStyle = getTraceStyle(theme);
    const layers = [];
    // Polylines that participate in the growth reveal: each carries the
    // range of indices it owns within traceData.curve, so a single eased
    // "progress" value can drive all of them in lockstep.
    const growable = [];

    traceData.bands.forEach((band) => {
      const opacity = 0.08 + band.emphasis * traceStyle.lineOpacity;
      const weight = traceStyle.lineWeight * (0.82 + band.emphasis * 0.28);
      const polyline = L.polyline(band.coords, {
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
      growable.push({
        polyline,
        startIndex: band.startIndex,
        endIndex: band.endIndex,
      });
    });

    const glowPolyline = L.polyline(traceData.curve, {
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
    growable.push({
      polyline: glowPolyline,
      startIndex: 0,
      endIndex: traceData.curve.length - 1,
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

    // Start each growable polyline with an empty coord array, then walk the
    // curve forward. Each polyline reveals only the portion of the curve
    // that falls inside its [startIndex, endIndex] range, so bands of
    // different colors light up in sequence as the progress front moves
    // through them.
    growable.forEach((g) => g.polyline.setLatLngs([]));
    const totalSegments = Math.max(1, traceData.curve.length - 1);
    const startTime =
      typeof performance !== "undefined" ? performance.now() : Date.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / TRACE_GROWTH_DURATION_MS);
      const frontIndex = easeOutCubic(t) * totalSegments;

      growable.forEach((g) => {
        const sliceEnd = Math.min(g.endIndex, Math.floor(frontIndex));
        if (sliceEnd <= g.startIndex) {
          g.polyline.setLatLngs([]);
          return;
        }
        g.polyline.setLatLngs(
          traceData.curve.slice(g.startIndex, sliceEnd + 1),
        );
      });

      if (t < 1) {
        rafIdRef.current = requestAnimationFrame(tick);
      } else {
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
