import {
  shortestWrappedTileDelta,
  THREE_OSM_TILE_SIZE,
  type TileCoordinate,
} from "./threeOsmProjection";

export type ThreeOsmWorldBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export type ThreeOsmGroundFootprint = ThreeOsmWorldBounds;

export function resolveThreeOsmVisibleHorizontalFraction({
  viewportWidth,
  occlusionWidth = 0,
}: {
  viewportWidth: unknown;
  occlusionWidth?: unknown;
}) {
  const width = Math.max(1, Number(viewportWidth) || 1);
  const occluded = Math.min(
    width - 1,
    Math.max(0, Number(occlusionWidth) || 0),
  );
  return (width - occluded) / width;
}

export function resolveThreeOsmTileWorldBounds({
  tiles,
  center,
}: {
  tiles: TileCoordinate[];
  center: TileCoordinate;
}): ThreeOsmWorldBounds | null {
  if (!tiles.length) return null;
  const halfTile = THREE_OSM_TILE_SIZE / 2;
  const centers = tiles.map((tile) => ({
    x:
      shortestWrappedTileDelta(tile.x + 0.5, center.x, center.z) *
      THREE_OSM_TILE_SIZE,
    z: (tile.y + 0.5 - center.y) * THREE_OSM_TILE_SIZE,
  }));
  return {
    minX: Math.min(...centers.map((point) => point.x)) - halfTile,
    maxX: Math.max(...centers.map((point) => point.x)) + halfTile,
    minZ: Math.min(...centers.map((point) => point.z)) - halfTile,
    maxZ: Math.max(...centers.map((point) => point.z)) + halfTile,
  };
}

function clampAxis({
  target,
  boundsMin,
  boundsMax,
  footprintMin,
  footprintMax,
  padding,
}: {
  target: number;
  boundsMin: number;
  boundsMax: number;
  footprintMin: number;
  footprintMax: number;
  padding: number;
}) {
  const minimum = boundsMin + padding - footprintMin;
  const maximum = boundsMax - padding - footprintMax;
  if (minimum > maximum) return (boundsMin + boundsMax) / 2;
  return Math.min(maximum, Math.max(minimum, target));
}

export function clampThreeOsmCameraTarget({
  target,
  bounds,
  footprint,
  padding = 12,
}: {
  target: { x: number; z: number };
  bounds: ThreeOsmWorldBounds;
  footprint: ThreeOsmGroundFootprint;
  padding?: number;
}) {
  const x = clampAxis({
    target: target.x,
    boundsMin: bounds.minX,
    boundsMax: bounds.maxX,
    footprintMin: footprint.minX,
    footprintMax: footprint.maxX,
    padding,
  });
  const z = clampAxis({
    target: target.z,
    boundsMin: bounds.minZ,
    boundsMax: bounds.maxZ,
    footprintMin: footprint.minZ,
    footprintMax: footprint.maxZ,
    padding,
  });
  return {
    x,
    z,
    clamped: Math.abs(x - target.x) > 0.001 || Math.abs(z - target.z) > 0.001,
  };
}

export function resolveThreeOsmMinimumOrthoZoom({
  cameraWidth,
  cameraHeight,
  bounds,
  padding = 12,
}: {
  cameraWidth: number;
  cameraHeight: number;
  bounds: ThreeOsmWorldBounds;
  padding?: number;
}) {
  const availableWidth = Math.max(1, bounds.maxX - bounds.minX - padding * 2);
  const availableHeight = Math.max(1, bounds.maxZ - bounds.minZ - padding * 2);
  return Math.max(cameraWidth / availableWidth, cameraHeight / availableHeight);
}
