"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMapInstance } from "./MapContext.js";
import {
  AIRPORT_MAP_PANES,
  SELECTED_AIRCRAFT_TRACE_STYLE,
} from "../../config/airportMap.js";
import { ensureAirportMapPane } from "../../features/airport-map/mapPane.js";
import { buildAircraftTraceCurve } from "../../features/aircraft-trace/aircraftTraceModel.js";

const getTraceStyle = (theme) =>
  theme === "light"
    ? SELECTED_AIRCRAFT_TRACE_STYLE.light
    : SELECTED_AIRCRAFT_TRACE_STYLE.dark;

function removeLayers(layers = [], map) {
  layers.forEach((layer) => {
    if (layer && map?.hasLayer(layer)) layer.removeFrom(map);
  });
}

export default function SelectedAircraftTrace({
  aircraft = null,
  theme = "dark",
}) {
  const map = useMapInstance();
  const layersRef = useRef([]);

  useEffect(() => {
    removeLayers(layersRef.current, map);
    layersRef.current = [];

    if (!map) return undefined;

    const traceHistory = (aircraft?.traceHistory || []).slice(
      -SELECTED_AIRCRAFT_TRACE_STYLE.maxHistoryPoints,
    );
    if (traceHistory.length < 2) return undefined;

    const pane = ensureAirportMapPane(map, AIRPORT_MAP_PANES.trace);
    const traceStyle = getTraceStyle(theme);
    const curve = buildAircraftTraceCurve(traceHistory);

    const glowLayer = L.polyline(curve, {
      pane,
      color: traceStyle.glowColor,
      opacity: traceStyle.glowOpacity,
      weight: traceStyle.glowWeight,
      interactive: false,
      lineCap: "round",
      lineJoin: "round",
      className: "aircraft-trace aircraft-trace--glow",
    }).addTo(map);

    const bodyLayer = L.polyline(curve, {
      pane,
      color: traceStyle.lineColor,
      opacity: traceStyle.lineOpacity,
      weight: traceStyle.lineWeight,
      interactive: false,
      lineCap: "round",
      lineJoin: "round",
      className: "aircraft-trace aircraft-trace--body",
    }).addTo(map);

    const pointLayers = traceHistory.slice(0, -1).map((point) =>
      L.circleMarker([point.lat, point.lon], {
        pane,
        radius: traceStyle.pointRadius,
        stroke: false,
        fillColor: traceStyle.pointColor,
        fillOpacity: traceStyle.pointFillOpacity,
        interactive: false,
        className: "aircraft-trace-point",
      }).addTo(map),
    );

    layersRef.current = [glowLayer, bodyLayer, ...pointLayers];

    return () => {
      removeLayers(layersRef.current, map);
      layersRef.current = [];
    };
  }, [aircraft, map, theme]);

  return null;
}
