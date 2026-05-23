"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMapInstance } from "./MapContext.js";
import {
  buildAirportRangeRingLabels,
  buildAirportRangeRings,
} from "../../features/airport/map/airportRangeRings.js";
import {
  safeAddToMap,
  safeRemoveFromMap,
} from "../../features/airport/map/leafletLayerSafety.js";
import { ZOOM_AIRPORT } from "../../utils/airportMapDisplay.js";

const DEFAULT_RING_INTERVAL_NM = 3;
const DEFAULT_RING_MAX_NM = 30;

// Per-ring labels show at the airport preset and closer; below that
// the MapRangeLegend scale bar carries distance context.
const RING_LABEL_MIN_ZOOM = ZOOM_AIRPORT;

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

    safeRemoveFromMap(ringsRef.current, map);
    const rings = buildAirportRangeRings(L, {
      lat,
      lon,
      intervalNm: ringIntervalNm,
      maxNm: ringMaxNm,
      theme,
    });
    ringsRef.current =
      rings.length > 0
        ? safeAddToMap(L.layerGroup(rings), map, { label: "AreaMarker" })
        : null;

    safeRemoveFromMap(ringLabelsRef.current, map);
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
        ringLabelsRef.current = safeAddToMap(L.layerGroup(labels), map, {
          label: "AreaMarker",
        });
      }
    }

    return () => {
      safeRemoveFromMap(ringsRef.current, map);
      safeRemoveFromMap(ringLabelsRef.current, map);
      ringsRef.current = null;
      ringLabelsRef.current = null;
    };
  }, [map, lat, lon, zoom, theme, ringIntervalNm, ringMaxNm]);

  return null;
}
