import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { useMapInstance } from "./MapContext";
import { AIRPORT_MAP_PANES } from "@/config/airportMap";
import { resolveDocumentTheme } from "@/features/airport/map/airportMapModel";
import { buildFlightRouteLayerStyles } from "@/features/airport/map/flightRouteArcStyleModel";
import {
  safeAddToMap,
  safeRemoveFromMap,
} from "@/features/airport/map/leafletLayerSafety";
import { ensureAirportMapPane } from "@/features/airport/map/mapPane";
import { buildGreatCirclePath } from "@/features/aviation/flight-routes/greatCircleRouteModel";
import { subscribeAircraftMotionFrame } from "./aircraftMotionFrameLoop";
import { shouldAnimateAircraftVisualPosition } from "@/utils/aircraftMotion";

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

function toUsablePoint(point) {
  const lat = Number(point?.lat);
  const lon = Number(point?.lon);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

function addRouteLayer(layer, map, layers) {
  const added = safeAddToMap(layer, map, { label: "FlightRouteArc" });
  if (added) layers.push(added);
  return added;
}

export default function FlightRouteArc({
  path = [],
  destination = null,
  followPositionRef = null,
  motionRef = null,
  theme = null,
  opacity = 1,
}) {
  const map = useMapInstance();
  const layersRef = useRef([]);
  const lastFollowPositionRef = useRef(null);
  const [documentTheme, setDocumentTheme] = useState(() => getCurrentTheme());
  const destinationPoint = toUsablePoint(destination);
  const destinationKey = destinationPoint
    ? `${destinationPoint.lat}:${destinationPoint.lon}`
    : "";
  const staticPathKey = useMemo(
    () => toUsablePath(path).map((point) => `${point[0]}:${point[1]}`).join("|"),
    [path],
  );
  // When tracking a focal aircraft, marker, camera, and route must all read
  // the same inferred head. `path` remains a fallback for static consumers.
  const followsAircraft = Boolean(destinationPoint && followPositionRef);
  const routeGeometryKey = followsAircraft ? destinationKey : staticPathKey;

  const resolvePathFromFollowPosition = () => {
    const from = toUsablePoint(followPositionRef?.current);
    return from && destinationPoint
      ? buildGreatCirclePath({ from, to: destinationPoint })
      : toUsablePath(path);
  };

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

    const usablePath = followsAircraft
      ? resolvePathFromFollowPosition()
      : toUsablePath(path);
    if (!map || usablePath.length < 2) {
      return undefined;
    }

    const pane = ensureAirportMapPane(map, AIRPORT_MAP_PANES.trace);
    const effectiveTheme = theme || documentTheme;
    const routeStyles = buildFlightRouteLayerStyles({
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
        className: "aircraft-trace aircraft-trace--flight-route-glow",
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
        className: "aircraft-trace aircraft-trace--flight-route",
      }),
      map,
      layers,
    );
    layersRef.current = layers;

    return () => {
      removeLayers(layersRef.current, map);
      layersRef.current = [];
    };
  }, [map, routeGeometryKey, theme, documentTheme, opacity]);

  useEffect(() => {
    if (!map || !followsAircraft) return undefined;
    return subscribeAircraftMotionFrame((now) => {
      const position = toUsablePoint(followPositionRef?.current);
      if (position && destinationPoint) {
        const previous = lastFollowPositionRef.current;
        if (
          !previous ||
          Math.abs(previous.lat - position.lat) >= 0.00000001 ||
          Math.abs(previous.lon - position.lon) >= 0.00000001
        ) {
          const nextPath = buildGreatCirclePath({
            from: position,
            to: destinationPoint,
          });
          layersRef.current.forEach((layer) => layer.setLatLngs?.(nextPath));
          lastFollowPositionRef.current = position;
        }
      }
      return shouldAnimateAircraftVisualPosition(motionRef?.current, now);
    });
  }, [destinationKey, followsAircraft, map, motionRef, followPositionRef]);

  return null;
}
