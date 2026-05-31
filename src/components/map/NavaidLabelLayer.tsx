"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { Rss } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import { useMapInstance } from "./MapContext";
import { AIRPORT_MAP_PANES } from "../../config/airportMap";
import { ensureAirportMapPane } from "../../features/airport/map/mapPane";
import {
  safeAddToMap,
  safeRemoveFromMap,
} from "../../features/airport/map/leafletLayerSafety";
import { buildNavaidLabels } from "../../features/airport/map/navaidLabelModel";

const formatFrequency = (frequencyKhz: number | null) => {
  if (!Number.isFinite(Number(frequencyKhz))) return "";
  const mhz = Number(frequencyKhz) / 1000;
  return mhz >= 100 ? mhz.toFixed(2).replace(/0$/, "") : String(frequencyKhz);
};

function NavaidSignalIcon() {
  return (
    <span className="navaid-label__signal" aria-hidden="true">
      <Rss
        aria-hidden="true"
        className="navaid-label__signal-svg"
        focusable="false"
        size={8}
        strokeWidth={2}
        absoluteStrokeWidth
      />
    </span>
  );
}

function NavaidLabelMarker({
  label,
  meta,
}: {
  label: Record<string, any>;
  meta: string;
}) {
  return (
    <div
      className="navaid-label navaid-label--signal-anchor notranslate"
      translate="no"
    >
      <NavaidSignalIcon />
      <span className="navaid-label__body">
        <strong>{label.ident}</strong>
        {meta ? <small>{meta}</small> : null}
      </span>
    </div>
  );
}

const navaidLabelIcon = (label: Record<string, any>, theme: string) => {
  const meta = [
    label.type,
    formatFrequency(label.frequencyKhz),
  ].filter(Boolean).join(" ");

  return L.divIcon({
    className: `navaid-label-icon navaid-label-icon--${theme}`,
    html: renderToStaticMarkup(
      <NavaidLabelMarker label={label} meta={meta} />,
    ),
    iconSize: [104, 20],
    iconAnchor: [4, 4],
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
