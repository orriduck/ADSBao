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

const EARTH_CIRCUMFERENCE_METERS = 40_075_016.686;
const TAXIWAY_WIDTH_METERS = 22;
const TAXILANE_WIDTH_METERS = 8;
const MIN_TAXIWAY_WIDTH_WORLD = 1.2;
const MIN_TAXILANE_WIDTH_WORLD = 0.65;
const MAX_TAXIWAY_WIDTH_WORLD = 9;
const MAX_TAXILANE_WIDTH_WORLD = 5;
const APRON_OUTLINE_WIDTH_WORLD = 0.7;

type ThreeOsmSurfaceKind = "apron" | "taxiway" | "taxilane";

function finiteCoordinate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function metersPerWorldUnit(centerLat: number, zoom: number) {
  return (
    (Math.cos((centerLat * Math.PI) / 180) * EARTH_CIRCUMFERENCE_METERS) /
    (256 * 2 ** zoom)
  );
}

function resolveLineWidthWorld({
  kind,
  centerLat,
  zoom,
}: {
  kind: Exclude<ThreeOsmSurfaceKind, "apron">;
  centerLat: number;
  zoom: number;
}) {
  const metersPerUnit = metersPerWorldUnit(centerLat, zoom);
  const physicalWidth =
    (kind === "taxiway" ? TAXIWAY_WIDTH_METERS : TAXILANE_WIDTH_METERS) /
    metersPerUnit;
  return THREE.MathUtils.clamp(
    physicalWidth,
    kind === "taxiway"
      ? MIN_TAXIWAY_WIDTH_WORLD
      : MIN_TAXILANE_WIDTH_WORLD,
    kind === "taxiway"
      ? MAX_TAXIWAY_WIDTH_WORLD
      : MAX_TAXILANE_WIDTH_WORLD,
  );
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
    from.x + offsetX,
    y,
    from.z + offsetZ,
    from.x - offsetX,
    y,
    from.z - offsetZ,
    to.x + offsetX,
    y,
    to.z + offsetZ,
    to.x + offsetX,
    y,
    to.z + offsetZ,
    from.x - offsetX,
    y,
    from.z - offsetZ,
    to.x - offsetX,
    y,
    to.z - offsetZ,
  );
  return true;
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

