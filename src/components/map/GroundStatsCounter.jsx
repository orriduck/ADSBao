"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import NumberFlow from "@number-flow/react";
import L from "leaflet";
import { useMapInstance } from "./MapContext.js";
import { AIRPORT_AREA_RADIUS_NM } from "../../config/airportMap.js";
import { ZOOM_APPROACH } from "../../utils/airportMapDisplay.js";
import { getDistanceNm } from "../../utils/aircraftTrafficIntent.js";

export default function GroundStatsCounter({ lat, lon, zoom, icao = "", aircraft = [] }) {
  const map = useMapInstance();
  const markerRef = useRef(null);
  const [container] = useState(() =>
    typeof document !== "undefined" ? document.createElement("div") : null,
  );

  const visible = Number(zoom) === ZOOM_APPROACH && lat && lon;

  const areaCount = useMemo(() => {
    if (!visible) return 0;
    return aircraft.filter((item) => {
      const distNm = getDistanceNm(lat, lon, item.lat, item.lon);
      return distNm != null && distNm <= AIRPORT_AREA_RADIUS_NM;
    }).length;
  }, [aircraft, visible, lat, lon]);

  useEffect(() => {
    if (!map || !map.getContainer || !visible || !container) {
      markerRef.current?.remove();
      markerRef.current = null;
      return undefined;
    }
    const marker = L.marker([lat, lon], {
      interactive: false,
      icon: L.divIcon({
        className: "",
        html: container,
        iconSize: [80, 18],
        iconAnchor: [40, 24],
      }),
    }).addTo(map);
    markerRef.current = marker;
    return () => {
      marker.remove();
      markerRef.current = null;
    };
  }, [map, visible, lat, lon, container]);

  if (!container || !visible) return null;
  return createPortal(
    <div className="airport-ground-count">
      {icao} <NumberFlow value={areaCount} />
    </div>,
    container,
  );
}
