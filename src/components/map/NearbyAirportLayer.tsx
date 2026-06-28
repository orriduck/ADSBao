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
import {
  shouldShowNearbyAirportRunwaysForZoom,
  shouldShowRunwayEndLabelsForZoom,
} from "../../features/airport/map/airportMapZoomFeatures";
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

const setAirportMarkerSelectedClass = (marker: any, selected: boolean) => {
  const element = marker?.getElement?.() || marker?._icon;
  element?.classList?.toggle("nearby-airport-marker--selected", selected);
};

const runwayLayers = ({
  airport,
  map,
  theme,
  zoom,
  showRunways,
  showBadges,
}: Record<string, any>) => {
  if (!airport?.runwayMap?.runways?.length) return [];
  const centerlines = buildRunwayCenterlineCollection(airport.runwayMap);
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
            autoPanOnFocus: false,
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
  const airportMarkerLayerRef = useRef(null);
  const airportMarkerRefs = useRef(new Map());
  const runwayLayerRef = useRef(null);
  // Keep the click handler in a ref so re-rendering the layer doesn't
  // require tearing down + re-adding the markers each time the callback
  // identity changes.
  const onSelectRef = useRef(onSelectAirport);
  onSelectRef.current = onSelectAirport;
  const selectedIcaoRef = useRef(selectedIcao);
  selectedIcaoRef.current = selectedIcao;
  const showNearbyRunways = shouldShowNearbyAirportRunwaysForZoom(zoom);
  const showNearbyRunwayEndLabels =
    showRunwayBadges && shouldShowRunwayEndLabelsForZoom(zoom);
  const runwayLayerLabelZoom = showNearbyRunwayEndLabels ? zoom : null;
  const airportMarkersInteractive = Boolean(onSelectAirport);

  useEffect(() => {
    if (!map || !map.getContainer || !map.getPane) return undefined;

    safeRemoveFromMap(runwayLayerRef.current, map);
    const layer = L.layerGroup();

    for (const airport of airports) {
      runwayLayers({
        airport,
        map,
        theme,
        zoom: runwayLayerLabelZoom,
        showRunways: showNearbyRunways,
        showBadges: showNearbyRunwayEndLabels,
      }).forEach((runwayLayer) => runwayLayer.addTo(layer));
    }

    const added = safeAddToMap(layer, map, { label: "NearbyAirportLayer" });
    if (!added) return undefined;
    runwayLayerRef.current = layer;

    return () => {
      safeRemoveFromMap(layer, map);
      if (runwayLayerRef.current === layer) runwayLayerRef.current = null;
    };
  }, [
    map,
    airports,
    theme,
    runwayLayerLabelZoom,
    showNearbyRunways,
    showNearbyRunwayEndLabels,
  ]);

  useEffect(() => {
    if (!map || !map.getContainer || !map.getPane) return undefined;

    safeRemoveFromMap(airportMarkerLayerRef.current, map);
    airportMarkerRefs.current = new Map();
    if (!showAirportBadges) return undefined;

    const layer = L.layerGroup();
    for (const airport of airports) {
      if (!airport?.lat || !airport?.lon) continue;
      const isSelected =
        selectedIcaoRef.current && airport.icao === selectedIcaoRef.current;
      const marker = L.marker([airport.lat, airport.lon], {
        interactive: airportMarkersInteractive,
        autoPanOnFocus: false,
        keyboard: false,
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
      if (airportMarkersInteractive) {
        marker.on("click", (event) => {
          event?.originalEvent?.stopPropagation?.();
          onSelectRef.current?.(airport.icao);
        });
      }
      marker.addTo(layer);
      if (airport.icao) airportMarkerRefs.current.set(airport.icao, marker);
    }

    const added = safeAddToMap(layer, map, { label: "NearbyAirportMarkerLayer" });
    if (!added) {
      airportMarkerRefs.current = new Map();
      return undefined;
    }
    airportMarkerLayerRef.current = layer;

    return () => {
      safeRemoveFromMap(layer, map);
      if (airportMarkerLayerRef.current === layer) {
        airportMarkerLayerRef.current = null;
      }
      airportMarkerRefs.current = new Map();
    };
  }, [
    map,
    airports,
    showAirportBadges,
    airportMarkersInteractive,
  ]);

  useEffect(() => {
    airportMarkerRefs.current.forEach((marker, icao) => {
      setAirportMarkerSelectedClass(marker, Boolean(selectedIcao && icao === selectedIcao));
    });
  }, [selectedIcao]);

  return null;
}
