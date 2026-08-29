import * as THREE from "three";
import type {
  ThreeOsmContrastMode,
  ThreeOsmVisualPalette,
} from "./threeOsmAccessibilityPreferences";
import {
  lonLatAltitudeToThreeOsmWorld,
  type TileCoordinate,
} from "./threeOsmProjection";

const APPROACH_LINE_WIDTH_WORLD = 1.4;
const APPROACH_DASH_WORLD = 6;
const APPROACH_GAP_WORLD = 8;

function finiteCoordinate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function projectCoordinate({
  coordinate,
  tileCenter,
  centerLat,
}: {
  coordinate: unknown;
  tileCenter: TileCoordinate;
  centerLat: number;
}) {
  if (!Array.isArray(coordinate)) return null;
  const lon = finiteCoordinate(coordinate[0]);
  const lat = finiteCoordinate(coordinate[1]);
  if (lon === null || lat === null) return null;
  return lonLatAltitudeToThreeOsmWorld({
    lon,
    lat,
    center: tileCenter,
    centerLat,
  });
}

function pushCorridorQuad(
  positions: number[],
  from: THREE.Vector3,
  to: THREE.Vector3,
  width: number,
  y: number,
) {
  const deltaX = to.x - from.x;
  const deltaZ = to.z - from.z;
  const length = Math.hypot(deltaX, deltaZ);
  if (!length) return false;
  const halfWidth = width / 2;
  const offsetX = (-deltaZ / length) * halfWidth;
  const offsetZ = (deltaX / length) * halfWidth;
  positions.push(
    from.x + offsetX, y, from.z + offsetZ,
    from.x - offsetX, y, from.z - offsetZ,
    to.x + offsetX, y, to.z + offsetZ,
    to.x + offsetX, y, to.z + offsetZ,
    from.x - offsetX, y, from.z - offsetZ,
    to.x - offsetX, y, to.z - offsetZ,
  );
  return true;
}

function pushDashedSegment(
  positions: number[],
  from: THREE.Vector3,
  to: THREE.Vector3,
) {
  const deltaX = to.x - from.x;
  const deltaZ = to.z - from.z;
  const length = Math.hypot(deltaX, deltaZ);
  if (!length) return 0;
  const directionX = deltaX / length;
  const directionZ = deltaZ / length;
  let dashCount = 0;
  for (let start = 0; start < length; start += APPROACH_DASH_WORLD + APPROACH_GAP_WORLD) {
    const end = Math.min(length, start + APPROACH_DASH_WORLD);
    if (end - start < 0.25) continue;
    const dashFrom = new THREE.Vector3(
      from.x + directionX * start,
      0,
      from.z + directionZ * start,
    );
    const dashTo = new THREE.Vector3(
      from.x + directionX * end,
      0,
      from.z + directionZ * end,
    );
    if (
      pushCorridorQuad(
        positions,
        dashFrom,
        dashTo,
        APPROACH_LINE_WIDTH_WORLD,
        1.45,
      )
    ) {
      dashCount += 1;
    }
  }
  return dashCount;
}

function projectRing({
  ring,
  tileCenter,
  centerLat,
}: {
  ring: unknown;
  tileCenter: TileCoordinate;
  centerLat: number;
}) {
  if (!Array.isArray(ring)) return [] as THREE.Vector2[];
  const points = ring.flatMap((coordinate) => {
    const point = projectCoordinate({ coordinate, tileCenter, centerLat });
    return point ? [new THREE.Vector2(point.x, point.z)] : [];
  });
  if (
    points.length > 1 &&
    points[0].distanceToSquared(points[points.length - 1]) < 1e-8
  ) {
    points.pop();
  }
  return points;
}

function createMesh({
  positions,
  color,
  opacity,
  vertexColors = null,
  name,
  renderOrder,
}: {
  positions: number[];
  color: number;
  opacity: number;
  vertexColors?: number[] | null;
  name: string;
  renderOrder: number;
}) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  if (vertexColors?.length === (positions.length / 3) * 4) {
    geometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(vertexColors, 4),
    );
  }
  geometry.computeBoundingSphere();
  const usesVertexAlpha = Boolean(vertexColors?.length);
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color: usesVertexAlpha ? 0xffffff : color,
      opacity,
      transparent: usesVertexAlpha || opacity < 1,
      vertexColors: usesVertexAlpha,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  mesh.name = name;
  mesh.renderOrder = renderOrder;
  return mesh;
}

