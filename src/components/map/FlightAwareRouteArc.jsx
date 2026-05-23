"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { useMapInstance } from "./MapContext.js";
import {
  AIRPORT_MAP_PANES,
  SELECTED_AIRCRAFT_TRACE_STYLE,
} from "@/config/airportMap.js";
import { resolveDocumentTheme } from "@/features/airport/map/airportMapModel.js";
import { ensureAirportMapPane } from "@/features/airport/map/mapPane.js";

const getCurrentTheme = () =>
  typeof document !== "undefined"
    ? resolveDocumentTheme(document.documentElement)
    : "dark";

function removeLayers(layers = [], map) {
  layers.forEach((layer) => {
    if (layer && map?.hasLayer(layer)) layer.removeFrom(map);
  });
}

export default function FlightAwareRouteArc({
  path = [],
  theme = null,
  opacity = 1,
}) {
  const map = useMapInstance();
  const layersRef = useRef([]);
  const [documentTheme, setDocumentTheme] = useState(() => getCurrentTheme());

  useEffect(() => {
    if (theme) return undefined;
    setDocumentTheme(getCurrentTheme());
    const observer = new MutationObserver(() => {
      const next = getCurrentTheme();
      setDocumentTheme((current) => (current === next ? current : next));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, [theme]);

  useEffect(() => {
    removeLayers(layersRef.current, map);
    layersRef.current = [];

    if (!map || !Array.isArray(path) || path.length < 2) return undefined;

    const pane = ensureAirportMapPane(map, AIRPORT_MAP_PANES.trace);
    const effectiveTheme = theme || documentTheme;
    const traceStyle =
      effectiveTheme === "light"
        ? SELECTED_AIRCRAFT_TRACE_STYLE.light
        : SELECTED_AIRCRAFT_TRACE_STYLE.dark;
    const color = traceStyle.lineColor;
    const layers = [
      L.polyline(path, {
        pane,
        color,
        opacity: 0.18 * opacity,
        weight: traceStyle.glowWeight,
        interactive: false,
        lineCap: "round",
        lineJoin: "round",
        className: "aircraft-trace aircraft-trace--flightaware-route-glow",
      }).addTo(map),
      L.polyline(path, {
        pane,
        color,
        opacity: 0.58 * opacity,
        weight: Math.max(1, traceStyle.lineWeight - 0.4),
        interactive: false,
        lineCap: "round",
        lineJoin: "round",
        dashArray: "10 12",
        className: "aircraft-trace aircraft-trace--flightaware-route",
      }).addTo(map),
    ];
    layersRef.current = layers;

    return () => {
      removeLayers(layersRef.current, map);
      layersRef.current = [];
    };
  }, [map, path, theme, documentTheme, opacity]);

  return null;
}
