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

const escapeHtml = (value: unknown) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatFrequency = (frequencyKhz: number | null) => {
  if (!Number.isFinite(Number(frequencyKhz))) return "";
  const mhz = Number(frequencyKhz) / 1000;
  return mhz >= 100 ? mhz.toFixed(2).replace(/0$/, "") : String(frequencyKhz);
};

const navaidLabelIcon = (label: Record<string, any>, theme: string) => {
  const meta = [
    label.type,
    formatFrequency(label.frequencyKhz),
  ].filter(Boolean).join(" ");

  return L.divIcon({
    className: `navaid-label-icon navaid-label-icon--${theme}`,
    html: `
      <div class="navaid-label notranslate" translate="no">
        <span class="navaid-label__signal" aria-hidden="true">
          <span class="navaid-label__signal-dot"></span>
          <span class="navaid-label__signal-arc navaid-label__signal-arc--inner"></span>
          <span class="navaid-label__signal-arc navaid-label__signal-arc--outer"></span>
        </span>
        <span class="navaid-label__body">
          <strong>${escapeHtml(label.ident)}</strong>
          ${meta ? `<small>${escapeHtml(meta)}</small>` : ""}
        </span>
      </div>
    `,
    iconSize: [72, 24],
    iconAnchor: [8, 12],
  });
};

export default function NavaidLabelLayer({
  navaids = [],
  theme = "dark",
  visible = false,
}: Record<string, any>) {
  const map = useMapInstance();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!map || !visible) return undefined;

    safeRemoveFromMap(layerRef.current, map);
    const labels = buildNavaidLabels(navaids);
    if (!labels.length) return undefined;

    const pane = ensureAirportMapPane(map, AIRPORT_MAP_PANES.badge);
    const layer = L.layerGroup(
      labels.map((label) =>
        L.marker([label.lat, label.lon], {
          interactive: false,
          keyboard: false,
          title: [label.ident, label.name, label.type].filter(Boolean).join(" "),
          icon: navaidLabelIcon(label, theme),
          pane,
        }),
      ),
    );

    const added = safeAddToMap(layer, map, { label: "NavaidLabelLayer" });
    if (!added) return undefined;
    layerRef.current = layer;

    return () => {
      safeRemoveFromMap(layer, map);
      layerRef.current = null;
    };
  }, [map, navaids, theme, visible]);

  return null;
}
