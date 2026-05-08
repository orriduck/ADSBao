"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMapInstance } from "./MapContext.js";
import { AIRPORT_MAP_PANES } from "../../config/airportMap.js";
import { ensureAirportMapPane } from "../../features/airport-map/mapPane.js";
import {
  buildRunwayApproachBeamCollection,
  buildRunwayCenterlineCollection,
  buildRunwayEndLabels,
} from "../../features/airport-map/runwayAnnotationModel.js";

const NEARBY_RUNWAY_BEAM_DISTANCE_SCALE = 0.3;

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

const runwayLineStyle = (theme) =>
  theme === "light"
    ? {
        color: "#244164",
        weight: 3,
        opacity: 0.24,
      }
    : {
        color: "#8fb7d6",
        weight: 3,
        opacity: 0.24,
      };

const runwayBeamColor = (theme) => (theme === "light" ? "#8b6f47" : "#d8bd83");

const runwayLabelIcon = (ident, theme) =>
  L.divIcon({
    className: `runway-end-label runway-end-label--nearby runway-end-label--${theme}`,
    html: `<span>${escapeHtml(ident)}</span>`,
    iconSize: [34, 18],
    iconAnchor: [17, 22],
  });

const runwayLayers = ({ airport, map, theme, zoom }) => {
  if (!airport?.runwayMap?.runways?.length) return [];
  const centerlines = buildRunwayCenterlineCollection(airport.runwayMap);
  const showRunways = Number(zoom) >= 10;
  if (!showRunways) return [];
  const beams = buildRunwayApproachBeamCollection(airport.runwayMap, {
    zoom,
    distanceScale: NEARBY_RUNWAY_BEAM_DISTANCE_SCALE,
  });
  const labels = buildRunwayEndLabels(airport.runwayMap, { zoom });

  return [
    L.geoJSON(beams, {
      interactive: false,
      style() {
        return {
          className: "runway-approach-beam runway-approach-beam--nearby",
          fill: true,
          fillColor: runwayBeamColor(theme),
          fillOpacity: 1,
          opacity: 0,
          stroke: false,
        };
      },
    }),
    L.geoJSON(centerlines, {
      interactive: false,
      style() {
        return {
          ...runwayLineStyle(theme),
          lineCap: "butt",
          lineJoin: "round",
        };
      },
    }),
    L.layerGroup(
      labels.map((label) =>
        L.marker([label.lat, label.lon], {
          interactive: false,
          keyboard: false,
          icon: runwayLabelIcon(label.ident, theme),
          pane: ensureAirportMapPane(map, AIRPORT_MAP_PANES.badge),
        }),
      ),
    ),
  ];
};

export default function NearbyAirportLayer({ airports = [], theme = "dark", zoom }) {
  const map = useMapInstance();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!map || !map.getContainer) return undefined;

    layerRef.current?.removeFrom(map);
    const layer = L.layerGroup();

    for (const airport of airports) {
      if (!airport?.lat || !airport?.lon) continue;
      runwayLayers({ airport, map, theme, zoom }).forEach((runwayLayer) =>
        runwayLayer.addTo(layer),
      );
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
  }, [map, airports, theme, zoom]);

  return null;
}
