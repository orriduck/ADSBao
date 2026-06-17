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
import {
  buildLocalizedMapLibreStyle,
  buildProxiedMapLibreStyle,
  buildReadableTerrainMapLibreStyle,
  buildStandardDetailMapLibreStyle,
  shouldApplyReadableTerrain,
  shouldApplyStandardDetail,
} from "@/features/airport/map/mapTileLanguageModel";
import { MAP_TILE_READY_CUTOFF_MS } from "@/features/airport/map/mapVisualReadinessModel";

const MAP_STYLE_THEME_REVISION = "standard-detail-v10";

export default function MapTileLayers({
  theme = "dark",
  locale = "en",
  showLabels = true,
  baseLayer = "terrain",
  selectionActive = false,
  onReadinessChange = null,
}: Record<string, any>) {
  const map = useMapInstance();
  const layerRef = useRef(null);
  const selectionActiveRef = useRef(selectionActive);

  useEffect(() => {
    selectionActiveRef.current = selectionActive;
  }, [selectionActive]);

  useEffect(() => {
    if (!hasTilePane(map)) {
      onReadinessChange?.({ ready: true, reason: "no-tile-pane" });
      return undefined;
    }
    if (
      !shouldAttemptMapLibreTiles({
        userAgent: navigator.userAgent,
        webGlAvailable: hasWebGlContext(),
      })
    ) {
      onReadinessChange?.({ ready: true, reason: "webgl-unavailable" });
      return undefined;
    }
    const abort = new AbortController();
    let cancelled = false;
    let cleanupReadinessWatcher: (() => void) | null = null;
    onReadinessChange?.({ ready: false, reason: "loading" });

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
          const maplibreMap = nextLayer.getMaplibreMap?.();
          if (
            maplibreMap &&
            typeof maplibreMap.setMaxTileCacheSize === "function"
          ) {
            maplibreMap.setMaxTileCacheSize(512);
          }
          cleanupReadinessWatcher = watchMapLibreReadiness(maplibreMap, {
            isCancelled: () => cancelled,
            onReady: (reason) => onReadinessChange?.({ ready: true, reason }),
          });
          setSelectionOpacity(
            layerRef.current,
            theme,
            selectionActiveRef.current,
          );
        } catch (error) {
          removeLayer(nextLayer, map);
          layerRef.current = null;
          onReadinessChange?.({ ready: true, reason: "init-failed" });
          if (shouldLogMapTileLayerFailure(error)) {
            console.error("[airport-map] failed to initialize map tiles", error);
          }
        }
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        onReadinessChange?.({ ready: true, reason: "style-failed" });
        console.error("[airport-map] failed to load localized map tiles", error);
      });

    return () => {
      cancelled = true;
      abort.abort();
      cleanupReadinessWatcher?.();
      removeLayer(layerRef.current, map);
      layerRef.current = null;
    };
  }, [map, theme, locale, showLabels, baseLayer, onReadinessChange]);

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
  const upstreamStyle = await requestJson(`/api/proxy/map-style/${theme}?${params}`, { signal });
  const proxiedStyle = buildProxiedMapLibreStyle(upstreamStyle);
  const themedStyle = resolveClientMapStyle({
    style: proxiedStyle,
    theme,
    baseLayer,
  });
  return buildLocalizedMapLibreStyle(themedStyle, { locale, showLabels });
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

function resolveClientMapStyle({
  style,
  theme,
  baseLayer,
}: {
  style: Record<string, any>;
  theme: string;
  baseLayer?: string;
}) {
  if (shouldApplyReadableTerrain(baseLayer)) {
    return buildReadableTerrainMapLibreStyle(style, { theme });
  }
  if (shouldApplyStandardDetail(baseLayer)) {
    return buildStandardDetailMapLibreStyle(style, { theme });
  }
  return style;
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

function watchMapLibreReadiness(
  maplibreMap: any,
  {
    isCancelled,
    onReady,
  }: {
    isCancelled?: () => boolean;
    onReady?: (reason: string) => void;
  } = {},
) {
  if (!maplibreMap || typeof onReady !== "function") {
    onReady?.("unavailable");
    return () => {};
  }

  let settled = false;
  const cleanupFns: Array<() => void> = [];
  const markReady = (reason: string) => {
    if (settled || isCancelled?.()) return;
    settled = true;
    cleanupFns.forEach((cleanup) => cleanup());
    onReady(reason);
  };
  const on = (eventName: string, reason: string) => {
    if (typeof maplibreMap.once !== "function") return;
    const handler = () => markReady(reason);
    maplibreMap.once(eventName, handler);
    if (typeof maplibreMap.off === "function") {
      cleanupFns.push(() => maplibreMap.off(eventName, handler));
    }
  };

  on("idle", "idle");
  on("load", "load");

  const timeout = window.setTimeout(
    () => markReady("cutoff"),
    MAP_TILE_READY_CUTOFF_MS,
  );
  cleanupFns.push(() => window.clearTimeout(timeout));

  if (typeof maplibreMap.loaded === "function" && maplibreMap.loaded()) {
    window.setTimeout(() => markReady("already-loaded"), 0);
  }

  return () => {
    settled = true;
    cleanupFns.forEach((cleanup) => cleanup());
  };
}

function hasWebGlContext() {
  const canvas = document.createElement("canvas");
  const context =
    canvas.getContext("webgl2") ||
    canvas.getContext("webgl") ||
    canvas.getContext("experimental-webgl");
  return Boolean(context);
}
