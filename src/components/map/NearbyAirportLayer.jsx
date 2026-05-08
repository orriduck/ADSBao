"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMapInstance } from "./MapContext.js";

const escapeHtml = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const airportLabel = (airport) => airport.iata || airport.icao || "";

const markerHtml = (airport) => {
  const code = escapeHtml(airportLabel(airport));
  const distance = Number.isFinite(airport.distanceNm)
    ? `${airport.distanceNm.toFixed(0)}NM`
    : "";
  return `
    <div class="nearby-airport-marker">
      <span class="nearby-airport-marker-dot"></span>
      <span class="nearby-airport-marker-label">
        <strong>${code}</strong>
        ${distance ? `<small>${escapeHtml(distance)}</small>` : ""}
      </span>
    </div>
  `;
};

export default function NearbyAirportLayer({ airports = [] }) {
  const map = useMapInstance();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!map || !map.getContainer) return undefined;

    layerRef.current?.removeFrom(map);
    const layer = L.layerGroup();

    for (const airport of airports) {
      if (!airport?.lat || !airport?.lon) continue;
      L.marker([airport.lat, airport.lon], {
        interactive: false,
        opacity: 0.72,
        icon: L.divIcon({
          className: "",
          html: markerHtml(airport),
          iconSize: [96, 24],
          iconAnchor: [12, 12],
        }),
      }).addTo(layer);
    }

    layer.addTo(map);
    layerRef.current = layer;

    return () => {
      layer.removeFrom(map);
      layerRef.current = null;
    };
  }, [map, airports]);

  return null;
}
