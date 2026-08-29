const WEB_MERCATOR_MAX_LAT = 85.05112878;
const EARTH_CIRCUMFERENCE_METERS = 40_075_016.686;
const FEET_TO_METERS = 0.3048;

export type TileCoordinate = {
  x: number;
  y: number;
  z: number;
};

export type ThreeOsmWorldPoint = {
  x: number;
  y: number;
  z: number;
};

export type ThreeOsmBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export const THREE_OSM_TILE_SIZE = 256;
export const THREE_OSM_MIN_ZOOM = 3;
export const THREE_OSM_MAX_ZOOM = 16;
export const THREE_OSM_VERTICAL_EXAGGERATION = 8;

export function clampThreeOsmZoom(value: unknown) {
  const zoom = Math.round(Number(value));
  if (!Number.isFinite(zoom)) return 10;
  return Math.min(THREE_OSM_MAX_ZOOM, Math.max(THREE_OSM_MIN_ZOOM, zoom));
}

export function clampWebMercatorLatitude(value: unknown) {
  const latitude = Number(value);
  if (!Number.isFinite(latitude)) return 0;
  return Math.min(WEB_MERCATOR_MAX_LAT, Math.max(-WEB_MERCATOR_MAX_LAT, latitude));
}

export function lonLatToTileCoordinate(
  lon: unknown,
  lat: unknown,
  zoom: unknown,
): TileCoordinate {
  const z = clampThreeOsmZoom(zoom);
  const scale = 2 ** z;
  const longitude = Number.isFinite(Number(lon)) ? Number(lon) : 0;
  const latitude = clampWebMercatorLatitude(lat);
  const radians = (latitude * Math.PI) / 180;

  return {
    x: ((longitude + 180) / 360) * scale,
    y:
      ((1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2) * scale,
    z,
  };
}

export function buildVisibleTileGrid(
  center: TileCoordinate,
  radius: unknown,
) {
  const safeRadius = Math.min(2, Math.max(1, Math.round(Number(radius) || 1)));
  const scale = 2 ** center.z;
  const centerX = Math.floor(center.x);
  const centerY = Math.floor(center.y);
  const tiles: TileCoordinate[] = [];

  for (let y = centerY - safeRadius; y <= centerY + safeRadius; y += 1) {
    if (y < 0 || y >= scale) continue;
    for (let x = centerX - safeRadius; x <= centerX + safeRadius; x += 1) {
      tiles.push({
        x: ((x % scale) + scale) % scale,
        y,
        z: center.z,
      });
    }
  }

  return tiles;
}

export function buildOsmRasterTileUrl(tile: TileCoordinate) {
  return `https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`;
}

function tileXToLongitude(x: number, zoom: number) {
  return (x / 2 ** zoom) * 360 - 180;
}

function tileYToLatitude(y: number, zoom: number) {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** zoom;
  return (180 / Math.PI) * Math.atan(Math.sinh(n));
}

export function buildThreeOsmTileGridBounds(
  center: TileCoordinate,
  radius: unknown,
): ThreeOsmBounds {
  const safeRadius = Math.min(2, Math.max(1, Math.round(Number(radius) || 1)));
  const scale = 2 ** center.z;
  const minX = Math.max(0, Math.floor(center.x) - safeRadius);
  const maxX = Math.min(scale, Math.floor(center.x) + safeRadius + 1);
  const minY = Math.max(0, Math.floor(center.y) - safeRadius);
  const maxY = Math.min(scale, Math.floor(center.y) + safeRadius + 1);
  return {
    west: tileXToLongitude(minX, center.z),
    south: tileYToLatitude(maxY, center.z),
    east: tileXToLongitude(maxX, center.z),
    north: tileYToLatitude(minY, center.z),
  };
}

export function metersPerTileAtLatitude(lat: unknown, zoom: unknown) {
  const latitude = clampWebMercatorLatitude(lat);
  const z = clampThreeOsmZoom(zoom);
  return (
    (EARTH_CIRCUMFERENCE_METERS *
      Math.max(0.01, Math.cos((latitude * Math.PI) / 180))) /
    2 ** z
  );
}

export function lonLatAltitudeToThreeOsmWorld({
  lon,
  lat,
  altitudeFt = 0,
  center,
  centerLat,
  tileSize = THREE_OSM_TILE_SIZE,
  verticalExaggeration = THREE_OSM_VERTICAL_EXAGGERATION,
}: {
  lon: unknown;
  lat: unknown;
  altitudeFt?: unknown;
  center: TileCoordinate;
  centerLat: unknown;
  tileSize?: number;
  verticalExaggeration?: number;
}): ThreeOsmWorldPoint | null {
  const longitude = Number(lon);
  const latitude = Number(lat);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;

  const point = lonLatToTileCoordinate(longitude, latitude, center.z);
  const metersPerTile = metersPerTileAtLatitude(centerLat, center.z);
  const altitudeMeters = Math.max(0, Number(altitudeFt) || 0) * FEET_TO_METERS;

  return {
    x: (point.x - center.x) * tileSize,
    y:
      (altitudeMeters / metersPerTile) *
      tileSize *
      Math.max(0, Number(verticalExaggeration) || 0),
    z: (point.y - center.y) * tileSize,
  };
}
