"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
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

export default function SelectedAircraftTrace({
  aircraft = null,
  tracePoints = [],
  theme = "dark",
}) {
  const map = useMapInstance();
  const layersRef = useRef([]);
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
      headPoint: sampled.at(-1) || null,
    };
  }, [aircraft, tracePoints]);

  useEffect(() => {
    removeLayers(layersRef.current, map);
    layersRef.current = [];

    if (!map || traceData.curve.length < 2) return undefined;

    const pane = ensureAirportMapPane(map, AIRPORT_MAP_PANES.trace);
    const traceStyle = getTraceStyle(theme);
    const layers = [];

    traceData.bands.forEach((band) => {
      const opacity = 0.08 + band.emphasis * traceStyle.lineOpacity;
      const weight = traceStyle.lineWeight * (0.82 + band.emphasis * 0.28);
      layers.push(
        L.polyline(band.coords, {
          pane,
          color: traceStyle.lineColor,
          opacity,
          weight,
          interactive: false,
          lineCap: "round",
          lineJoin: "round",
          className: "aircraft-trace aircraft-trace--band",
        }).addTo(map),
      );
    });

    layers.push(
      L.polyline(traceData.curve, {
        pane,
        color: traceStyle.glowColor,
        opacity: traceStyle.glowOpacity,
        weight: traceStyle.glowWeight,
        interactive: false,
        lineCap: "round",
        lineJoin: "round",
        className: "aircraft-trace aircraft-trace--glow",
      }).addTo(map),
    );

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

    if (traceData.headPoint) {
      layers.push(
        L.circleMarker([traceData.headPoint.lat, traceData.headPoint.lon], {
          pane,
          radius: traceStyle.headRadius,
          stroke: false,
          fillColor: traceStyle.headColor,
          fillOpacity: traceStyle.headOpacity,
          interactive: false,
          className: "aircraft-trace-head",
        }).addTo(map),
      );
    }

    layersRef.current = layers;

    return () => {
      removeLayers(layersRef.current, map);
      layersRef.current = [];
    };
  }, [map, theme, traceData]);

  return null;
}
