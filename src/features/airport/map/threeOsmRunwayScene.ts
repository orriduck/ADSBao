import * as THREE from "three";
import type {
  ThreeOsmContrastMode,
  ThreeOsmVisualPalette,
} from "./threeOsmAccessibilityPreferences";
import {
  resolveThreeOsmOperationalProminence,
} from "./threeOsmOperationalProminence";
import {
  lonLatAltitudeToThreeOsmWorld,
  type TileCoordinate,
} from "./threeOsmProjection";

const FEET_TO_METERS = 0.3048;
const DEFAULT_RUNWAY_WIDTH_METERS = 45;
const METERS_PER_DEGREE_LATITUDE = 111_320;
const MIN_RUNWAY_DISPLAY_WIDTH_WORLD = 3;
const MAX_RUNWAY_DISPLAY_WIDTH_WORLD = 10;
const RUNWAY_HALO_EXTRA_WIDTH_WORLD = 3;

function finiteCoordinate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function geographicDistanceMeters(
  from: [number, number],
  to: [number, number],
) {
  const centerLat = (from[1] + to[1]) / 2;
  const metersPerDegreeLongitude =
    METERS_PER_DEGREE_LATITUDE * Math.cos((centerLat * Math.PI) / 180);
  return Math.hypot(
    (to[0] - from[0]) * metersPerDegreeLongitude,
    (to[1] - from[1]) * METERS_PER_DEGREE_LATITUDE,
  );
}

function resolveRunwayWidthWorld({
  feature,
  from,
  to,
  worldLength,
}: {
  feature: Record<string, any>;
  from: [number, number];
  to: [number, number];
  worldLength: number;
}) {
  const segmentMeters = geographicDistanceMeters(from, to);
  const widthFt = Number(feature?.properties?.widthFt);
  const widthMeters =
    Number.isFinite(widthFt) && widthFt > 0
      ? widthFt * FEET_TO_METERS
      : DEFAULT_RUNWAY_WIDTH_METERS;
  const physicalWidthWorld =
    segmentMeters > 0 ? (widthMeters / segmentMeters) * worldLength : 0;
  return THREE.MathUtils.clamp(
    physicalWidthWorld,
    MIN_RUNWAY_DISPLAY_WIDTH_WORLD,
    MAX_RUNWAY_DISPLAY_WIDTH_WORLD,
  );
}

function pushRunwayQuad(
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
  const fromLeft = [from.x + offsetX, y, from.z + offsetZ] as const;
  const fromRight = [from.x - offsetX, y, from.z - offsetZ] as const;
  const toLeft = [to.x + offsetX, y, to.z + offsetZ] as const;
  const toRight = [to.x - offsetX, y, to.z - offsetZ] as const;
  positions.push(
    ...fromLeft,
    ...fromRight,
    ...toLeft,
    ...toLeft,
    ...fromRight,
    ...toRight,
  );
  return true;
}

function createRunwayMesh({
  positions,
  color,
  opacity,
  name,
  renderOrder,
}: {
  positions: number[];
  color: number;
  opacity: number;
  name: string;
  renderOrder: number;
}) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.computeBoundingSphere();
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color,
      opacity,
      transparent: opacity < 1,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  mesh.name = name;
  mesh.renderOrder = renderOrder;
  return mesh;
}

export function createThreeOsmRunwayScene({
  runwayCollection,
  tileCenter,
  centerLat,
  palette,
  contrastMode,
}: {
  runwayCollection: Record<string, any> | null;
  tileCenter: TileCoordinate;
  centerLat: number;
  palette: ThreeOsmVisualPalette;
  contrastMode: ThreeOsmContrastMode;
}) {
  const group = new THREE.Group();
  group.name = "three-osm-runway-corridors";
  const haloPositions: number[] = [];
  const surfacePositions: number[] = [];
  let runwayCount = 0;
  let segmentCount = 0;
  const prominence = resolveThreeOsmOperationalProminence(contrastMode);

  for (const feature of runwayCollection?.features || []) {
    const coordinates = feature?.geometry?.coordinates;
    if (!Array.isArray(coordinates)) continue;
    let runwayRendered = false;
    for (let index = 1; index < coordinates.length; index += 1) {
      const fromCoordinate = coordinates[index - 1];
      const toCoordinate = coordinates[index];
      const fromLon = finiteCoordinate(fromCoordinate?.[0]);
      const fromLat = finiteCoordinate(fromCoordinate?.[1]);
      const toLon = finiteCoordinate(toCoordinate?.[0]);
      const toLat = finiteCoordinate(toCoordinate?.[1]);
      if (
        fromLon === null ||
        fromLat === null ||
        toLon === null ||
        toLat === null
      ) {
        continue;
      }
      const fromPoint = lonLatAltitudeToThreeOsmWorld({
        lon: fromLon,
        lat: fromLat,
        center: tileCenter,
        centerLat,
      });
      const toPoint = lonLatAltitudeToThreeOsmWorld({
        lon: toLon,
        lat: toLat,
        center: tileCenter,
        centerLat,
      });
      if (!fromPoint || !toPoint) continue;
      const worldLength = Math.hypot(
        toPoint.x - fromPoint.x,
        toPoint.z - fromPoint.z,
      );
      if (!worldLength) continue;
      const width = resolveRunwayWidthWorld({
        feature,
        from: [fromLon, fromLat],
        to: [toLon, toLat],
        worldLength,
      });
      pushRunwayQuad(
        haloPositions,
        fromPoint,
        toPoint,
        width + RUNWAY_HALO_EXTRA_WIDTH_WORLD,
        1.7,
      );
      pushRunwayQuad(surfacePositions, fromPoint, toPoint, width, 1.9);
      runwayRendered = true;
      segmentCount += 1;
    }
    if (runwayRendered) runwayCount += 1;
  }

  if (haloPositions.length) {
    group.add(
      createRunwayMesh({
        positions: haloPositions,
        color: palette.inverse,
        opacity: prominence.runwayHalo,
        name: "three-osm-runway-halo",
        renderOrder: 28,
      }),
    );
  }
  if (surfacePositions.length) {
    group.add(
      createRunwayMesh({
        positions: surfacePositions,
        color: palette.runway,
        opacity: prominence.runwaySurface,
        name: "three-osm-runway-surfaces",
        renderOrder: 29,
      }),
    );
  }

  return {
    group,
    runwayCount,
    segmentCount,
    vertexCount: surfacePositions.length / 3,
  };
}
