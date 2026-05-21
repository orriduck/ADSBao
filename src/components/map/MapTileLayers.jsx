"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMapInstance } from "./MapContext.js";

const TILE_VARIANTS = {
  light: {
    base: "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}@2x.png",
    labels:
      "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}@2x.png",
    labelOpacity: 0.66,
  },
  dark: {
    base: "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png",
    labels:
      "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}@2x.png",
    labelOpacity: 0.55,
  },
};

export default function MapTileLayers({
  theme = "dark",
  showLabels = true,
  selectionActive = false,
}) {
  const map = useMapInstance();
  const baseRef = useRef(null);
  const labelRef = useRef(null);

  useEffect(() => {
    if (!hasTilePane(map)) return undefined;
    const variant = TILE_VARIANTS[theme] || TILE_VARIANTS.dark;

    removeLayer(baseRef.current, map);
    baseRef.current = L.tileLayer(variant.base, {
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);
    // Tag the layer container so CSS can blend the base tiles into the
    // canvas using the monochrome manual-map aesthetic.
    baseRef.current.getContainer()?.classList.add("atc-tile-base");

    removeLayer(labelRef.current, map);
    if (showLabels) {
      labelRef.current = L.tileLayer(variant.labels, {
        subdomains: "abcd",
        maxZoom: 20,
        opacity: variant.labelOpacity,
      }).addTo(map);
      labelRef.current.getContainer()?.classList.add("atc-tile-labels");
    }

    return () => {
      removeLayer(baseRef.current, map);
      removeLayer(labelRef.current, map);
      baseRef.current = null;
      labelRef.current = null;
    };
  }, [map, theme, showLabels]);

  useEffect(() => {
    const baseLayer = baseRef.current;
    const labelLayer = labelRef.current;
    if (!baseLayer) return;

    if (selectionActive) {
      // Lighter selection-mode dim than before (0.72/0.78) — enough to
      // signal focus mode but not so heavy that other aircraft / map
      // context vanish under the mask.
      baseLayer.setOpacity(theme === "light" ? 0.92 : 0.88);
      if (labelLayer) {
        labelLayer.setOpacity(theme === "light" ? 0.55 : 0.5);
      }
      return;
    }

    const variant = TILE_VARIANTS[theme] || TILE_VARIANTS.dark;
    baseLayer.setOpacity(1);
    if (labelLayer) labelLayer.setOpacity(variant.labelOpacity);
  }, [selectionActive, theme, showLabels]);

  return null;
}

function hasTilePane(map) {
  if (!map || typeof map.getContainer !== "function") return false;
  const container = map.getContainer();
  return Boolean(container?.isConnected && map._panes?.tilePane);
}

function removeLayer(layer, map) {
  if (!layer || !map || typeof layer.removeFrom !== "function") return;
  if (!map._panes) return;
  layer.removeFrom(map);
}
