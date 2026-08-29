import { useEffect, useRef, useState } from "react";
import {
  shouldAttemptMapLibreTiles,
  shouldLogMapTileLayerFailure,
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
const MAP_TILE_REBUILD_AFTER_HIDDEN_MS = 15_000;

export default function MapTileLayers({
  map = null,
  theme = "dark",
  locale = "en",
  labelLevel = "all",
  baseLayer = "terrain",
  selectionActive = false,
  onReadinessChange = null,
}: Record<string, any>) {
  const selectionActiveRef = useRef(selectionActive);
  const hiddenSinceRef = useRef(0);
  const [resumeRevision, setResumeRevision] = useState(0);

  useEffect(() => {
    selectionActiveRef.current = selectionActive;
  }, [selectionActive]);

  useEffect(() => {
    if (!map || typeof map.setStyle !== "function") {
      onReadinessChange?.({ ready: true, reason: "no-native-map" });
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
    let cleanupDarkRoadShields: (() => void) | null = null;
    onReadinessChange?.({ ready: false, reason: "loading" });

    loadLocalizedMapStyle({
      theme,
      locale,
      labelLevel,
      baseLayer,
      signal: abort.signal,
    })
      .then((style) => {
        if (cancelled || !map?.getContainer?.()?.isConnected) return;
        const applyStyle = () => {
          if (cancelled || !map?.getContainer?.()?.isConnected) return;
          try {
            map.setStyle(style, { diff: true });
            map.getCanvas?.().classList.add("atc-tile-base");
            cleanupDarkRoadShields = attachDarkRoadShieldImages(map, theme);
            if (typeof map.setMaxTileCacheSize === "function") {
              map.setMaxTileCacheSize(512);
            }
            cleanupReadinessWatcher = watchMapLibreReadiness(map, {
              isCancelled: () => cancelled,
              onReady: (reason) => onReadinessChange?.({ ready: true, reason }),
            });
            setSelectionOpacity(map, theme, selectionActiveRef.current);
          } catch (error) {
            onReadinessChange?.({ ready: true, reason: "init-failed" });
            if (shouldLogMapTileLayerFailure(error)) {
              console.error("[airport-map] failed to initialize map tiles", error);
            }
          }
        };
        // The map instance already exists and setStyle() is safe here. Waiting
        // for a generic `load` is racy because the empty bootstrap style may
        // have emitted that one-shot event while this network request was in
        // flight, while loaded()/isStyleLoaded() can both be false during the
        // same transition. Applying directly is the only deterministic path.
        applyStyle();
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
      cleanupDarkRoadShields?.();
    };
  }, [map, theme, locale, labelLevel, baseLayer, onReadinessChange, resumeRevision]);

  useEffect(() => {
    setSelectionOpacity(map, theme, selectionActive);
  }, [map, selectionActive, theme]);

  useEffect(() => {
    const refreshCurrentLayer = () => {
      if (!map?.loaded?.()) return;
      map.resize?.();
      map?.triggerRepaint?.();
    };
    const rememberHidden = () => {
      hiddenSinceRef.current = Date.now();
    };
    const handleVisible = (forceRebuild = false) => {
      const hiddenSince = hiddenSinceRef.current;
      hiddenSinceRef.current = 0;
      refreshCurrentLayer();
      if (
        forceRebuild ||
        (hiddenSince > 0 &&
          Date.now() - hiddenSince >= MAP_TILE_REBUILD_AFTER_HIDDEN_MS)
      ) {
        setResumeRevision((value) => value + 1);
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        rememberHidden();
        return;
      }
      handleVisible(false);
    };
    const handlePageShow = (event: PageTransitionEvent) => {
      handleVisible(Boolean(event.persisted));
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", rememberHidden);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("focus", refreshCurrentLayer);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", rememberHidden);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("focus", refreshCurrentLayer);
    };
  }, [map]);

  return null;
}

const DARK_ROAD_SHIELD_IMAGE_PATTERN =
  /^adsbao-dark-(road|us-interstate|us-highway|us-state)_(\d)$/;
const DARK_ROAD_SHIELD_PIXEL_RATIO = 2;

function attachDarkRoadShieldImages(maplibreMap: any, theme: string) {
  if (
    theme !== "dark" ||
    !maplibreMap ||
    typeof maplibreMap.on !== "function" ||
    typeof maplibreMap.addImage !== "function"
  ) {
    return () => {};
  }

  const handleMissingImage = ({ id }: { id?: string } = {}) => {
    const match = String(id || "").match(DARK_ROAD_SHIELD_IMAGE_PATTERN);
    if (!match || maplibreMap.hasImage?.(id)) return;
    const image = createDarkRoadShieldImage({
      kind: match[1],
      refLength: Number(match[2]),
    });
    if (!image) return;
    maplibreMap.addImage(id, image, {
      pixelRatio: DARK_ROAD_SHIELD_PIXEL_RATIO,
    });
  };

  maplibreMap.on("styleimagemissing", handleMissingImage);
  return () => maplibreMap.off?.("styleimagemissing", handleMissingImage);
}

function createDarkRoadShieldImage({
  kind,
  refLength,
}: {
  kind: string;
  refLength: number;
}) {
  if (typeof document === "undefined") return null;
  const isRouteShield = kind === "us-interstate" || kind === "us-highway";
  const cssHeight = isRouteShield ? 17 : 14;
  const cssWidth = resolveDarkRoadShieldWidth(kind, refLength);
  const canvas = document.createElement("canvas");
  canvas.width = cssWidth * DARK_ROAD_SHIELD_PIXEL_RATIO;
  canvas.height = cssHeight * DARK_ROAD_SHIELD_PIXEL_RATIO;
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.scale(DARK_ROAD_SHIELD_PIXEL_RATIO, DARK_ROAD_SHIELD_PIXEL_RATIO);
  context.fillStyle = "#111412";
  context.strokeStyle = "rgba(239, 242, 240, 0.72)";
  context.lineWidth = 1;
  if (isRouteShield) {
    drawDarkRouteShield(context, cssWidth, cssHeight);
  } else {
    drawDarkRoadBadge(context, cssWidth, cssHeight);
  }
  context.fill();
  context.stroke();
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

function resolveDarkRoadShieldWidth(kind: string, refLength: number) {
  const safeLength = Math.max(1, Math.min(6, refLength || 1));
  if (kind === "us-interstate" || kind === "us-highway") {
    return safeLength <= 2 ? 17 : 17 + (safeLength - 2) * 5;
  }
  return 9 + safeLength * 5.5;
}

function drawDarkRouteShield(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  context.beginPath();
  context.moveTo(1.5, 3.5);
  context.quadraticCurveTo(width / 2, 0.5, width - 1.5, 3.5);
  context.lineTo(width - 2.5, height * 0.58);
  context.quadraticCurveTo(width - 3, height - 2, width / 2, height - 0.8);
  context.quadraticCurveTo(3, height - 2, 2.5, height * 0.58);
  context.closePath();
}

function drawDarkRoadBadge(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const radius = 3;
  context.beginPath();
  context.roundRect(0.7, 0.7, width - 1.4, height - 1.4, radius);
}

async function loadLocalizedMapStyle({
  theme,
  locale,
  labelLevel,
  baseLayer,
  signal,
}: Record<string, any>) {
  const params = new URLSearchParams({
    locale,
    labels: labelLevel === "off" ? "0" : "1",
    v: MAP_STYLE_THEME_REVISION,
  });
  if (baseLayer) params.set("baseLayer", baseLayer);
  const upstreamStyle = await requestJson(
    `/api/proxy/map-style/${theme}?${params}`,
    { signal },
  );
  const proxiedStyle = buildProxiedMapLibreStyle(upstreamStyle);
  const themedStyle = resolveClientMapStyle({
    style: proxiedStyle,
    theme,
    baseLayer,
  });
  const localizedStyle = buildLocalizedMapLibreStyle(themedStyle, {
    locale,
    labelLevel,
    theme,
  });
  return {
    ...localizedStyle,
    projection: { type: "mercator" },
  };
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

function setSelectionOpacity(map, theme, selectionActive) {
  const container = map?.getCanvas?.();
  if (!container) return;
  if (selectionActive) {
    container.style.opacity = isLightMapTheme(theme) ? "0.92" : "0.88";
    return;
  }
  container.style.opacity = "1";
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
