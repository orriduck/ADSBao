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
import { airportDisplayCode } from "@/utils/airport";

const escapeHtml = (value: unknown) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const airportLabel = (airport: Record<string, any>) => airportDisplayCode(airport);

const markerHtml = (airport: Record<string, any>) => {
  const code = airportLabel(airport);
  const distance = Number.isFinite(airport.distanceNm)
    ? Math.round(airport.distanceNm)
    : null;
  return airportLabelBadgeHtml({
    code,
    codeSuffix: distance != null ? `${distance}NM` : "",
    badgeType: "nearby-airport",
    className: "airport-overlay-label--map-badge airport-overlay-label--nearby-airport",
  });
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
          className: "nearby-runway-line",
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
  showAirportBadges = true,
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
      if (!showAirportBadges) continue;
      const interactive = Boolean(onSelectRef.current);
      const isSelected = selectedIcao && airport.icao === selectedIcao;
      const marker = L.marker([airport.lat, airport.lon], {
        interactive,
        keyboard: interactive,
        pane: ensureAirportMapPane(map, AIRPORT_MAP_PANES.badge),
        icon: L.divIcon({
          className: [
            "nearby-airport-marker-icon",
            isSelected ? "nearby-airport-marker--selected" : "",
          ].filter(Boolean).join(" "),
          html: markerHtml(airport),
          iconSize: [128, 78],
          iconAnchor: [0, -8],
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
    showAirportBadges,
    showRunwayBadges,
  ]);

  return null;
}
