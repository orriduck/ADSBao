import {
  clampThreeOsmZoom,
  lonLatToTileCoordinate,
  tileXToLongitude,
  tileYToLatitude,
  THREE_OSM_MIN_ZOOM,
  THREE_OSM_TILE_SIZE,
  type TileCoordinate,
  type ThreeOsmWorldPoint,
} from "./threeOsmProjection";

type LatLonTuple = [number, number];

export const THREE_OSM_ORTHOGRAPHIC_HALF_HEIGHT = 300;

export type ThreeOsmCameraViewportOffsets = Record<
  "2d" | "3d",
  { x: number; z: number }
>;

function finiteFitPoints(points: Array<[unknown, unknown]> = []) {
  return points.flatMap((point) => {
    const lat = Number(point?.[0]);
    const lon = Number(point?.[1]);
    return Number.isFinite(lat) && Number.isFinite(lon)
      ? ([[lat, lon]] as LatLonTuple[])
      : [];
  });
}

function circularTileRange(values: number[], scale: number) {
  if (values.length === 1) {
    return { center: values[0], span: 0 };
  }
  const sorted = values
    .map((value) => ((value % scale) + scale) % scale)
    .sort((a, b) => a - b);
  let largestGap = -1;
  let largestGapIndex = 0;
  sorted.forEach((value, index) => {
    const next = index === sorted.length - 1 ? sorted[0] + scale : sorted[index + 1];
    const gap = next - value;
    if (gap > largestGap) {
      largestGap = gap;
      largestGapIndex = index;
    }
  });
  const start = sorted[(largestGapIndex + 1) % sorted.length];
  let end = sorted[largestGapIndex];
  if (end < start) end += scale;
  const center = ((start + end) / 2) % scale;
  return { center: center < 0 ? center + scale : center, span: end - start };
}

export function resolveThreeOsmFitViewport({
  points = [],
  requestedZoom = 10,
  tileRadius = 2,
  aspect = 1,
}: {
  points?: Array<[unknown, unknown]>;
  requestedZoom?: unknown;
  tileRadius?: unknown;
  aspect?: unknown;
}) {
  const usable = finiteFitPoints(points);
  if (!usable.length) return null;
  const maxZoom = clampThreeOsmZoom(requestedZoom);
  const radius = Math.min(2, Math.max(1, Math.round(Number(tileRadius) || 1)));
  const safeAspect = Math.max(0.35, Number(aspect) || 1);
  // The loaded grid spans 2r + 1 tiles. Keep a quarter-tile safety margin,
  // while still allowing a portrait viewport's minimum frame to fit inside a
  // compact 3x3 window instead of falling through to the global minimum zoom.
  const tileSpanCapacity = radius * 2 + 0.75;

  let resolved:
    | {
        zoom: number;
        tileCenter: TileCoordinate;
        xSpanTiles: number;
        ySpanTiles: number;
        framedWidthTiles: number;
        framedHeightTiles: number;
      }
    | null = null;

  for (let zoom = maxZoom; zoom >= THREE_OSM_MIN_ZOOM; zoom -= 1) {
    const projected = usable.map(([lat, lon]) =>
      lonLatToTileCoordinate(lon, lat, zoom),
    );
    const scale = 2 ** zoom;
    const xRange = circularTileRange(
      projected.map((point) => point.x),
      scale,
    );
    const ys = projected.map((point) => point.y);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const ySpanTiles = maxY - minY;
    const paddedWidth = Math.max(300 / 256, xRange.span * 1.28);
    const paddedHeight = Math.max(240 / 256, ySpanTiles * 1.28);
    const framedWidthTiles = Math.max(
      paddedWidth,
      paddedHeight * safeAspect,
    );
    const framedHeightTiles = Math.max(
      paddedHeight,
      paddedWidth / safeAspect,
    );
    resolved = {
      zoom,
      tileCenter: {
        x: xRange.center,
        y: (minY + maxY) / 2,
        z: zoom,
      },
      xSpanTiles: xRange.span,
      ySpanTiles,
      framedWidthTiles,
      framedHeightTiles,
    };
    if (
      framedWidthTiles <= tileSpanCapacity &&
      framedHeightTiles <= tileSpanCapacity
    ) {
      break;
    }
  }

  if (!resolved) return null;
  const centerLon = tileXToLongitude(
    resolved.tileCenter.x,
    resolved.tileCenter.z,
  );
  const centerLat = tileYToLatitude(
    resolved.tileCenter.y,
    resolved.tileCenter.z,
  );
  return {
    ...resolved,
    centerLat,
    centerLon,
    pointCount: usable.length,
  };
}

