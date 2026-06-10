"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMapInstance } from "./MapContext";
import { shouldLogMapTileLayerFailure } from "@/features/airport/map/mapTileLayerModel";
import { isLightMapTheme } from "@/features/airport/map/airportMapModel";

// Raster base tiles (CARTO) instead of the MapLibre GL vector layer.
//
// Why: the frosted-glass panels rely on `backdrop-filter: blur()`, and Chrome
// cannot blur a MapLibre/WebGL <canvas> backdrop — the GL canvas composites on
// a separate layer that the filter can't sample, so panels showed the map
// sharp ("see-through but no blur"). Raster <img> tiles are rasterized into the
// normal paint tree, so the panels' backdrop-filter blurs them correctly.
//
// Light theme uses CARTO's colored "voyager" style (green land, blue water)
// so the basemap keeps natural color; dark theme uses CARTO dark-matter
// (CARTO has no colored dark variant). The `.atc-tile-base` filter in
// style.css only lightly tones these now so the green/blue reads through.
//
// Labels are intentionally OFF in every mode (CARTO `*_nolabels`): the map is
// a clean base for the frosted panels + aircraft/airport overlays.

function rasterTileUrl(theme: string) {
  return isLightMapTheme(theme)
    ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png`
    : `https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png`;
}

export default function MapTileLayers({
  theme = "dark",
  selectionActive = false,
}: Record<string, any>) {
  const map = useMapInstance();
  const layerRef = useRef(null);
  const selectionActiveRef = useRef(selectionActive);

  useEffect(() => {
    selectionActiveRef.current = selectionActive;
  }, [selectionActive]);

  useEffect(() => {
    if (!hasTilePane(map)) return undefined;
    removeLayer(layerRef.current, map);

    let nextLayer = null;
    try {
      nextLayer = L.tileLayer(rasterTileUrl(theme), {
        subdomains: "abcd",
        maxZoom: 20,
        detectRetina: true,
        updateWhenIdle: false,
        keepBuffer: 4,
        className: "atc-tile-base",
        attribution:
          '© OpenStreetMap contributors © CARTO',
      });
      nextLayer.addTo(map);
      layerRef.current = nextLayer;
      setSelectionOpacity(layerRef.current, theme, selectionActiveRef.current);
    } catch (error) {
      removeLayer(nextLayer, map);
      layerRef.current = null;
      if (shouldLogMapTileLayerFailure(error)) {
        console.error("[airport-map] failed to initialize map tiles", error);
      }
    }

    return () => {
      removeLayer(layerRef.current, map);
      layerRef.current = null;
    };
  }, [map, theme]);

  useEffect(() => {
    setSelectionOpacity(layerRef.current, theme, selectionActive);
  }, [selectionActive, theme]);

  return null;
}

function hasTilePane(map: any) {
  if (!map || typeof map.getContainer !== "function") return false;
  const container = map.getContainer();
  return Boolean(container?.isConnected && map._panes?.tilePane);
}

function removeLayer(layer: any, map: any) {
  if (!layer || !map || typeof layer.removeFrom !== "function") return;
  if (!map._panes) return;
  try {
    layer.removeFrom(map);
  } catch (error) {
    if (shouldLogMapTileLayerFailure(error)) {
      console.error("[airport-map] failed to remove map tiles", error);
    }
  }
}

function setSelectionOpacity(layer, theme, selectionActive) {
  const container = layer?.getContainer?.();
  if (!container) return;
  if (selectionActive) {
    container.style.opacity = isLightMapTheme(theme) ? "0.92" : "0.88";
    return;
  }
  container.style.opacity = "1";
}
