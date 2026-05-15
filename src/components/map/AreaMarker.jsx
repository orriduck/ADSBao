"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMapInstance } from "./MapContext.js";
import { AIRPORT_AREA_RADIUS_NM } from "../../config/airportMap.js";
import { shouldShowAirportArea } from "../../utils/airportMapDisplay.js";
import { DEFAULT_AIRCRAFT_RANGE_NM } from "../../services/aviationData.js";

const NM_TO_METERS = 1852;

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

    closeRef.current?.removeFrom(map);
    closeRef.current = null;
    if (shouldShowAirportArea(zoom)) {
      closeRef.current = L.circle([lat, lon], {
        radius: AIRPORT_AREA_RADIUS_NM * NM_TO_METERS,
        color: closeStroke,
        weight: 1,
        dashArray: "4 4",
        fillColor: closeFill,
        fillOpacity: 1,
      }).addTo(map);
    }

    wideRef.current?.removeFrom(map);
    wideRef.current = L.circle([lat, lon], {
      radius: DEFAULT_AIRCRAFT_RANGE_NM * NM_TO_METERS,
      color: wideStroke,
      weight: 1,
      dashArray: "6 6",
      fillColor: wideFill,
      fillOpacity: 1,
    }).addTo(map);

    return () => {
      closeRef.current?.removeFrom(map);
      wideRef.current?.removeFrom(map);
      closeRef.current = null;
      wideRef.current = null;
    };
  }, [map, lat, lon, zoom, theme]);

  return null;
}
