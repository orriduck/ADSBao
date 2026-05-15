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

// Cubic ease-in-out — gentle on both ends, fast in the middle. Reads as
// "the trail is being unfurled" rather than "snap then crawl" that plain
// ease-out produced when most of the path drew in the first 100ms.
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
  const isAnimatingRef = useRef(false);
  const pendingTracePointsRef = useRef(null);
  const reducedMotion = useReducedMotion();
  const aircraftHex = aircraft ? getAircraftIdentity(aircraft) || null : null;

  // Local "committed" tracePoints decouples render from prop. While the
  // growth animation is running, live poll appends are held in
  // pendingTracePointsRef and applied once the animation settles. This is
  // the key fix for the "two segments" feel: previously each 3-second
  // poll triggered a full layer rebuild mid-animation, restarting the
  // reveal from the new state.
  const [committedTracePoints, setCommittedTracePoints] = useState(tracePoints);

  // Sync prop → committed when not animating. When animating, stash for later.
  useEffect(() => {
    if (isAnimatingRef.current) {
      pendingTracePointsRef.current = tracePoints;
      return;
    }
    setCommittedTracePoints(tracePoints);
  }, [tracePoints]);

  // On aircraft change (including initial selection / deselection), reset
  // committed to empty so the next live-sync fires with whatever
  // useAircraftTrace publishes for the new aircraft. Skipping this would
  // leave stale geometry from the previous selection visible (and
  // animating!) for one render until useAircraftTrace's hex effect clears
  // it — that's the "trace appears with B's shape under A's selection,
  // then snaps to A's data" race.
  useEffect(() => {
    pendingTracePointsRef.current = null;
    setCommittedTracePoints([]);
  }, [aircraftHex]);

  // Pre-computed render geometry. Pure function of committed trace points.
  const geometry = useMemo(
    () =>
      computeTraceGeometry({
        tracePoints: committedTracePoints,
        maxRenderPoints: SELECTED_AIRCRAFT_TRACE_STYLE.maxRenderPoints,
        bandCount: SELECTED_AIRCRAFT_TRACE_STYLE.bandCount,
        sweepTailRatio: SELECTED_AIRCRAFT_TRACE_STYLE.sweepTailRatio,
      }),
    [committedTracePoints],
  );

  useEffect(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    removeLayers(layersRef.current, map);
    layersRef.current = [];

    if (!map || !geometry) {
      previousHexRef.current = null;
      isAnimatingRef.current = false;
      return undefined;
    }

    const isFreshSelection = previousHexRef.current !== aircraftHex;
    previousHexRef.current = aircraftHex;

    const pane = ensureAirportMapPane(map, AIRPORT_MAP_PANES.trace);
    const traceStyle = getTraceStyle(theme);
    const layers = [];
    // Reveal-eligible polylines (bands + glow). Each carries its
    // [startIndex, endIndex] within geometry.curve so the animation can
    // drive every polyline from a single back-cursor in curve-index space —
    // they all show the same visible curve range at any moment, which is
    // what makes a 7-band trail look like one unfurling line instead of
    // staggered segments.
    const reveal = [];

    geometry.bands.forEach((band) => {
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

    const glowPolyline = L.polyline(geometry.curve.slice().reverse(), {
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
      endIndex: geometry.headIndex,
    });

    if (geometry.sweepCoords.length >= 2) {
      layers.push(
        L.polyline(geometry.sweepCoords, {
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

    layersRef.current = layers;

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

    // Synchronously hide all reveal paths via visibility:hidden so the
    // user doesn't see a flash of the full trace during the one-frame
    // defer below. visibility (vs opacity / display) doesn't trigger
    // reflow and is cheap to flip.
    const initialPaths = reveal
      .map((entry) => entry.polyline.getElement?.())
      .filter(Boolean);
    initialPaths.forEach((path) => {
      path.style.visibility = "hidden";
    });

    isAnimatingRef.current = true;
    const { headIndex } = geometry;

    // Defer the actual dash setup + animation start by one rAF tick.
    // Leaflet's SVG renderer flushes path geometry on the next animation
    // frame after addTo; calling getTotalLength immediately can return 0
    // for a brief window (the symptom: animation block is reached but
    // every segment is filtered out and the polylines just appear at
    // full state). One rAF gets us past that.
    rafIdRef.current = requestAnimationFrame(() => {
      const segments = reveal
        .map((entry) => {
          const path = entry.polyline.getElement?.();
          const length = path?.getTotalLength?.();
          if (!path || !Number.isFinite(length) || length <= 0) return null;
          return { ...entry, path, pathLength: length };
        })
        .filter(Boolean);

      // Re-show paths (we'll control visibility via dashoffset from here).
      initialPaths.forEach((path) => {
        path.style.visibility = "";
      });

      if (segments.length === 0) {
        rafIdRef.current = null;
        isAnimatingRef.current = false;
        return;
      }

      // Stage: every path hidden via full dashoffset.
      segments.forEach((seg) => {
        seg.path.style.strokeDasharray = `${seg.pathLength}`;
        seg.path.style.strokeDashoffset = `${seg.pathLength}`;
      });

      const startTime =
        typeof performance !== "undefined" ? performance.now() : Date.now();

      // Single back-cursor in curve-index space drives every polyline.
      // Cursor starts at headIndex (no reveal) and walks toward 0 (full
      // reveal). Each polyline reveals only the part of its index range
      // the cursor has swept past, so the head band and the glow draw the
      // SAME curve segment at the SAME time, no matter their independent
      // path lengths.
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
            const f =
              (cursor - seg.startIndex) / (seg.endIndex - seg.startIndex);
            seg.path.style.strokeDashoffset = `${f * seg.pathLength}`;
          }
        });

        if (t < 1) {
          rafIdRef.current = requestAnimationFrame(tick);
          return;
        }

        rafIdRef.current = null;
        isAnimatingRef.current = false;
        // Clear inline dash styles so next-poll rebuilds inherit a clean
        // path, otherwise the freshly-built paths inherit stale values.
        segments.forEach((seg) => {
          seg.path.style.strokeDasharray = "";
          seg.path.style.strokeDashoffset = "";
        });
        // Flush any deferred trace updates that arrived during animation.
        if (pendingTracePointsRef.current) {
          const pending = pendingTracePointsRef.current;
          pendingTracePointsRef.current = null;
          setCommittedTracePoints(pending);
        }
      };
      rafIdRef.current = requestAnimationFrame(tick);
    });

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      // Restore visibility in case we tore down mid-defer before the rAF
      // callback got to re-show.
      initialPaths.forEach((path) => {
        path.style.visibility = "";
      });
      isAnimatingRef.current = false;
      removeLayers(layersRef.current, map);
      layersRef.current = [];
    };
  }, [map, theme, geometry, aircraftHex, reducedMotion]);

  return null;
}
