import type { TileCoordinate } from "./threeOsmProjection";

export type ThreeOsmTileSource = {
  id: string;
  attribution: string;
  attributionUrl: string | null;
  buildUrl: (tile: TileCoordinate) => string;
};

export type ThreeOsmConfiguredTileSourceState =
  | {
      status: "ready";
      source: ThreeOsmTileSource;
    }
  | {
      status: "missing" | "invalid";
      source: null;
    };

type ThreeOsmConfiguredTileSourceInput = {
  id?: unknown;
  urlTemplate?: unknown;
  attribution?: unknown;
  attributionUrl?: unknown;
};

const REQUIRED_TILE_TEMPLATE_TOKENS = ["{z}", "{x}", "{y}"] as const;

function normalizeSourceId(value: unknown) {
  const candidate = typeof value === "string" ? value.trim().toLowerCase() : "";
  return /^[a-z0-9][a-z0-9-]{0,39}$/.test(candidate)
    ? candidate
    : "configured-raster";
}

function normalizeHttpsUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function createConfiguredThreeOsmTileSource(
  input: ThreeOsmConfiguredTileSourceInput,
): ThreeOsmConfiguredTileSourceState {
  const rawTemplate =
    typeof input.urlTemplate === "string" ? input.urlTemplate.trim() : "";
  if (!rawTemplate) return { status: "missing", source: null };
  if (!REQUIRED_TILE_TEMPLATE_TOKENS.every((token) => rawTemplate.includes(token))) {
    return { status: "invalid", source: null };
  }

  const sampleUrl = REQUIRED_TILE_TEMPLATE_TOKENS.reduce(
    (url, token, index) => url.replaceAll(token, String(index + 1)),
    rawTemplate,
  );
  if (!normalizeHttpsUrl(sampleUrl)) return { status: "invalid", source: null };

  const attribution =
    typeof input.attribution === "string" ? input.attribution.trim() : "";
  const attributionUrl = normalizeHttpsUrl(input.attributionUrl);
  if (!attribution || !attributionUrl) return { status: "invalid", source: null };

  return {
    status: "ready",
    source: {
      id: normalizeSourceId(input.id),
      attribution,
      attributionUrl,
      buildUrl: (tile) =>
        rawTemplate
          .replaceAll("{z}", String(tile.z))
          .replaceAll("{x}", String(tile.x))
          .replaceAll("{y}", String(tile.y)),
    },
  };
}

export const THREE_OSM_STANDARD_TILE_SOURCE: ThreeOsmTileSource = {
  id: "osm-standard",
  attribution: "© OpenStreetMap contributors",
  attributionUrl: "https://www.openstreetmap.org/copyright",
  buildUrl: (tile) =>
    `https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`,
};

export const THREE_OSM_DEBUG_FAILURE_TILE_SOURCE: ThreeOsmTileSource = {
  id: "debug-failure",
  attribution: "Debug tile failure",
  attributionUrl: null,
  buildUrl: (tile) =>
    `/__three-osm-debug-missing__/${tile.z}/${tile.x}/${tile.y}.png`,
};

export const THREE_OSM_CONFIG_UNAVAILABLE_TILE_SOURCE: ThreeOsmTileSource = {
  id: "configured-unavailable",
  attribution: "Configured raster source unavailable",
  attributionUrl: null,
  buildUrl: (tile) =>
    `/__three-osm-config-unavailable__/${tile.z}/${tile.x}/${tile.y}.png`,
};
