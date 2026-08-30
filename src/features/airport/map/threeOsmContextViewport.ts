import {
  buildThreeOsmTileGridBounds,
  type ThreeOsmBounds,
  type TileCoordinate,
} from "./threeOsmProjection";

export type ThreeOsmContextViewport = {
  bounds: ThreeOsmBounds;
  zoom: number;
  radius: number;
  tileCount: number;
  signature: string;
  requestPath: string;
};

const CONTEXT_WINDOW_ZOOM = 10;

function wrapTileX(value: number, zoom: number) {
  const scale = 2 ** zoom;
  return ((value % scale) + scale) % scale;
}

export function resolveThreeOsmContextViewport({
  sourceCenter,
  radius = 2,
}: {
  sourceCenter: TileCoordinate;
  radius?: number;
}): ThreeOsmContextViewport {
  const sourceZoom = Math.round(Number(sourceCenter?.z));
  const coverageZoom = CONTEXT_WINDOW_ZOOM;
  const scale = 2 ** (coverageZoom - sourceZoom);
  const tileScale = 2 ** coverageZoom;
  const center = {
    x: wrapTileX(Number(sourceCenter?.x) * scale, coverageZoom),
    y: Math.min(
      tileScale - Number.EPSILON,
      Math.max(0, Number(sourceCenter?.y) * scale),
    ),
    z: coverageZoom,
  };
  const safeRadius = Math.min(2, Math.max(1, Math.round(Number(radius) || 1)));
  const bounds = buildThreeOsmTileGridBounds(center, safeRadius);
  const centerX = Math.floor(center.x);
  const centerY = Math.floor(center.y);
  const signature = `${coverageZoom}/${centerX}/${centerY}/${safeRadius}`;

  return {
    bounds,
    zoom: coverageZoom,
    radius: safeRadius,
    tileCount: (safeRadius * 2 + 1) ** 2,
    signature,
    requestPath: `/api/airspace/window/${signature}`,
  };
}
