import {
  shortestWrappedTileDelta,
  THREE_OSM_TILE_SIZE,
  type TileCoordinate,
} from "./threeOsmProjection";
import type { ThreeOsmTileWindow } from "./threeOsmTileWindow";

export const THREE_OSM_LOD_SETTLE_MS = 180;
export const THREE_OSM_LOD_HYSTERESIS = 0.65;

export function resolveThreeOsmLodBounds(sceneZoom: number) {
  const zoom = Math.round(sceneZoom);
  if (zoom >= 10 && zoom <= 14) {
    return { minZoom: 10, maxZoom: 14 };
  }
  return { minZoom: zoom, maxZoom: zoom };
}

export function resolveThreeOsmCameraScale({
  mode,
  orthographicZoom,
  distance,
}: {
  mode: "2d" | "3d";
  orthographicZoom?: number;
  distance?: number;
}) {
  const value = mode === "2d" ? orthographicZoom : distance;
  if (!Number.isFinite(value) || Number(value) <= 0) return null;
  return mode === "2d" ? Number(value) : 1 / Number(value);
}

export function resolveThreeOsmContinuousLod({
  sceneZoom,
  referenceScale,
  currentScale,
}: {
  sceneZoom: number;
  referenceScale: number;
  currentScale: number;
}) {
  if (
    !Number.isFinite(referenceScale) ||
    referenceScale <= 0 ||
    !Number.isFinite(currentScale) ||
    currentScale <= 0
  ) {
    return sceneZoom;
  }
  return sceneZoom + Math.log2(currentScale / referenceScale);
}

export function resolveThreeOsmSettledLod({
  continuousZoom,
  currentZoom,
  minZoom,
  maxZoom,
  hysteresis = THREE_OSM_LOD_HYSTERESIS,
}: {
  continuousZoom: number;
  currentZoom: number;
  minZoom: number;
  maxZoom: number;
  hysteresis?: number;
}) {
  let zoom = Math.min(maxZoom, Math.max(minZoom, Math.round(currentZoom)));
  while (zoom < maxZoom && continuousZoom >= zoom + hysteresis) zoom += 1;
  while (zoom > minZoom && continuousZoom <= zoom - hysteresis) zoom -= 1;
  return zoom;
}

export function resolveThreeOsmSourceTileTransform({
  tile,
  projectionCenter,
  sceneZoom,
}: {
  tile: TileCoordinate;
  projectionCenter: TileCoordinate;
  sceneZoom: number;
}) {
  const baseWorldSize =
    THREE_OSM_TILE_SIZE * 2 ** (sceneZoom - projectionCenter.z);
  const sourceScale = 2 ** (projectionCenter.z - tile.z);
  const worldSize = baseWorldSize * sourceScale;
  return {
    worldSize,
    seamGuard: worldSize / 1_024,
    x:
      shortestWrappedTileDelta(
        (tile.x + 0.5) * sourceScale,
        projectionCenter.x,
        projectionCenter.z,
      ) * baseWorldSize,
    z:
      ((tile.y + 0.5) * sourceScale - projectionCenter.y) *
      baseWorldSize,
  };
}

export function buildThreeOsmParentRasterFallbackTiles({
  center,
  fineWindow,
}: {
  center: TileCoordinate;
  fineWindow: ThreeOsmTileWindow;
}) {
  if (center.z <= 0) return [];
  const childScale = 2 ** center.z;
  const parentZoom = center.z - 1;
  const parentScale = 2 ** parentZoom;
  const centerX = Math.floor(center.x);
  const centerY = Math.floor(center.y);
  const uniqueParents = new Map<string, TileCoordinate>();

  for (
    let y = centerY - fineWindow.top - 1;
    y <= centerY + fineWindow.bottom + 1;
    y += 1
  ) {
    if (y < 0 || y >= childScale) continue;
    for (
      let x = centerX - fineWindow.left - 1;
      x <= centerX + fineWindow.right + 1;
      x += 1
    ) {
      if (
        x >= centerX - fineWindow.left &&
        x <= centerX + fineWindow.right &&
        y >= centerY - fineWindow.top &&
        y <= centerY + fineWindow.bottom
      ) {
        continue;
      }
      const childX = ((x % childScale) + childScale) % childScale;
      const parent = {
        x: Math.floor(childX / 2) % parentScale,
        y: Math.floor(y / 2),
        z: parentZoom,
      };
      uniqueParents.set(`${parent.z}/${parent.x}/${parent.y}`, parent);
    }
  }

  return [...uniqueParents.values()];
}

export function resolveThreeOsmSourceViewCenter({
  projectionCenter,
  sceneZoom,
  targetX,
  targetZ,
}: {
  projectionCenter: TileCoordinate;
  sceneZoom: number;
  targetX: number;
  targetZ: number;
}) {
  const worldSize =
    THREE_OSM_TILE_SIZE * 2 ** (sceneZoom - projectionCenter.z);
  const scale = 2 ** projectionCenter.z;
  const numericTargetX = Number(targetX);
  const numericTargetZ = Number(targetZ);
  const rawX =
    projectionCenter.x +
    (Number.isFinite(numericTargetX) ? numericTargetX : 0) / worldSize;
  const rawY =
    projectionCenter.y +
    (Number.isFinite(numericTargetZ) ? numericTargetZ : 0) / worldSize;
  return {
    x: ((rawX % scale) + scale) % scale,
    y: Math.min(scale - 1e-9, Math.max(0, rawY)),
    z: projectionCenter.z,
  };
}

export function resolveThreeOsmTileWindowKey(center: TileCoordinate) {
  return `${center.z}/${Math.floor(center.x)}/${Math.floor(center.y)}`;
}
