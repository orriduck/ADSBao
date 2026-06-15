type ContextTileRecord = Record<string, any>;
type ContextTile = {
  z: number;
  x: number;
  y: number;
};

const MIN_CONTEXT_TILE_Z = 3;
const MAX_CONTEXT_TILE_Z = 18;
const WEB_MERCATOR_MAX_LAT = 85.05112878;

export const AIRSPACE_TILE_CACHE_HEADERS = Object.freeze({
  "Cache-Control": "public, max-age=0, s-maxage=1800, stale-while-revalidate=3600",
  "CDN-Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
});

export const NAVAID_TILE_CACHE_HEADERS = Object.freeze({
  "Cache-Control": "public, max-age=0, s-maxage=2592000, stale-while-revalidate=604800",
  "CDN-Cache-Control": "public, s-maxage=2592000, stale-while-revalidate=604800",
});

export const WAYPOINT_TILE_CACHE_HEADERS = Object.freeze({
  "Cache-Control": "public, max-age=0, s-maxage=604800, stale-while-revalidate=86400",
  "CDN-Cache-Control": "public, s-maxage=604800, stale-while-revalidate=86400",
});

const numberOrNull = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

function longitudeToTileX(lon: number, z: number) {
  return Math.floor(((lon + 180) / 360) * 2 ** z);
}

function latitudeToTileY(lat: number, z: number) {
  const safeLat = clamp(lat, -WEB_MERCATOR_MAX_LAT, WEB_MERCATOR_MAX_LAT);
  const latRad = (safeLat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      2 ** z,
  );
}

export function normalizeContextTileParams(
  params: ContextTileRecord = {},
): ContextTile | null {
  const z = numberOrNull(params.z);
  const x = numberOrNull(params.x);
  const y = numberOrNull(params.y);
  if (z == null || x == null || y == null) return null;
  const zoom = Math.trunc(z);
  if (zoom < MIN_CONTEXT_TILE_Z || zoom > MAX_CONTEXT_TILE_Z) return null;
  const maxCoord = 2 ** zoom - 1;
  const tileX = Math.trunc(x);
  const tileY = Math.trunc(y);
  if (tileX < 0 || tileX > maxCoord || tileY < 0 || tileY > maxCoord) {
    return null;
  }
  return { z: zoom, x: tileX, y: tileY };
}

function tileXToLongitude(x: number, z: number) {
  return (x / 2 ** z) * 360 - 180;
}

function tileYToLatitude(y: number, z: number) {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** z;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

export function tileToBbox(tile: ContextTile) {
  return {
    west: tileXToLongitude(tile.x, tile.z),
    south: tileYToLatitude(tile.y + 1, tile.z),
    east: tileXToLongitude(tile.x + 1, tile.z),
    north: tileYToLatitude(tile.y, tile.z),
  };
}

export function bboxToOpenAipParam(bbox: ContextTileRecord = {}) {
  return [bbox.west, bbox.south, bbox.east, bbox.north]
    .map((value) => Number(value).toFixed(6))
    .join(",");
}

export function buildContextTileCacheKey(resource: string, tile: ContextTile) {
  return `${resource}:${tile.z}:${tile.x}:${tile.y}`;
}

export function getContextTilesForBounds({
  bounds,
  zoom,
  maxTiles = 24,
}: ContextTileRecord = {}) {
  if (!bounds) return [];
  const rawZoom = numberOrNull(zoom);
  if (rawZoom == null) return [];
  const z = clamp(Math.trunc(rawZoom), 4, 10);
  const west = numberOrNull(bounds.getWest?.() ?? bounds.west);
  const east = numberOrNull(bounds.getEast?.() ?? bounds.east);
  const south = numberOrNull(bounds.getSouth?.() ?? bounds.south);
  const north = numberOrNull(bounds.getNorth?.() ?? bounds.north);
  if (west == null || east == null || south == null || north == null) return [];

  const minX = clamp(longitudeToTileX(Math.min(west, east), z), 0, 2 ** z - 1);
  const maxX = clamp(longitudeToTileX(Math.max(west, east), z), 0, 2 ** z - 1);
  const minY = clamp(latitudeToTileY(Math.max(south, north), z), 0, 2 ** z - 1);
  const maxY = clamp(latitudeToTileY(Math.min(south, north), z), 0, 2 ** z - 1);
  const tiles: ContextTile[] = [];
  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      tiles.push({ z, x, y });
      if (tiles.length >= maxTiles) return tiles;
    }
  }
  return tiles;
}
