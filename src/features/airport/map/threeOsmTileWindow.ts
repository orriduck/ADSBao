import {
  shortestWrappedTileDelta,
  THREE_OSM_TILE_SIZE,
  type TileCoordinate,
} from "./threeOsmProjection";

export type ThreeOsmViewportFootprint = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export type ThreeOsmTileWindow = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  columns: number;
  rows: number;
  tileCount: number;
  key: string;
};

export type ThreeOsmTileWindowSnapshot = {
  center: TileCoordinate;
  window: ThreeOsmTileWindow;
  sceneZoom: number;
  sourceZoom: number;
};

const MIN_AXIS_TILES = 3;
const MAX_AXIS_TILES = 7;
const OVERSCAN_TILES = 0.35;

function boundedAxisRange({
  center,
  minimum,
  maximum,
  worldPerTile,
}: {
  center: number;
  minimum: number;
  maximum: number;
  worldPerTile: number;
}) {
  const centerIndex = Math.floor(center);
  let first = Math.floor(center + minimum / worldPerTile - OVERSCAN_TILES);
  let last = Math.floor(center + maximum / worldPerTile + OVERSCAN_TILES);
  if (!Number.isFinite(first) || !Number.isFinite(last) || first > last) {
    first = centerIndex - 1;
    last = centerIndex + 1;
  }

  while (last - first + 1 < MIN_AXIS_TILES) {
    if (centerIndex - first <= last - centerIndex) first -= 1;
    else last += 1;
  }

  if (last - first + 1 > MAX_AXIS_TILES) {
    const footprintCenter = center + (minimum + maximum) / (2 * worldPerTile);
    const focusIndex = Math.floor(footprintCenter);
    first = focusIndex - Math.floor((MAX_AXIS_TILES - 1) / 2);
    last = first + MAX_AXIS_TILES - 1;
  }

  return {
    before: Math.max(0, centerIndex - first),
    after: Math.max(0, last - centerIndex),
  };
}

export function createThreeOsmSquareTileWindow(radius: unknown) {
  const safeRadius = Math.min(3, Math.max(1, Math.round(Number(radius) || 1)));
  return createThreeOsmTileWindow({
    left: safeRadius,
    right: safeRadius,
    top: safeRadius,
    bottom: safeRadius,
  });
}

function createThreeOsmTileWindow({
  left,
  right,
  top,
  bottom,
}: Pick<ThreeOsmTileWindow, "left" | "right" | "top" | "bottom">) {
  const safe = (value: number) =>
    Math.min(MAX_AXIS_TILES - 1, Math.max(0, Math.round(Number(value) || 0)));
  const boundedLeft = safe(left);
  const boundedRight = safe(right);
  const boundedTop = safe(top);
  const boundedBottom = safe(bottom);
  const columns = boundedLeft + boundedRight + 1;
  const rows = boundedTop + boundedBottom + 1;
  return {
    left: boundedLeft,
    right: boundedRight,
    top: boundedTop,
    bottom: boundedBottom,
    columns,
    rows,
    tileCount: columns * rows,
    key: `${boundedLeft},${boundedRight},${boundedTop},${boundedBottom}`,
  } satisfies ThreeOsmTileWindow;
}

export function resolveThreeOsmViewportTileWindow({
  center,
  sceneZoom,
  sourceZoom,
  footprint,
}: {
  center: TileCoordinate;
  sceneZoom: number;
  sourceZoom: number;
  footprint: ThreeOsmViewportFootprint;
}) {
  const worldPerTile =
    THREE_OSM_TILE_SIZE * 2 ** (Number(sceneZoom) - Number(sourceZoom));
  const x = boundedAxisRange({
    center: center.x,
    minimum: footprint.minX,
    maximum: footprint.maxX,
    worldPerTile,
  });
  const y = boundedAxisRange({
    center: center.y,
    minimum: footprint.minZ,
    maximum: footprint.maxZ,
    worldPerTile,
  });
  return createThreeOsmTileWindow({
    left: x.before,
    right: x.after,
    top: y.before,
    bottom: y.after,
  });
}