function finiteWorldPoints(points: ThreeOsmWorldPoint[]) {
  return points.filter(
    (point) =>
      Number.isFinite(point?.x) &&
      Number.isFinite(point?.y) &&
      Number.isFinite(point?.z),
  );
}

const THREE_OSM_PERSPECTIVE_ELEVATION_RADIANS = (60 * Math.PI) / 180;

function threeOsmPerspectiveDirection() {
  return {
    x: 0,
    y: Math.sin(THREE_OSM_PERSPECTIVE_ELEVATION_RADIANS),
    z: Math.cos(THREE_OSM_PERSPECTIVE_ELEVATION_RADIANS),
  };
}

function threeOsmPerspectiveUp() {
  return {
    x: 0,
    y: Math.cos(THREE_OSM_PERSPECTIVE_ELEVATION_RADIANS),
    z: -Math.sin(THREE_OSM_PERSPECTIVE_ELEVATION_RADIANS),
  };
}

export function resolveThreeOsmDefaultOrthographicZoom({
  aspect = 1,
  tileRadius = 2,
}: {
  aspect?: unknown;
  tileRadius?: unknown;
}) {
  const safeAspect = Math.max(0.35, Number(aspect) || 1);
  const radius = Math.min(2, Math.max(1, Math.round(Number(tileRadius) || 1)));
  const safeTileHalfSpan =
    (radius + 0.5) * THREE_OSM_TILE_SIZE * 0.9;
  const viewportHalfSpan =
    THREE_OSM_ORTHOGRAPHIC_HALF_HEIGHT * Math.max(1, safeAspect);
  return Math.max(0.5, viewportHalfSpan / safeTileHalfSpan);
}

export function resolveThreeOsmDefaultCameraFrame({
  mode,
  width,
  height,
  occlusionWidth = 0,
  tileRadius = 2,
}: {
  mode: "2d" | "3d";
  width: unknown;
  height: unknown;
  occlusionWidth?: unknown;
  tileRadius?: unknown;
}) {
  const safeWidth = Math.max(1, Number(width) || 1);
  const safeHeight = Math.max(1, Number(height) || 1);
  const occludedWidth = Math.min(
    safeWidth - 1,
    Math.max(0, Number(occlusionWidth) || 0),
  );
  const visibleAspect = (safeWidth - occludedWidth) / safeHeight;

  if (mode === "2d") {
    const orthographicZoom = resolveThreeOsmDefaultOrthographicZoom({
      aspect: visibleAspect,
      tileRadius,
    });
    const worldPerPixel =
      (2 * THREE_OSM_ORTHOGRAPHIC_HALF_HEIGHT) /
      (orthographicZoom * safeHeight);
    const targetX = occludedWidth ? -(occludedWidth / 2) * worldPerPixel : 0;
    return {
      mode,
      target: { x: targetX, y: 0, z: 0 },
      position: { x: targetX, y: 900, z: 0.01 },
      up: { x: 0, y: 0, z: -1 },
      orthographicZoom,
      distance: null,
      elevationDegrees: null,
      visibleAspect,
      occlusionWidth: occludedWidth,
    };
  }

  const perspective = resolveThreeOsmDefaultPerspectiveFrame({
    aspect: visibleAspect,
    tileRadius,
  });
  const worldPerPixel =
    (2 * Math.tan((45 * Math.PI) / 360) * perspective.distance) / safeHeight;
  const targetX = occludedWidth ? -(occludedWidth / 2) * worldPerPixel : 0;
  return {
    mode,
    target: { x: targetX, y: 0, z: 0 },
    position: {
      x: targetX + perspective.position.x,
      y: perspective.position.y,
      z: perspective.position.z,
    },
    up: perspective.up,
    orthographicZoom: null,
    distance: perspective.distance,
    elevationDegrees: perspective.elevationDegrees,
    visibleAspect,
    occlusionWidth: occludedWidth,
  };
}

