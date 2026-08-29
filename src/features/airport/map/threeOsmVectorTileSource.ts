import type { TileCoordinate } from "./threeOsmProjection";

export const OPENFREEMAP_VECTOR_TILEJSON_URL =
  "https://tiles.openfreemap.org/planet";
export const OPENFREEMAP_VECTOR_ATTRIBUTION =
  "OpenFreeMap © OpenMapTiles Data from OpenStreetMap";
export const OPENFREEMAP_VECTOR_ATTRIBUTION_URL =
  "https://openfreemap.org/";

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function resolveOpenFreeMapVectorTileTemplate(payload: unknown) {
  if (!isRecord(payload) || !Array.isArray(payload.tiles)) return null;
  const template = payload.tiles.find((value) => typeof value === "string");
  if (!template) return null;
  try {
    const url = new URL(template);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "tiles.openfreemap.org" ||
      !url.pathname.endsWith(".pbf") ||
      !["{z}", "{x}", "{y}"].every((token) => template.includes(token))
    ) {
      return null;
    }
    return template;
  } catch {
    return null;
  }
}

export function buildOpenFreeMapVectorTileUrl(
  template: string,
  tile: TileCoordinate,
) {
  const resolved = resolveOpenFreeMapVectorTileTemplate({ tiles: [template] });
  if (!resolved) return null;
  return resolved
    .replace("{z}", String(tile.z))
    .replace("{x}", String(tile.x))
    .replace("{y}", String(tile.y));
}

export function createOpenFreeMapVectorSourceClient(input: {
  fetchImpl?: FetchLike;
  tileJsonUrl?: string;
} = {}) {
  const fetchImpl = input.fetchImpl || globalThis.fetch?.bind(globalThis);
  const tileJsonUrl = input.tileJsonUrl || OPENFREEMAP_VECTOR_TILEJSON_URL;
  let templateRequest: Promise<string> | null = null;

  return {
    loadTemplate() {
      if (!fetchImpl) {
        return Promise.reject(new Error("Vector tile fetch is unavailable"));
      }
      if (!templateRequest) {
        templateRequest = fetchImpl(tileJsonUrl, {
          headers: { Accept: "application/json" },
          cache: "force-cache",
        })
          .then(async (response) => {
            if (!response.ok) {
              throw new Error(`Vector TileJSON HTTP ${response.status}`);
            }
            const template = resolveOpenFreeMapVectorTileTemplate(
              await response.json(),
            );
            if (!template) throw new Error("Vector TileJSON is invalid");
            return template;
          })
          .catch((error) => {
            templateRequest = null;
            throw error;
          });
      }
      return templateRequest;
    },
  };
}

export const openFreeMapVectorSourceClient =
  createOpenFreeMapVectorSourceClient();
