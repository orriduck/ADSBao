"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMapInstance } from "./MapContext.js";
import { AIRPORT_AREA_RADIUS_NM } from "../../config/airportMap.js";
import { shouldShowAirportArea } from "../../utils/airportMapDisplay.js";
import { DEFAULT_AIRCRAFT_RANGE_NM } from "../../features/aviation/aviationData.js";

const NM_TO_METERS = 1852;

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

export default function AreaMarker({ lat, lon, zoom, theme = "dark" }) {
  const map = useMapInstance();
  const closeRef = useRef(null);
  const wideRef = useRef(null);

  useEffect(() => {
    // map.getContainer is always defined while the map instance is alive, but
    // calling it returns null after map.remove(). Invoke it so a stale map
    // reference (mid-teardown / HMR) doesn't fall through to addTo() and
    // crash on a missing pane.
    if (!map || typeof map.getContainer !== "function" || !map.getContainer())
      return undefined;
    if (!lat || !lon) return undefined;

    const closeStroke =
      theme === "light" ? "rgba(18,21,26,0.22)" : "rgba(255,255,255,0.28)";
    const closeFill =
      theme === "light" ? "rgba(18,21,26,0.06)" : "rgba(255,255,255,0.05)";
    const wideStroke =
      theme === "light" ? "rgba(18,21,26,0.12)" : "rgba(255,255,255,0.16)";
    const wideFill =
      theme === "light" ? "rgba(18,21,26,0.018)" : "rgba(255,255,255,0.018)";

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

    safeRemoveFrom(wideRef.current, map);
    wideRef.current = safeAddTo(
      L.circle([lat, lon], {
        radius: DEFAULT_AIRCRAFT_RANGE_NM * NM_TO_METERS,
        color: wideStroke,
        weight: 1,
        dashArray: "6 6",
        fillColor: wideFill,
        fillOpacity: 1,
      }),
      map,
    );

    return () => {
      safeRemoveFrom(closeRef.current, map);
      safeRemoveFrom(wideRef.current, map);
      closeRef.current = null;
      wideRef.current = null;
    };
  }, [map, lat, lon, zoom, theme]);

  return null;
}
