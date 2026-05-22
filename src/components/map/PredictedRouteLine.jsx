"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { useMapInstance } from "./MapContext.js";
import { interpolateGreatCircle } from "@/features/aviation/greatCircle.js";
import { AIRPORT_MAP_PANES } from "@/config/airportMap.js";
import { ensureAirportMapPane } from "@/features/airport/map/mapPane.js";

// Zoom threshold below which we treat the view as "world-scale" and
// extend the dashed line back to the origin airport. Above this we only
// draw the look-ahead segment (current position → destination).
const ZOOM_OUT_THRESHOLD = 6;

// Number of samples per great-circle segment. 64 is smooth at every zoom
// without producing an unreasonable polyline at world view.
const ARC_SAMPLES = 64;

// Predicted-route layer painted on top of the ADS-B trace. When the
// FlightAware route provider is active the route data is treated as
// authoritative, so we draw:
//   - current → destination       (always when conditions met)
//   - origin  → current           (only at world-scale zoom, so the
//                                   layer becomes the full "planned"
//                                   path origin → destination)
//
// Both segments use the same dashed stroke; together they read as one
// continuous arc with the live aircraft sitting on the bend.
//
// Renders nothing when `enabled` is false, when the aircraft position
// is missing, or when neither endpoint coordinate is available. That
// makes it safe to mount unconditionally — gating happens here.
export default function PredictedRouteLine({
  enabled = false,
  lat,
  lon,
  origin = null,
  destination = null,
  zoom = null,
  theme = "dark",
}) {
  const map = useMapInstance();
  const lineLayersRef = useRef([]);

  const currentLatNum = Number(lat);
  const currentLonNum = Number(lon);
  const originLat = Number(origin?.lat);
  const originLon = Number(origin?.lon);
  const destLat = Number(destination?.lat);
  const destLon = Number(destination?.lon);

  const hasCurrent =
    Number.isFinite(currentLatNum) && Number.isFinite(currentLonNum);
  const hasOrigin =
    Number.isFinite(originLat) && Number.isFinite(originLon);
  const hasDestination =
    Number.isFinite(destLat) && Number.isFinite(destLon);

  const showOriginSegment =
    enabled && hasCurrent && hasOrigin && Number(zoom) <= ZOOM_OUT_THRESHOLD;
  const showDestinationSegment =
    enabled && hasCurrent && hasDestination;

  // Compute the arc point arrays only when endpoints actually change.
  // Geometry is theme-independent so the second effect (which paints
  // Leaflet polylines) re-runs on theme switches without re-running
  // the trig.
  const destinationArc = useMemo(() => {
    if (!showDestinationSegment) return [];
    return interpolateGreatCircle(
      currentLatNum,
      currentLonNum,
      destLat,
      destLon,
      ARC_SAMPLES,
    );
  }, [showDestinationSegment, currentLatNum, currentLonNum, destLat, destLon]);

  const originArc = useMemo(() => {
    if (!showOriginSegment) return [];
    return interpolateGreatCircle(
      originLat,
      originLon,
      currentLatNum,
      currentLonNum,
      ARC_SAMPLES,
    );
  }, [showOriginSegment, originLat, originLon, currentLatNum, currentLonNum]);

  useEffect(() => {
    if (!map) return undefined;

    // Tear down any previous polylines before we add the new ones — the
    // arcs change every poll cycle as the aircraft moves.
    lineLayersRef.current.forEach((layer) => {
      if (map.hasLayer(layer)) layer.removeFrom(map);
    });
    lineLayersRef.current = [];

    if (destinationArc.length === 0 && originArc.length === 0) {
      return undefined;
    }

    const pane = ensureAirportMapPane(map, AIRPORT_MAP_PANES.trace);
    const strokeColor =
      theme === "light" ? "rgba(26, 26, 24, 0.55)" : "rgba(255, 230, 0, 0.62)";

    const baseOptions = {
      pane,
      color: strokeColor,
      weight: 1.6,
      opacity: 1,
      dashArray: "6 7",
      lineCap: "round",
      lineJoin: "round",
      interactive: false,
      className: "aircraft-predicted-route",
    };

    if (destinationArc.length > 1) {
      const line = L.polyline(destinationArc, baseOptions).addTo(map);
      lineLayersRef.current.push(line);
    }

    if (originArc.length > 1) {
      // The "already flown" segment is rendered with the same dash but
      // at lower opacity so the live "look-ahead" stays the visual
      // anchor.
      const line = L.polyline(originArc, {
        ...baseOptions,
        opacity: 0.55,
      }).addTo(map);
      lineLayersRef.current.push(line);
    }

    return () => {
      lineLayersRef.current.forEach((layer) => {
        if (map.hasLayer(layer)) layer.removeFrom(map);
      });
      lineLayersRef.current = [];
    };
  }, [map, destinationArc, originArc, theme]);

  return null;
}
