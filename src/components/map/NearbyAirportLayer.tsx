"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMapInstance } from "./MapContext";
import { AIRPORT_MAP_PANES } from "../../config/airportMap";
import { ensureAirportMapPane } from "../../features/airport/map/mapPane";
import {
  safeAddToMap,
  safeRemoveFromMap,
} from "../../features/airport/map/leafletLayerSafety";
import {
  buildRunwayCenterlineCollection,
  buildRunwayEndLabels,
} from "../../features/airport/map/runwayAnnotationModel";
import { shouldShowNearbyAirportRunwaysForZoom } from "../../features/airport/map/airportMapZoomFeatures";
import { airportLabelBadgeHtml } from "@/components/ui/AirportLabelBadge";

const escapeHtml = (value: unknown) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const airportLabel = (airport: Record<string, any>) => airport.iata || airport.icao || "";

const markerHtml = (airport: Record<string, any>) => {
  const code = airportLabel(airport);
  const distance = Number.isFinite(airport.distanceNm)
    ? Math.round(airport.distanceNm)
    : null;
  // Two parts: the dot sits exactly on the airport position; the label
  // stack (code pill + distance pill) is offset down-left so the runway
  // / centerline at the airport stays visible underneath.
  const badge = airportLabelBadgeHtml({
    code,
    className: "nearby-airport-marker-label",
    // Distance shown as "DIST 14NM" — label is the noun ("DIST"), value
    // is the magnitude with unit suffix concatenated so the unit reads
    // as part of the number, not as a separate caption.
    details:
      distance != null
        ? [{ key: "dist", variant: "near", label: "DIST", value: `${distance}NM` }]
        : [],
  });
  return `
    <div class="nearby-airport-marker notranslate" translate="no">
      <span class="nearby-airport-marker-dot"></span>
      ${badge}
    </div>
  `;
};

const runwayLineStyle = (theme: string) =>
  theme === "light"
    ? {
        color: "var(--nearby-runway-line)",
        weight: 3,
        opacity: 0.5,
      }
    : {
        color: "var(--nearby-runway-line)",
        weight: 3,
        opacity: 0.5,
      };

const runwayLabelIcon = (ident: string, theme: string) =>
  L.divIcon({
    className: `runway-end-label runway-end-label--nearby runway-end-label--${theme}`,
    html: `<span class="notranslate" translate="no">${escapeHtml(ident)}</span>`,
    iconSize: [34, 18],
    iconAnchor: [17, 22],
  });

const runwayLayers = ({ airport, map, theme, zoom, showBadges }: Record<string, any>) => {
  if (!airport?.runwayMap?.runways?.length) return [];
  const centerlines = buildRunwayCenterlineCollection(airport.runwayMap);
  const showRunways = shouldShowNearbyAirportRunwaysForZoom(zoom);
  if (!showRunways) return [];

  const layers = [
    L.geoJSON(centerlines as any, {
      interactive: false,
      style() {
        return {
          ...runwayLineStyle(theme),
          lineCap: "butt",
          lineJoin: "round",
        };
      },
    }),
  ];

  if (showBadges) {
    const labels = buildRunwayEndLabels(airport.runwayMap, { zoom });
    layers.push(
      L.layerGroup(
        labels.map((label) =>
          L.marker([label.lat, label.lon], {
            interactive: false,
            keyboard: false,
            icon: runwayLabelIcon(label.ident, theme),
            pane: ensureAirportMapPane(map, AIRPORT_MAP_PANES.badge),
          }),
        ),
      ) as any,
    );
  }

  return layers;
};

export default function NearbyAirportLayer({
  airports = [],
  theme = "dark",
  zoom,
  selectedIcao = "",
  onSelectAirport = null,
  showRunwayBadges = true,
}: Record<string, any>) {
  const map = useMapInstance();
  const layerRef = useRef(null);
  // Keep the click handler in a ref so re-rendering the layer doesn't
  // require tearing down + re-adding the markers each time the callback
  // identity changes.
  const onSelectRef = useRef(onSelectAirport);
  onSelectRef.current = onSelectAirport;

  useEffect(() => {
    if (!map || !map.getContainer || !map.getPane) return undefined;

    safeRemoveFromMap(layerRef.current, map);
    const layer = L.layerGroup();

    for (const airport of airports) {
      if (!airport?.lat || !airport?.lon) continue;
      runwayLayers({ airport, map, theme, zoom, showBadges: showRunwayBadges }).forEach((runwayLayer) =>
        runwayLayer.addTo(layer),
      );
      const interactive = Boolean(onSelectRef.current);
      const isSelected = selectedIcao && airport.icao === selectedIcao;
      const marker = L.marker([airport.lat, airport.lon], {
        interactive,
        keyboard: interactive,
        icon: L.divIcon({
          className: isSelected ? "nearby-airport-marker--selected" : "",
          html: markerHtml(airport),
          // iconSize/anchor are sized to the dot only — the badge is
          // absolutely positioned and overflows; CSS handles its offset.
          iconSize: [6, 6],
          iconAnchor: [3, 3],
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

    const added = safeAddToMap(layer, map, { label: "NearbyAirportLayer" });
    if (!added) return undefined;
    layerRef.current = layer;

    return () => {
      safeRemoveFromMap(layer, map);
      layerRef.current = null;
    };
  }, [
    map,
    airports,
    theme,
    zoom,
    selectedIcao,
    showRunwayBadges,
  ]);

  return null;
}
