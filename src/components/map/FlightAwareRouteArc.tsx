import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { useMapInstance } from "./MapContext";
import { AIRPORT_MAP_PANES } from "@/config/airportMap";
import { resolveDocumentTheme } from "@/features/airport/map/airportMapModel";
import { buildFlightAwareRouteLayerStyles } from "@/features/airport/map/flightAwareRouteArcStyleModel";
import {
  safeAddToMap,
  safeRemoveFromMap,
} from "@/features/airport/map/leafletLayerSafety";
import { ensureAirportMapPane } from "@/features/airport/map/mapPane";

const getCurrentTheme = () =>
  typeof document !== "undefined"
    ? resolveDocumentTheme(document.documentElement)
    : "dark";

function removeLayers(layers = [], map) {
  layers.forEach((layer) => safeRemoveFromMap(layer, map));
}

function toUsablePath(path = []) {
  return Array.isArray(path)
    ? path.filter(
        (point) =>
          Array.isArray(point) &&
          Number.isFinite(Number(point[0])) &&
          Number.isFinite(Number(point[1])),
      )
    : [];
}

function addRouteLayer(layer, map, layers) {
  const added = safeAddToMap(layer, map, { label: "FlightAwareRouteArc" });
  if (added) layers.push(added);
  return added;
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

    const usablePath = toUsablePath(path);
    if (!map || usablePath.length < 2) {
      return undefined;
    }

    const pane = ensureAirportMapPane(map, AIRPORT_MAP_PANES.trace);
    const effectiveTheme = theme || documentTheme;
    const routeStyles = buildFlightAwareRouteLayerStyles({
      theme: effectiveTheme,
      opacity,
    });
    const layers = [];
    addRouteLayer(
      L.polyline(usablePath, {
        pane,
        ...routeStyles.glow,
        interactive: false,
        lineCap: "round",
        lineJoin: "round",
        className: "aircraft-trace aircraft-trace--flightaware-route-glow",
      }),
      map,
      layers,
    );
    addRouteLayer(
      L.polyline(usablePath, {
        pane,
        ...routeStyles.route,
        interactive: false,
        lineCap: "round",
        lineJoin: "round",
        className: "aircraft-trace aircraft-trace--flightaware-route",
      }),
      map,
      layers,
    );
    layersRef.current = layers;

    return () => {
      removeLayers(layersRef.current, map);
      layersRef.current = [];
    };
  }, [map, path, theme, documentTheme, opacity]);

  return null;
}
