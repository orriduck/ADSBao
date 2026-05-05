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

export default function MapTileLayers({ theme = "dark", showLabels = true }) {
  const map = useMapInstance();
  const baseRef = useRef(null);
  const labelRef = useRef(null);

  useEffect(() => {
    if (!map || !map.getContainer) return undefined;
    const variant = TILE_VARIANTS[theme] || TILE_VARIANTS.dark;

    baseRef.current?.removeFrom(map);
    baseRef.current = L.tileLayer(variant.base, {
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);
    // Tag the layer container so CSS can blend the base tiles into the
    // canvas (ghost-lines-on-navy chart aesthetic, per .impeccable.md).
    baseRef.current.getContainer()?.classList.add("atc-tile-base");

    labelRef.current?.removeFrom(map);
    if (showLabels) {
      labelRef.current = L.tileLayer(variant.labels, {
        subdomains: "abcd",
        maxZoom: 20,
        opacity: variant.labelOpacity,
      }).addTo(map);
      labelRef.current.getContainer()?.classList.add("atc-tile-labels");
    }

    return () => {
      baseRef.current?.removeFrom(map);
      labelRef.current?.removeFrom(map);
      baseRef.current = null;
      labelRef.current = null;
    };
  }, [map, theme, showLabels]);

  return null;
}
