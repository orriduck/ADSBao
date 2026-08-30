import * as THREE from "three";
import { AIRPORT_MAP_ZOOM } from "@/config/aviation";
import type {
  ThreeOsmContrastMode,
  ThreeOsmVisualPalette,
} from "./threeOsmAccessibilityPreferences";
import {
  lonLatAltitudeToThreeOsmWorld,
  type TileCoordinate,
} from "./threeOsmProjection";
import {
  resolveThreeOsmOperationalProminence,
} from "./threeOsmOperationalProminence";
import {
  pushThreeOsmCorridorQuad,
  pushThreeOsmDashedCorridor,
  type ThreeOsmCorridorPoint,
} from "./threeOsmCorridorGeometry";

type ProjectedPoint = ThreeOsmCorridorPoint;

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

function lineStringsFromGeometry(geometry: Record<string, any> | null) {
  if (geometry?.type === "LineString") {
    return Array.isArray(geometry.coordinates) ? [geometry.coordinates] : [];
  }
  if (geometry?.type === "MultiLineString") {
    return Array.isArray(geometry.coordinates) ? geometry.coordinates : [];
  }
  return [];
}

function createMesh({
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

function appendProjectedLine({
  coordinates,
  positions,
  tileCenter,
  centerLat,
  dashed,
  width,
  y,
}: {
  coordinates: unknown;
  positions: number[];
  tileCenter: TileCoordinate;
  centerLat: number;
  dashed?: { dash: number; gap: number };
  width: number;
  y: number;
}) {
  if (!Array.isArray(coordinates)) return { segments: 0, dashes: 0 };
  let segments = 0;
  let dashes = 0;
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
    const added = dashed
      ? pushThreeOsmDashedCorridor(positions, from, to, { ...dashed, width, y })
      : Number(pushThreeOsmCorridorQuad(positions, from, to, width, y));
    if (!added) continue;
    segments += 1;
    dashes += dashed ? added : 0;
  }
  return { segments, dashes };
}

export function createThreeOsmGroundLightingScene({
  runwayLighting,
  surfaceCollection,
  tileCenter,
  centerLat,
  zoom,
  theme,
  palette,
  contrastMode,
}: {
  runwayLighting: Record<string, any> | null;
  surfaceCollection: Record<string, any> | null;
  tileCenter: TileCoordinate;
  centerLat: number;
  zoom: number;
  theme: string;
  palette: ThreeOsmVisualPalette;
  contrastMode: ThreeOsmContrastMode;
}) {
  const group = new THREE.Group();
  group.name = "three-osm-ground-lighting";
  const visible = theme === "dark" && Number(zoom) >= AIRPORT_MAP_ZOOM.detail;
  const diagnostics = {
    runwayFeatures: 0,
    runwaySegments: 0,
    runwayDashes: 0,
    reilCount: 0,
    taxiwayFeatures: 0,
    taxiwaySegments: 0,
    taxiwayDashes: 0,
    vertexCount: 0,
    drawBatches: 0,
  };
  if (!visible) return { group, visible, ...diagnostics };

  const runwayWhitePositions: number[] = [];
  const runwayAmberPositions: number[] = [];
  const taxiwayBluePositions: number[] = [];
  const taxiwayGreenPositions: number[] = [];
  const reilPositions: ProjectedPoint[] = [];

  for (const feature of runwayLighting?.features || []) {
    const role = String(feature?.properties?.role || "");
    if (role === "reil") {
      const point = projectCoordinate({
        coordinate: feature?.geometry?.coordinates,
        tileCenter,
        centerLat,
      });
      if (!point) continue;
      reilPositions.push(point);
      diagnostics.runwayFeatures += 1;
      diagnostics.reilCount += 1;
      continue;
    }
    if (feature?.geometry?.type !== "LineString") continue;
    const style = role === "edge-caution"
      ? { positions: runwayAmberPositions, width: 2, dashed: { dash: 1.6, gap: 6.4 } }
      : role === "edge"
        ? { positions: runwayWhitePositions, width: 2, dashed: { dash: 1.6, gap: 6.4 } }
        : role === "centerline"
          ? { positions: runwayWhitePositions, width: 1.1, dashed: { dash: 3, gap: 6 } }
          : role === "endbar"
            ? { positions: runwayWhitePositions, width: 2.4, dashed: undefined }
            : null;
    if (!style) continue;
    const result = appendProjectedLine({
      coordinates: feature.geometry.coordinates,
      positions: style.positions,
      tileCenter,
      centerLat,
      dashed: style.dashed,
      width: style.width,
      y: 2.25,
    });
    if (!result.segments) continue;
    diagnostics.runwayFeatures += 1;
    diagnostics.runwaySegments += result.segments;
    diagnostics.runwayDashes += result.dashes;
  }

  for (const feature of surfaceCollection?.features || []) {
    const kind = String(feature?.properties?.kind || "");
    if (kind !== "taxiway" && kind !== "taxilane") continue;
    let rendered = false;
    for (const coordinates of lineStringsFromGeometry(feature?.geometry)) {
      const blue = appendProjectedLine({
        coordinates,
        positions: taxiwayBluePositions,
        tileCenter,
        centerLat,
        width: 1.3,
        y: 1.65,
      });
      const green = appendProjectedLine({
        coordinates,
        positions: taxiwayGreenPositions,
        tileCenter,
        centerLat,
        dashed: { dash: 1.5, gap: 4 },
        width: 1.2,
        y: 1.75,
      });
      diagnostics.taxiwaySegments += blue.segments;
      diagnostics.taxiwayDashes += green.dashes;
      rendered ||= blue.segments > 0;
    }
    if (rendered) diagnostics.taxiwayFeatures += 1;
  }

  const prominence = resolveThreeOsmOperationalProminence(contrastMode);
  const meshSpecs = [
    [runwayWhitePositions, palette.runwayLightWhite, prominence.runwayLightWhite, "three-osm-runway-white-lights", 32],
    [runwayAmberPositions, palette.runwayLightAmber, prominence.runwayLightAmber, "three-osm-runway-amber-lights", 33],
    [taxiwayBluePositions, palette.taxiwayLightBlue, prominence.taxiwayLightBlue, "three-osm-taxiway-blue-lights", 26],
    [taxiwayGreenPositions, palette.taxiwayLightGreen, prominence.taxiwayLightGreen, "three-osm-taxiway-green-lights", 27],
  ] as const;
  for (const [positions, color, opacity, name, renderOrder] of meshSpecs) {
    if (!positions.length) continue;
    group.add(createMesh({ positions, color, opacity, name, renderOrder }));
  }

  if (reilPositions.length) {
    const geometry = new THREE.CircleGeometry(1.8, 8);
    geometry.rotateX(-Math.PI / 2);
    const mesh = new THREE.InstancedMesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color: palette.runwayLightWhite,
        transparent: prominence.reil < 1,
        opacity: prominence.reil,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      reilPositions.length,
    );
    const matrix = new THREE.Matrix4();
    reilPositions.forEach((point, index) => {
      matrix.makeTranslation(point.x, 2.35, point.z);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.name = "three-osm-runway-reil-lights";
    mesh.renderOrder = 34;
    group.add(mesh);
  }

  diagnostics.vertexCount =
    (runwayWhitePositions.length +
      runwayAmberPositions.length +
      taxiwayBluePositions.length +
      taxiwayGreenPositions.length) /
      3 +
    reilPositions.length * 9;
  diagnostics.drawBatches = group.children.length;
  return { group, visible, ...diagnostics };
}
