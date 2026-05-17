"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMapInstance } from "./MapContext.js";
import {
  buildAirportRangeRingLabels,
  buildAirportRangeRings,
} from "../../features/airport/map/airportRangeRings.js";
import { ZOOM_AIRPORT } from "../../utils/airportMapDisplay.js";

// Default distance-ring band for the primary focal: one circle every
// 3nm out to 30nm. The flight-tracking page passes a coarser band (5nm
// → 30nm) so the rings don't clutter the moving viewport.
const DEFAULT_RING_INTERVAL_NM = 3;
const DEFAULT_RING_MAX_NM = 30;

// Show per-ring distance labels at the airport preset and closer. At
// approach the labels would clutter the map; the MapRangeLegend
// scale-bar overlay handles that zoom range instead.
const RING_LABEL_MIN_ZOOM = ZOOM_AIRPORT;

// Leaflet's renderer (_renderer / overlayPane._renderer) can be missing or
// half-initialized in two situations we hit in practice: HMR (the map
// component re-renders while its internal SVG renderer is mid-rebuild) and
// rapid airport switching (children mount against a map whose panes haven't
// finished wiring up yet). Both surface as "Cannot read properties of
// undefined (reading 'appendChild')" inside addTo(). Wrapping in try/catch
// lets the next render attempt succeed instead of bringing down the page.
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

    // The innermost ring (at `ringIntervalNm`) doubles as the "airport
    // ground area" boundary that used to be drawn separately. Keeping
    // a single layer eliminates the alignment drift that had the old
    // close circle (2.2nm) sitting just inside the first 3nm ring.
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
