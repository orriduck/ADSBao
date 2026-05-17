"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMapInstance } from "./MapContext.js";
import { AIRPORT_AREA_RADIUS_NM } from "../../config/airportMap.js";
import { shouldShowAirportArea } from "../../utils/airportMapDisplay.js";
import {
  buildAirportRangeRingLabels,
  buildAirportRangeRings,
} from "../../features/airport/map/airportRangeRings.js";

const NM_TO_METERS = 1852;

// Default distance-ring band for the primary focal: one circle every
// 3nm out to 30nm. The flight-tracking page passes a coarser band (5nm
// → 30nm) so the rings don't clutter the moving viewport.
const DEFAULT_RING_INTERVAL_NM = 3;
const DEFAULT_RING_MAX_NM = 30;

// Show per-ring distance labels only at the airport-or-closer zoom
// presets. At approach the ring labels would clutter the map; the
// MapRangeLegend overlay handles that case instead.
const RING_LABEL_MIN_ZOOM = 12;

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
  const closeRef = useRef(null);
  const ringsRef = useRef(null);
  const ringLabelsRef = useRef(null);

  useEffect(() => {
    if (!map || typeof map.getContainer !== "function" || !map.getContainer())
      return undefined;
    if (!lat || !lon) return undefined;

    const closeStroke =
      theme === "light" ? "rgba(18,21,26,0.22)" : "rgba(255,255,255,0.28)";
    const closeFill =
      theme === "light" ? "rgba(18,21,26,0.06)" : "rgba(255,255,255,0.05)";

    safeRemoveFrom(closeRef.current, map);
    closeRef.current = null;
    if (shouldShowAirportArea(zoom)) {
      closeRef.current = safeAddTo(
        L.circle([lat, lon], {
          radius: AIRPORT_AREA_RADIUS_NM * NM_TO_METERS,
          color: closeStroke,
          weight: 1,
          dashArray: "4 4",
          fillColor: closeFill,
          fillOpacity: 1,
        }),
        map,
      );
    }

    // Concentric distance rings replace the old single 30nm boundary.
    // Grouped in a layerGroup so we can attach/detach with one call.
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
      safeRemoveFrom(closeRef.current, map);
      safeRemoveFrom(ringsRef.current, map);
      safeRemoveFrom(ringLabelsRef.current, map);
      closeRef.current = null;
      ringsRef.current = null;
      ringLabelsRef.current = null;
    };
  }, [map, lat, lon, zoom, theme, ringIntervalNm, ringMaxNm]);

  return null;
}