export function createThreeOsmRunwayApproachScene({
  visualization,
  tileCenter,
  centerLat,
  palette,
  contrastMode,
}: {
  visualization: Record<string, any> | null;
  tileCenter: TileCoordinate;
  centerLat: number;
  palette: ThreeOsmVisualPalette;
  contrastMode: ThreeOsmContrastMode;
}) {
  const group = new THREE.Group();
  group.name = "three-osm-runway-approaches";
  const features = Array.isArray(visualization?.data?.features)
    ? visualization.data.features
    : [];
  const linePositions: number[] = [];
  const beamPositions: number[] = [];
  const beamColors: number[] = [];
  let featureCount = 0;
  let dashCount = 0;
  let triangleCount = 0;

  if (visualization?.kind === "approach-lines") {
    for (const feature of features) {
      const coordinates = feature?.geometry?.coordinates;
      if (!Array.isArray(coordinates)) continue;
      let rendered = false;
      for (let index = 1; index < coordinates.length; index += 1) {
        const from = projectCoordinate({
          coordinate: coordinates[index - 1],
          tileCenter,
          centerLat,
        });
        const to = projectCoordinate({
          coordinate: coordinates[index],
          tileCenter,
          centerLat,
        });
        if (!from || !to) continue;
        const added = pushDashedSegment(linePositions, from, to);
        dashCount += added;
        rendered ||= added > 0;
      }
      if (rendered) featureCount += 1;
    }
  } else if (visualization?.kind === "approach-beams") {
    for (const feature of features) {
      if (feature?.geometry?.type !== "Polygon") continue;
      const rings = Array.isArray(feature.geometry.coordinates)
        ? feature.geometry.coordinates
        : [];
      const projectedRings = rings
        .map((ring: unknown) => projectRing({ ring, tileCenter, centerLat }))
        .filter((ring: THREE.Vector2[]) => ring.length >= 3);
      const contour = projectedRings[0];
      if (!contour) continue;
      const holes = projectedRings.slice(1);
      const points = [...contour, ...holes.flat()];
      const triangles = THREE.ShapeUtils.triangulateShape(contour, holes);
      const gradientStart = projectCoordinate({
        coordinate: feature?.properties?.gradientStart,
        tileCenter,
        centerLat,
      });
      const gradientEnd = projectCoordinate({
        coordinate: feature?.properties?.gradientEnd,
        tileCenter,
        centerLat,
      });
      const gradientX = gradientEnd && gradientStart
        ? gradientEnd.x - gradientStart.x
        : 0;
      const gradientZ = gradientEnd && gradientStart
        ? gradientEnd.z - gradientStart.z
        : 0;
      const gradientLengthSquared = gradientX ** 2 + gradientZ ** 2;
      const baseOpacity = contrastMode === "standard"
        ? THREE.MathUtils.clamp(Number(feature?.properties?.beamOpacity) || 0.18, 0.08, 0.3)
        : 0.72;
      const color = new THREE.Color(palette.runway);
      for (const triangle of triangles) {
        for (const index of triangle) {
          const point = points[index];
          beamPositions.push(point.x, 1.35, point.y);
          const progress = gradientLengthSquared && gradientStart
            ? THREE.MathUtils.clamp(
                ((point.x - gradientStart.x) * gradientX +
                  (point.y - gradientStart.z) * gradientZ) /
                  gradientLengthSquared,
                0,
                1,
              )
            : 0;
          const alpha = baseOpacity * (1 - progress) ** 1.7;
          beamColors.push(color.r, color.g, color.b, alpha);
        }
      }
      if (triangles.length) {
        triangleCount += triangles.length;
        featureCount += 1;
      }
    }
  }

  if (linePositions.length) {
    group.add(
      createMesh({
        positions: linePositions,
        color: palette.runway,
        opacity: contrastMode === "standard" ? 0.82 : 1,
        name: "three-osm-runway-approach-lines",
        renderOrder: 24,
      }),
    );
  }
  if (beamPositions.length) {
    group.add(
      createMesh({
        positions: beamPositions,
        color: palette.runway,
        opacity: 1,
        vertexColors: beamColors,
        name: "three-osm-runway-approach-beams",
        renderOrder: 23,
      }),
    );
  }

  return {
    group,
    kind:
      visualization?.kind === "approach-lines" ||
      visualization?.kind === "approach-beams"
        ? visualization.kind
        : "none",
    featureCount,
    dashCount,
    triangleCount,
    vertexCount: (linePositions.length + beamPositions.length) / 3,
  };
}
