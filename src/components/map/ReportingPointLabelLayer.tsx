import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMapInstance } from "./MapContext";
import { AIRPORT_MAP_PANES } from "../../config/airportMap";
import { ensureAirportMapPane } from "../../features/airport/map/mapPane";
import {
  safeAddToMap,
  safeRemoveFromMap,
} from "../../features/airport/map/leafletLayerSafety";
import { buildReportingPointLabels } from "../../features/airport/map/reportingPointLabelModel";
import { airportLabelBadgeHtml } from "@/components/ui/AirportLabelBadge";

const reportingPointMarkerHtml = (label: Record<string, any>) => `
  <div class="navaid-map-marker reporting-point-map-marker notranslate" translate="no">
    <span class="navaid-map-marker__dot" aria-hidden="true"></span>
    <div class="navaid-map-marker__badge">
      ${airportLabelBadgeHtml({
        code: label.name,
        icon: "navaid",
        badgeType: "reporting-point",
        className: "airport-overlay-label--map-badge airport-overlay-label--navaid airport-overlay-label--reporting-point",
      })}
    </div>
  </div>
`;

const reportingPointLabelIcon = (label: Record<string, any>, theme: string) =>
  L.divIcon({
    className: [
      "reporting-point-label-icon",
      `reporting-point-label-icon--${theme}`,
    ].join(" "),
    html: reportingPointMarkerHtml(label),
    iconSize: [136, 78],
    iconAnchor: [4, 4],
  });

export default function ReportingPointLabelLayer({
  points = [],
  theme = "dark",
  visible = false,
}: Record<string, any>) {
  const map = useMapInstance();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!map || !visible) return undefined;

    safeRemoveFromMap(layerRef.current, map);
    const labels = buildReportingPointLabels(points);
    if (!labels.length) return undefined;

    const pane = ensureAirportMapPane(map, AIRPORT_MAP_PANES.badge);
    const layer = L.layerGroup(
      labels.map((label) =>
        L.marker([label.lat, label.lon], {
          interactive: false,
          autoPanOnFocus: false,
          keyboard: false,
          title: label.name,
          icon: reportingPointLabelIcon(label, theme),
          pane,
        }),
      ),
    );

    const added = safeAddToMap(layer, map, { label: "ReportingPointLabelLayer" });
    if (!added) return undefined;
    layerRef.current = layer;

    return () => {
      safeRemoveFromMap(layer, map);
      layerRef.current = null;
    };
  }, [map, points, theme, visible]);

  return null;
}
