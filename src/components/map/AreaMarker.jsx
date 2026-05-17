"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMapInstance } from "./MapContext.js";
import {
  buildAirportRangeRingLabels,
  buildAirportRangeRings,
} from "../../features/airport/map/airportRangeRings.js";
import { ZOOM_AIRPORT } from "../../utils/airportMapDisplay.js";

const DEFAULT_RING_INTERVAL_NM = 3;
const DEFAULT_RING_MAX_NM = 30;

// Per-ring labels show at the airport preset and closer; below that
// the MapRangeLegend scale bar carries distance context.
const RING_LABEL_MIN_ZOOM = ZOOM_AIRPORT;

// HMR + rapid airport switching can land children on a map whose SVG
// renderer is mid-rebuild — addTo throws "Cannot read properties of
// undefined (reading 'appendChild')". Swallow it so the next render
// can succeed.
const safeAddTo = (layer, map) => {
  try {
    return layer.addTo(map);
  } catch (error) {
    console.warn("[AreaMarker] addTo skipped (map not ready)", error.message);
    return null;
  }
};

const safeRemoveFrom = (layer, map) => {
  if (!layer || !map) return;
  try {
    layer.removeFrom(map);
  } catch {
    /* layer or pane already torn down — nothing to clean up */
  }
};

export default function AreaMarker({
  lat,
  lon,
  zoom,
  theme = "dark",
  ringIntervalNm = DEFAULT_RING_INTERVAL_NM,
  ringMaxNm = DEFAULT_RING_MAX_NM,
}) {
  const map = useMapInstance();
  const ringsRef = useRef(null);
  const ringLabelsRef = useRef(null);

  useEffect(() => {
    if (!map || typeof map.getContainer !== "function" || !map.getContainer())
      return undefined;
    if (!lat || !lon) return undefined;

    safeRemoveFrom(ringsRef.current, map);
    const rings = buildAirportRangeRings(L, {
      lat,
      lon,
      intervalNm: ringIntervalNm,
      maxNm: ringMaxNm,
      theme,
    });
    ringsRef.current =
      rings.length > 0 ? safeAddTo(L.layerGroup(rings), map) : null;

    safeRemoveFrom(ringLabelsRef.current, map);
    ringLabelsRef.current = null;
    if (Number(zoom) >= RING_LABEL_MIN_ZOOM) {
      const labels = buildAirportRangeRingLabels(L, {
        lat,
        lon,
        intervalNm: ringIntervalNm,
        maxNm: ringMaxNm,
        theme,
      });
      if (labels.length > 0) {
        ringLabelsRef.current = safeAddTo(L.layerGroup(labels), map);
      }
    }

    return () => {
      safeRemoveFrom(ringsRef.current, map);
      safeRemoveFrom(ringLabelsRef.current, map);
      ringsRef.current = null;
      ringLabelsRef.current = null;
    };
  }, [map, lat, lon, zoom, theme, ringIntervalNm, ringMaxNm]);

  return null;
}
