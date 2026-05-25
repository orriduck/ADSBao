"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "@maplibre/maplibre-gl-leaflet";
import { useMapInstance } from "./MapContext.js";

export default function MapTileLayers({
  theme = "dark",
  locale = "en",
  showLabels = true,
  selectionActive = false,
}) {
  const map = useMapInstance();
  const layerRef = useRef(null);
  const selectionActiveRef = useRef(selectionActive);

  useEffect(() => {
    selectionActiveRef.current = selectionActive;
  }, [selectionActive]);

  useEffect(() => {
    if (!hasTilePane(map)) return undefined;
    const abort = new AbortController();
    let cancelled = false;

    loadLocalizedMapStyle({ theme, locale, showLabels, signal: abort.signal })
      .then((style) => {
        if (cancelled || !hasTilePane(map)) return;
        removeLayer(layerRef.current, map);
        layerRef.current = L.maplibreGL({
          style,
          interactive: false,
          attributionControl: false,
          className: "atc-maplibre-base",
        }).addTo(map);
        layerRef.current.getContainer()?.classList.add("atc-tile-base");
        setSelectionOpacity(layerRef.current, theme, selectionActiveRef.current);
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
  }, [map, theme, locale, showLabels]);

  useEffect(() => {
    setSelectionOpacity(layerRef.current, theme, selectionActive);
  }, [selectionActive, theme]);

  return null;
}

async function loadLocalizedMapStyle({ theme, locale, showLabels, signal }) {
  const params = new URLSearchParams({
    locale,
    labels: showLabels ? "1" : "0",
  });
  return requestJson(`/api/proxy/map-style/${theme}?${params}`, { signal });
}

async function requestJson(url, { signal } = {}) {
  if (typeof fetch === "function") {
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`OpenFreeMap style request failed: ${response.status}`);
    }
    return response.json();
  }

  return requestJsonWithXhr(url, { signal });
}

function requestJsonWithXhr(url, { signal } = {}) {
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

function setSelectionOpacity(layer, theme, selectionActive) {
  const container = layer?.getContainer?.();
  if (!container) return;
  if (selectionActive) {
    container.style.opacity = theme === "light" ? "0.92" : "0.88";
    return;
  }
  container.style.opacity = "1";
}
