"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMapInstance } from "./MapContext.js";
import { AIRPORT_MAP_PANES } from "../../config/airportMap.js";
import { ensureAirportMapPane } from "../../features/airport/map/mapPane.js";
import { buildAirportRangeRings } from "../../features/airport/map/airportRangeRings.js";
import {
  buildRunwayCenterlineCollection,
  buildRunwayEndLabels,
} from "../../features/airport/map/runwayAnnotationModel.js";

// Default distance-ring band drawn around each nearby airport. Tighter
// than the primary's rings so the band stays a hint, not a dominant
// frame, when several nearby airports overlap. The flight-tracking
// page passes a coarser band (5nm → 15nm).
const DEFAULT_NEARBY_RING_INTERVAL_NM = 3;
const DEFAULT_NEARBY_RING_MAX_NM = 10;

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
        opacity: 0.5,
      }
    : {
        color: "#8fb7d6",
        weight: 3,
        opacity: 0.5,
      };

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
  const labels = buildRunwayEndLabels(airport.runwayMap, { zoom });

  return [
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

export default function NearbyAirportLayer({
  airports = [],
  theme = "dark",
  zoom,
  selectedIcao = "",
  onSelectAirport = null,
  ringIntervalNm = DEFAULT_NEARBY_RING_INTERVAL_NM,
  ringMaxNm = DEFAULT_NEARBY_RING_MAX_NM,
  ringProminent = false,
}) {
  const map = useMapInstance();
  const layerRef = useRef(null);
  // Keep the click handler in a ref so re-rendering the layer doesn't
  // require tearing down + re-adding the markers each time the callback
  // identity changes.
  const onSelectRef = useRef(onSelectAirport);
  onSelectRef.current = onSelectAirport;

  useEffect(() => {
    if (!map || !map.getContainer) return undefined;

    layerRef.current?.removeFrom(map);
    const layer = L.layerGroup();

    for (const airport of airports) {
      if (!airport?.lat || !airport?.lon) continue;
      runwayLayers({ airport, map, theme, zoom }).forEach((runwayLayer) =>
        runwayLayer.addTo(layer),
      );
      // Several nearby airports can overlap on the map; shaded bands
      // would stack into a dark blob, so the nearby ring stack is
      // stroke-only and the focal owns the shading. Callers can mark
      // a band as `prominent` so a single-ring stack (e.g. the
      // flight-page 5nm proximity ring) renders bold enough to read.
      buildAirportRangeRings(L, {
        lat: airport.lat,
        lon: airport.lon,
        intervalNm: ringIntervalNm,
        maxNm: ringMaxNm,
        theme,
        shaded: false,
        prominent: ringProminent,
      }).forEach((ring) => ring.addTo(layer));
      const interactive = Boolean(onSelectRef.current);
      const isSelected = selectedIcao && airport.icao === selectedIcao;
      const marker = L.marker([airport.lat, airport.lon], {
        interactive,
        keyboard: interactive,
        icon: L.divIcon({
          className: isSelected ? "nearby-airport-marker--selected" : "",
          html: markerHtml(airport),
          iconSize: [96, 24],
          iconAnchor: [12, 12],
        }),
      });
      if (interactive) {
        marker.on("click", (event) => {
          event?.originalEvent?.stopPropagation?.();
          onSelectRef.current?.(airport.icao);
        });
      }
      marker.addTo(layer);
    }

    layer.addTo(map);
    layerRef.current = layer;

    return () => {
      layer.removeFrom(map);
      layerRef.current = null;
    };
  }, [
    map,
    airports,
    theme,
    zoom,
    selectedIcao,
    ringIntervalNm,
    ringMaxNm,
    ringProminent,
  ]);

  return null;
}
