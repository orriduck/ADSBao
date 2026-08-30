import {
  shortestWrappedTileDelta,
  type TileCoordinate,
} from "./threeOsmProjection";
import {
  buildThreeOsmTileWindowGrid,
  type ThreeOsmTileWindow,
} from "./threeOsmTileWindow";

function tileKey(tile: TileCoordinate) {
  return `${tile.z}/${tile.x}/${tile.y}`;
}

export function resolveThreeOsmDirectionalTilePrefetch({
  currentCenter,
  candidateCenter,
  tileWindow,
}: {
  currentCenter: TileCoordinate;
  candidateCenter: TileCoordinate;
  tileWindow: ThreeOsmTileWindow;
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
    buildThreeOsmTileWindowGrid({ center: currentCenter, window: tileWindow }).map(tileKey),
  );
  return buildThreeOsmTileWindowGrid({
    center: candidateCenter,
    window: tileWindow,
  }).filter(
    (tile) => !currentKeys.has(tileKey(tile)),
  );
}
