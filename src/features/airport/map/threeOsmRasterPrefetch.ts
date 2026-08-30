import {
  buildVisibleTileGrid,
  shortestWrappedTileDelta,
  type TileCoordinate,
} from "./threeOsmProjection";

function tileKey(tile: TileCoordinate) {
  return `${tile.z}/${tile.x}/${tile.y}`;
}

export function resolveThreeOsmDirectionalRasterPrefetch({
  currentCenter,
  candidateCenter,
  radius,
}: {
  currentCenter: TileCoordinate;
  candidateCenter: TileCoordinate;
  radius: number;
}) {
  if (currentCenter.z !== candidateCenter.z) return [];
  const currentX = Math.floor(currentCenter.x);
  const currentY = Math.floor(currentCenter.y);
  const candidateX = Math.floor(candidateCenter.x);
  const candidateY = Math.floor(candidateCenter.y);
  if (
    Math.abs(shortestWrappedTileDelta(candidateX, currentX, currentCenter.z)) >
      1 ||
    Math.abs(candidateY - currentY) > 1
  ) {
    return [];
  }

  const currentKeys = new Set(
    buildVisibleTileGrid(currentCenter, radius).map(tileKey),
  );
  return buildVisibleTileGrid(candidateCenter, radius).filter(
    (tile) => !currentKeys.has(tileKey(tile)),
  );
}
