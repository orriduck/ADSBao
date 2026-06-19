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
        icon: "reporting-point",
        badgeType: "reporting-point",
        className: "airport-overlay-label--map-badge airport-overlay-label--reporting-point",
      })}
    </div>
  </div>
`;

const reportingPointLabelIcon = (
  label: Record<string, any>,
  theme: string,
  selectedReportingPointKey: string,
) => {
  const isSelected =
    selectedReportingPointKey && selectedReportingPointKey === label.key;
  return L.divIcon({
    className: [
      "reporting-point-label-icon",
      `reporting-point-label-icon--${theme}`,
      isSelected ? "reporting-point-label-icon--selected" : "",
    ].filter(Boolean).join(" "),
    html: reportingPointMarkerHtml(label),
    iconSize: [136, 78],
    iconAnchor: [4, 4],
  });
};

export default function ReportingPointLabelLayer({
  points = [],
  theme = "dark",
  visible = false,
  selectedReportingPointKey = "",
  onSelectReportingPoint = null,
}: Record<string, any>) {
  const map = useMapInstance();
  const layerRef = useRef(null);
  const onSelectRef = useRef(onSelectReportingPoint);
  onSelectRef.current = onSelectReportingPoint;

  useEffect(() => {
    if (!map || !visible) return undefined;

    safeRemoveFromMap(layerRef.current, map);
    const labels = buildReportingPointLabels(points);
    if (!labels.length) return undefined;

    const pane = ensureAirportMapPane(map, AIRPORT_MAP_PANES.badge);
    const layer = L.layerGroup(
      labels.map((label) => {
        const interactive = Boolean(onSelectRef.current);
        const marker = L.marker([label.lat, label.lon], {
          interactive,
          autoPanOnFocus: false,
          keyboard: false,
          title: label.name,
          icon: reportingPointLabelIcon(label, theme, selectedReportingPointKey),
          pane,
        });
        if (interactive) {
          const selectReportingPoint = (event) => {
            event?.originalEvent?.stopPropagation?.();
            event?.stopPropagation?.();
            event?.preventDefault?.();
            onSelectRef.current?.(label.key);
          };
          marker.on("click", selectReportingPoint);
          marker.on("add", () => {
            const element = marker.getElement();
            element
              ?.querySelectorAll(
                ".navaid-map-marker__dot, [data-map-badge-type='reporting-point']",
              )
              .forEach((target) => {
                target.addEventListener("click", selectReportingPoint);
              });
          });
        }
        return marker;
      }),
    );

    const added = safeAddToMap(layer, map, { label: "ReportingPointLabelLayer" });
    if (!added) return undefined;
    layerRef.current = layer;

    return () => {
      safeRemoveFromMap(layer, map);
      layerRef.current = null;
    };
  }, [map, points, theme, visible, selectedReportingPointKey]);

  return null;
}
