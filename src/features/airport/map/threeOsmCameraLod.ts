import {
  shortestWrappedTileDelta,
  THREE_OSM_TILE_SIZE,
  type TileCoordinate,
} from "./threeOsmProjection";

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
  sourceCenter,
  sceneZoom,
}: {
  tile: TileCoordinate;
  sourceCenter: TileCoordinate;
  sceneZoom: number;
}) {
  const worldSize = THREE_OSM_TILE_SIZE * 2 ** (sceneZoom - sourceCenter.z);
  return {
    worldSize,
    seamGuard: worldSize / 1_024,
    x:
      shortestWrappedTileDelta(
        tile.x + 0.5,
        sourceCenter.x,
        sourceCenter.z,
      ) * worldSize,
    z: (tile.y + 0.5 - sourceCenter.y) * worldSize,
  };
}