export function resolveThreeOsmDefaultPerspectiveFrame({
  aspect = 1,
  tileRadius = 2,
}: {
  aspect?: unknown;
  tileRadius?: unknown;
}) {
  const safeAspect = Math.max(0.35, Number(aspect) || 1);
  const radius = Math.min(2, Math.max(1, Math.round(Number(tileRadius) || 1)));
  const tileHalfSpan = (radius + 0.5) * THREE_OSM_TILE_SIZE;
  const focalHalfSpan = safeAspect >= 1
    ? Math.min(tileHalfSpan * 0.9, radius * THREE_OSM_TILE_SIZE - 12)
    : tileHalfSpan * 0.9;
  const verticalFov = (45 * Math.PI) / 180;
  const verticalHalfFov = verticalFov / 2;
  const horizontalFov = 2 * Math.atan(Math.tan(verticalHalfFov) * safeAspect);
  const farGroundFactor =
    Math.tan(THREE_OSM_PERSPECTIVE_ELEVATION_RADIANS) /
      Math.tan(THREE_OSM_PERSPECTIVE_ELEVATION_RADIANS - verticalHalfFov) -
    1;
  let horizontalDistance = focalHalfSpan / farGroundFactor;
  let height =
    horizontalDistance * Math.tan(THREE_OSM_PERSPECTIVE_ELEVATION_RADIANS);
  let distance = Math.hypot(horizontalDistance, height);
  const horizontalDistanceLimit =
    focalHalfSpan / Math.max(0.05, Math.tan(horizontalFov / 2));
  if (distance > horizontalDistanceLimit) {
    const scale = horizontalDistanceLimit / distance;
    horizontalDistance *= scale;
    height *= scale;
    distance *= scale;
  }
  const direction = threeOsmPerspectiveDirection();
  const position = {
    x: 0,
    y: Math.max(260, height),
    z: Math.max(150, horizontalDistance),
  };
  return {
    target: { x: 0, y: 0, z: 0 },
    position,
    direction,
    up: threeOsmPerspectiveUp(),
    distance: Math.hypot(position.y, position.z),
    elevationDegrees: 60,
  };
}

export function resolveThreeOsmCameraFrame({
  points = [],
  mode = "2d",
  aspect = 1,
}: {
  points?: ThreeOsmWorldPoint[];
  mode?: "2d" | "3d";
  aspect?: unknown;
}) {
  const usable = finiteWorldPoints(points);
  if (!usable.length) return null;
  const safeAspect = Math.max(0.35, Number(aspect) || 1);
  const minX = Math.min(...usable.map((point) => point.x));
  const maxX = Math.max(...usable.map((point) => point.x));
  const minY = Math.min(...usable.map((point) => point.y));
  const maxY = Math.max(...usable.map((point) => point.y));
  const minZ = Math.min(...usable.map((point) => point.z));
  const maxZ = Math.max(...usable.map((point) => point.z));
  const target = {
    x: (minX + maxX) / 2,
    // Keep the geographic plane as the visual anchor. Camera distance, not an
    // elevated look-at point, reserves the room needed for cruise altitude.
    y: mode === "3d" ? minY : 0,
    z: (minZ + maxZ) / 2,
  };

  if (mode === "2d") {
    const paddedWidth = Math.max(300, (maxX - minX) * 1.28);
    const paddedHeight = Math.max(240, (maxZ - minZ) * 1.28);
    return {
      target,
      position: { x: target.x, y: 900, z: target.z + 0.01 },
      up: { x: 0, y: 0, z: -1 },
      orthographicZoom: Math.min(
        4,
        Math.max(0.18, Math.min((600 * safeAspect) / paddedWidth, 600 / paddedHeight)),
      ),
      distance: 900,
    };
  }

  const width = Math.max(40, maxX - minX);
  const height = Math.max(40, maxY - minY);
  const depth = Math.max(40, maxZ - minZ);
  const radius = Math.hypot(width, height, depth) / 2;
  const verticalFov = (45 * Math.PI) / 180;
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * safeAspect);
  const limitingFov = Math.min(verticalFov, horizontalFov);
  const distance = Math.max(260, (radius / Math.sin(limitingFov / 2)) * 1.14);
  const direction = threeOsmPerspectiveDirection();
  return {
    target,
    position: {
      x: target.x + direction.x * distance,
      y: target.y + direction.y * distance,
      z: target.z + direction.z * distance,
    },
    up: threeOsmPerspectiveUp(),
    orthographicZoom: 1,
    distance,
  };
}
