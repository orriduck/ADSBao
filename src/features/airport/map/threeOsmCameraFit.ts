import {
  clampThreeOsmZoom,
  lonLatToTileCoordinate,
  tileXToLongitude,
  tileYToLatitude,
  THREE_OSM_MIN_ZOOM,
  type TileCoordinate,
  type ThreeOsmWorldPoint,
} from "./threeOsmProjection";

type LatLonTuple = [number, number];

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
  const tileSpanCapacity = radius * 2 + 0.5;

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
  const directionLength = Math.hypot(440, 360, 520);
  const direction = {
    x: 440 / directionLength,
    y: 360 / directionLength,
    z: 520 / directionLength,
  };
  return {
    target,
    position: {
      x: target.x + direction.x * distance,
      y: target.y + direction.y * distance,
      z: target.z + direction.z * distance,
    },
    orthographicZoom: 1,
    distance,
  };
}
