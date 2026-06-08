"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "@maplibre/maplibre-gl-leaflet";
import { useMapInstance } from "./MapContext";
import {
  shouldAttemptMapLibreTiles,
  shouldLogMapTileLayerFailure,
  shouldSuppressMapLibreTileError,
} from "@/features/airport/map/mapTileLayerModel";
import { isLightMapTheme } from "@/features/airport/map/airportMapModel";

const MAP_STYLE_THEME_REVISION = "standard-detail-v9";

export default function MapTileLayers({
  theme = "dark",
  locale = "en",
  showLabels = true,
  baseLayer = "terrain",
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
    if (
      !shouldAttemptMapLibreTiles({
        userAgent: navigator.userAgent,
        webGlAvailable: hasWebGlContext(),
      })
    ) {
      return undefined;
    }
    const abort = new AbortController();
    let cancelled = false;

    loadLocalizedMapStyle({
      theme,
      locale,
      showLabels,
      baseLayer,
      signal: abort.signal,
    })
      .then((style) => {
        if (cancelled || !hasTilePane(map)) return;
        removeLayer(layerRef.current, map);
        let nextLayer = null;
        try {
          nextLayer = L.maplibreGL({
            style,
            interactive: false,
            attributionControl: false,
            className: "atc-maplibre-base",
          } as any);
          guardMapLibreLayerLifecycle(nextLayer);
          nextLayer.addTo(map);
          attachMapLibreErrorHandler(nextLayer);
          layerRef.current = nextLayer;
          layerRef.current.getContainer()?.classList.add("atc-tile-base");
          setSelectionOpacity(layerRef.current, theme, selectionActiveRef.current);
        } catch (error) {
          removeLayer(nextLayer, map);
          layerRef.current = null;
          if (shouldLogMapTileLayerFailure(error)) {
            console.error("[airport-map] failed to initialize map tiles", error);
          }
        }
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        console.error("[airport-map] failed to load localized map tiles", error);
      });

    return () => {
      cancelled = true;
      abort.abort();
      removeLayer(layerRef.current, map);
      layerRef.current = null;
    };
  }, [map, theme, locale, showLabels, baseLayer]);

  useEffect(() => {
    setSelectionOpacity(layerRef.current, theme, selectionActive);
  }, [selectionActive, theme]);

  return null;
}

async function loadLocalizedMapStyle({
  theme,
  locale,
  showLabels,
  baseLayer,
  signal,
}: Record<string, any>) {
  const params = new URLSearchParams({
    locale,
    labels: showLabels ? "1" : "0",
    v: MAP_STYLE_THEME_REVISION,
  });
  if (baseLayer) params.set("baseLayer", baseLayer);
  return requestJson(`/api/proxy/map-style/${theme}?${params}`, { signal });
}

async function requestJson(url: string, { signal }: Record<string, any> = {}) {
  if (typeof fetch === "function") {
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`OpenFreeMap style request failed: ${response.status}`);
    }
    return response.json();
  }

  return requestJsonWithXhr(url, { signal });
}

function requestJsonWithXhr(url: string, { signal }: Record<string, any> = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "json";
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`OpenFreeMap style request failed: ${xhr.status}`));
        return;
      }
      resolve(xhr.response || JSON.parse(xhr.responseText));
    };
    xhr.onerror = () => {
      reject(new Error("OpenFreeMap style request failed"));
    };
    xhr.onabort = () => {
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send();
  });
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

function guardMapLibreLayerLifecycle(layer: any) {
  if (!layer) return;
  const guardMethod = (name: string) => {
    const original = layer[name];
    if (typeof original !== "function") return;
    layer[name] = function guardedMapLibreHandler(...args) {
      if (!this?._map || !this?._glMap) return undefined;
      return original.apply(this, args);
    };
  };

  guardMethod("_pinchZoom");
  guardMethod("_animateZoom");
  guardMethod("_zoomStart");
  guardMethod("_zoomEnd");
  guardMethod("_transitionEnd");
  guardMethod("_update");
  if (typeof layer._throttledUpdate === "function") {
    const originalThrottledUpdate = layer._throttledUpdate;
    layer._throttledUpdate = function guardedMapLibreThrottledUpdate(...args) {
      if (!this?._map || !this?._glMap) return undefined;
      return originalThrottledUpdate.apply(this, args);
    };
  }
}

function attachMapLibreErrorHandler(layer: any) {
  const maplibreMap = layer?.getMaplibreMap?.();
  if (!maplibreMap || typeof maplibreMap.on !== "function") return;

  maplibreMap.on("error", (event) => {
    if (shouldSuppressMapLibreTileError(event)) return;
    console.error("[airport-map] map tile error", event?.error || event);
  });
}

function hasWebGlContext() {
  const canvas = document.createElement("canvas");
  const context =
    canvas.getContext("webgl2") ||
    canvas.getContext("webgl") ||
    canvas.getContext("experimental-webgl");
  return Boolean(context);
}