function polygonsFromGeometry(geometry: Record<string, any> | null) {
  if (geometry?.type === "Polygon") {
    return Array.isArray(geometry.coordinates) ? [geometry.coordinates] : [];
  }
  if (geometry?.type === "MultiPolygon") {
    return Array.isArray(geometry.coordinates) ? geometry.coordinates : [];
  }
  return [];
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

function pushApronPolygon({
  positions,
  outlinePositions,
  polygon,
  tileCenter,
  centerLat,
}: {
  positions: number[];
  outlinePositions: number[];
  polygon: unknown;
  tileCenter: TileCoordinate;
  centerLat: number;
}) {
  if (!Array.isArray(polygon) || !polygon.length) return 0;
  const projectedRings = polygon
    .map((ring) => projectRing({ ring, tileCenter, centerLat }))
    .filter((ring) => ring.length >= 3);
  const contour = projectedRings[0];
  if (!contour) return 0;
  const holes = projectedRings.slice(1);
  const points = [...contour, ...holes.flat()];
  const triangles = THREE.ShapeUtils.triangulateShape(contour, holes);
  for (const triangle of triangles) {
    for (const index of triangle) {
      const point = points[index];
      positions.push(point.x, 0.9, point.y);
    }
  }
  for (const ring of projectedRings) {
    for (let index = 0; index < ring.length; index += 1) {
      const from = ring[index];
      const to = ring[(index + 1) % ring.length];
      pushCorridorQuad(
        outlinePositions,
        new THREE.Vector3(from.x, 0, from.y),
        new THREE.Vector3(to.x, 0, to.y),
        APRON_OUTLINE_WIDTH_WORLD,
        1.05,
      );
    }
  }
  return triangles.length;
}

function createSurfaceMesh({
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

export function createThreeOsmSurfaceScene({
  surfaceCollection,
  tileCenter,
  centerLat,
  zoom,
  palette,
  contrastMode,
}: {
  surfaceCollection: Record<string, any> | null;
  tileCenter: TileCoordinate;
  centerLat: number;
  zoom: number;
  palette: ThreeOsmVisualPalette;
  contrastMode: ThreeOsmContrastMode;
}) {
  const group = new THREE.Group();
  group.name = "three-osm-airport-surface";
  const numericZoom = Number(zoom);
  const visible =
    !Number.isFinite(numericZoom) || numericZoom > AIRPORT_MAP_ZOOM.approach;
  const diagnostics = {
    apronCount: 0,
    apronTriangles: 0,
    taxiwayCount: 0,
    taxiwaySegments: 0,
    taxilaneCount: 0,
    taxilaneSegments: 0,
    vertexCount: 0,
  };
  if (!visible) return { group, visible, ...diagnostics };

  const apronPositions: number[] = [];
  const apronOutlinePositions: number[] = [];
  const taxiwayPositions: number[] = [];
  const taxilanePositions: number[] = [];
  const effectiveZoom = Number.isFinite(numericZoom)
    ? numericZoom
    : AIRPORT_MAP_ZOOM.airport;
  const taxiwayWidth = resolveLineWidthWorld({
    kind: "taxiway",
    centerLat,
    zoom: effectiveZoom,
  });
  const taxilaneWidth = resolveLineWidthWorld({
    kind: "taxilane",
    centerLat,
    zoom: effectiveZoom,
  });

  for (const feature of surfaceCollection?.features || []) {
    const kind = String(feature?.properties?.kind || "") as ThreeOsmSurfaceKind;
    if (kind === "apron") {
      let rendered = false;
      for (const polygon of polygonsFromGeometry(feature?.geometry)) {
        const triangleCount = pushApronPolygon({
          positions: apronPositions,
          outlinePositions: apronOutlinePositions,
          polygon,
          tileCenter,
          centerLat,
        });
        if (!triangleCount) continue;
        diagnostics.apronTriangles += triangleCount;
        rendered = true;
      }
      if (rendered) diagnostics.apronCount += 1;
      continue;
    }
    if (kind !== "taxiway" && kind !== "taxilane") continue;
    const positions = kind === "taxiway" ? taxiwayPositions : taxilanePositions;
    const width = kind === "taxiway" ? taxiwayWidth : taxilaneWidth;
    let rendered = false;
    for (const line of lineStringsFromGeometry(feature?.geometry)) {
      if (!Array.isArray(line)) continue;
      for (let index = 1; index < line.length; index += 1) {
        const from = projectCoordinate({
          coordinate: line[index - 1],
          tileCenter,
          centerLat,
        });
        const to = projectCoordinate({
          coordinate: line[index],
          tileCenter,
          centerLat,
        });
        if (!from || !to) continue;
        if (!pushCorridorQuad(positions, from, to, width, kind === "taxiway" ? 1.25 : 1.4)) {
          continue;
        }
        diagnostics[`${kind}Segments`] += 1;
        rendered = true;
      }
    }
    if (rendered) diagnostics[`${kind}Count`] += 1;
  }

  const elevatedContrast = contrastMode !== "standard";
  if (apronPositions.length) {
    group.add(
      createSurfaceMesh({
        positions: apronPositions,
        color: palette.foreground,
        opacity: elevatedContrast ? 0.34 : 0.16,
        name: "three-osm-apron-fills",
        renderOrder: 20,
      }),
    );
  }
  if (apronOutlinePositions.length) {
    group.add(
      createSurfaceMesh({
        positions: apronOutlinePositions,
        color: palette.contextMarker,
        opacity: elevatedContrast ? 1 : 0.42,
        name: "three-osm-apron-outlines",
        renderOrder: 21,
      }),
    );
  }
  if (taxiwayPositions.length) {
    group.add(
      createSurfaceMesh({
        positions: taxiwayPositions,
        color: palette.foreground,
        opacity: elevatedContrast ? 1 : 0.4,
        name: "three-osm-taxiway-corridors",
        renderOrder: 22,
      }),
    );
  }
  if (taxilanePositions.length) {
    group.add(
      createSurfaceMesh({
        positions: taxilanePositions,
        color: palette.contextMarker,
        opacity: elevatedContrast ? 0.82 : 0.3,
        name: "three-osm-taxilane-corridors",
        renderOrder: 23,
      }),
    );
  }
  diagnostics.vertexCount =
    (apronPositions.length +
      apronOutlinePositions.length +
      taxiwayPositions.length +
      taxilanePositions.length) /
    3;
  return { group, visible, ...diagnostics };
}
