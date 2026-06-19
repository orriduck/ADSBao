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

const escapeHtml = (value: unknown) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const reportingPointMarkerHtml = (label: Record<string, any>) => `
  <div
    class="reporting-point-road-sign notranslate"
    translate="no"
    data-map-badge="true"
    data-map-badge-type="reporting-point"
  >
    <span class="reporting-point-road-sign__post" aria-hidden="true"></span>
    <span class="reporting-point-road-sign__blade">
      <span class="reporting-point-road-sign__tag" aria-hidden="true">RP</span>
      <span class="reporting-point-road-sign__name">${escapeHtml(label.name)}</span>
    </span>
  </div>
`;

const reportingPointLabelIcon = (label: Record<string, any>, theme: string) =>
  L.divIcon({
    className: [
      "reporting-point-label-icon",
      `reporting-point-label-icon--${theme}`,
    ].join(" "),
    html: reportingPointMarkerHtml(label),
    iconSize: [148, 44],
    iconAnchor: [6, 40],
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
