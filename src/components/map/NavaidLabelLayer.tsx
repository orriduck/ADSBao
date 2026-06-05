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
import { buildNavaidLabels } from "../../features/airport/map/navaidLabelModel";
import { airportLabelBadgeHtml } from "@/components/ui/AirportLabelBadge";

const navaidMarkerHtml = (label: Record<string, any>) => `
  <div class="navaid-map-marker notranslate" translate="no">
    <span class="navaid-map-marker__dot" aria-hidden="true"></span>
    <div class="navaid-map-marker__badge">
      ${airportLabelBadgeHtml({
        code: label.ident || label.name,
        icon: "navaid",
        badgeType: "navaid",
        className: "airport-overlay-label--map-badge airport-overlay-label--navaid",
      })}
    </div>
  </div>
`;

const navaidLabelIcon = (
  label: Record<string, any>,
  theme: string,
  selectedNavaidKey: string,
) => {
  const isSelected = selectedNavaidKey && selectedNavaidKey === label.key;
  return L.divIcon({
    className: [
      "navaid-label-icon",
      `navaid-label-icon--${theme}`,
      isSelected ? "navaid-label-icon--selected" : "",
    ].filter(Boolean).join(" "),
    html: navaidMarkerHtml(label),
    iconSize: [136, 78],
    iconAnchor: [4, 4],
  });
};

export default function NavaidLabelLayer({
  navaids = [],
  theme = "dark",
  visible = false,
  selectedNavaidKey = "",
  onSelectNavaid = null,
}: Record<string, any>) {
  const map = useMapInstance();
  const layerRef = useRef(null);
  const onSelectRef = useRef(onSelectNavaid);
  onSelectRef.current = onSelectNavaid;

  useEffect(() => {
    if (!map || !visible) return undefined;

    safeRemoveFromMap(layerRef.current, map);
    const labels = buildNavaidLabels(navaids);
    if (!labels.length) return undefined;

    const pane = ensureAirportMapPane(map, AIRPORT_MAP_PANES.badge);
    const layer = L.layerGroup(
      labels.map((label) => {
        const interactive = Boolean(onSelectRef.current);
        const marker = L.marker([label.lat, label.lon], {
          interactive,
          keyboard: interactive,
          title: [label.ident, label.name, label.type].filter(Boolean).join(" "),
          icon: navaidLabelIcon(label, theme, selectedNavaidKey),
          pane,
        });
        if (interactive) {
          marker.on("click", (event) => {
            event?.originalEvent?.stopPropagation?.();
            onSelectRef.current?.(label.key);
          });
        }
        return marker;
      }),
    );

    const added = safeAddToMap(layer, map, { label: "NavaidLabelLayer" });
    if (!added) return undefined;
    layerRef.current = layer;

    return () => {
      safeRemoveFromMap(layer, map);
      layerRef.current = null;
    };
  }, [map, navaids, theme, visible, selectedNavaidKey]);

  return null;
}
