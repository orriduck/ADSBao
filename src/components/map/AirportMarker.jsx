"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import L from "leaflet";
import { useMapInstance } from "./MapContext.js";

export default function AirportMarker({ lat, lon, icao = "", airport = null }) {
  const map = useMapInstance();
  const markerRef = useRef(null);
  const [container] = useState(() =>
    typeof document !== "undefined" ? document.createElement("div") : null,
  );

  useEffect(() => {
    if (!map || !map.getContainer || !lat || !lon || !container)
      return undefined;
    const marker = L.marker([lat, lon], {
      interactive: false,
      icon: L.divIcon({
        className: "",
        html: container,
        iconSize: [120, 34],
        iconAnchor: [0, -8],
      }),
    }).addTo(map);
    markerRef.current = marker;
    return () => {
      marker.remove();
      markerRef.current = null;
    };
  }, [map, lat, lon, container]);

  if (!container) return null;

  const code = (airport?.iata || icao || "").trim();
  const details = [];
  const runways = airport?.runways;
  if (Array.isArray(runways) && runways.length) {
    details.push(`RWY ${runways.length}`);
  }
  const approachCount = Number(airport?.approachCount);
  if (Number.isFinite(approachCount) && approachCount > 0) {
    details.push(`APP ${approachCount}`);
  }

  return createPortal(
    <div className="airport-overlay-label notranslate" translate="no">
      {code}
      {details.map((line) => (
        <span key={line}>{line}</span>
      ))}
    </div>,
    container,
  );
}