export function doesThreeOsmTileWindowCoverViewport({
  retainedCenter,
  retainedWindow,
  candidateCenter,
  sceneZoom,
  sourceZoom,
  footprint,
}: {
  retainedCenter: TileCoordinate;
  retainedWindow: ThreeOsmTileWindow;
  candidateCenter: TileCoordinate;
  sceneZoom: number;
  sourceZoom: number;
  footprint: ThreeOsmViewportFootprint;
}) {
  if (retainedCenter.z !== candidateCenter.z) return false;
  const worldPerTile =
    THREE_OSM_TILE_SIZE * 2 ** (Number(sceneZoom) - Number(sourceZoom));
  if (!Number.isFinite(worldPerTile) || worldPerTile <= 0) return false;

  const retainedX = Math.floor(retainedCenter.x);
  const retainedY = Math.floor(retainedCenter.y);
  const candidateX =
    retainedCenter.x +
    shortestWrappedTileDelta(
      candidateCenter.x,
      retainedCenter.x,
      retainedCenter.z,
    );
  const epsilon = 0.001;
  return (
    candidateX + footprint.minX / worldPerTile >=
      retainedX - retainedWindow.left - epsilon &&
    candidateX + footprint.maxX / worldPerTile <=
      retainedX + retainedWindow.right + 1 + epsilon &&
    candidateCenter.y + footprint.minZ / worldPerTile >=
      retainedY - retainedWindow.top - epsilon &&
    candidateCenter.y + footprint.maxZ / worldPerTile <=
      retainedY + retainedWindow.bottom + 1 + epsilon
  );
}

export function retainThreeOsmTileWindowSnapshot({
  retained,
  candidate,
  footprint,
}: {
  retained: ThreeOsmTileWindowSnapshot | null;
  candidate: ThreeOsmTileWindowSnapshot;
  footprint: ThreeOsmViewportFootprint;
}) {
  if (
    retained &&
    retained.sceneZoom === candidate.sceneZoom &&
    retained.sourceZoom === candidate.sourceZoom &&
    doesThreeOsmTileWindowCoverViewport({
      retainedCenter: retained.center,
      retainedWindow: retained.window,
      candidateCenter: candidate.center,
      sceneZoom: candidate.sceneZoom,
      sourceZoom: candidate.sourceZoom,
      footprint,
    })
  ) {
    return retained;
  }
  return candidate;
}

export function constrainThreeOsmTileWindow(
  window: ThreeOsmTileWindow,
  radius: unknown,
) {
  const safeRadius = Math.min(3, Math.max(1, Math.round(Number(radius) || 1)));
  return createThreeOsmTileWindow({
    left: Math.min(window.left, safeRadius),
    right: Math.min(window.right, safeRadius),
    top: Math.min(window.top, safeRadius),
    bottom: Math.min(window.bottom, safeRadius),
  });
}

export function buildThreeOsmTileWindowGrid({
  center,
  window,
}: {
  center: TileCoordinate;
  window: ThreeOsmTileWindow;
}) {
  const scale = 2 ** center.z;
  const centerX = Math.floor(center.x);
  const centerY = Math.floor(center.y);
  const tiles: TileCoordinate[] = [];
  for (let y = centerY - window.top; y <= centerY + window.bottom; y += 1) {
    if (y < 0 || y >= scale) continue;
    for (let x = centerX - window.left; x <= centerX + window.right; x += 1) {
      tiles.push({
        x: ((x % scale) + scale) % scale,
        y,
        z: center.z,
      });
    }
  }
  return tiles;
}

export function sortThreeOsmTilesFromCenter(
  tiles: TileCoordinate[],
  center: TileCoordinate,
) {
  return [...tiles].sort((left, right) => {
    const distance = (tile: TileCoordinate) =>
      Math.abs(shortestWrappedTileDelta(tile.x + 0.5, center.x, center.z)) +
      Math.abs(tile.y + 0.5 - center.y);
    return distance(left) - distance(right);
  });
}
