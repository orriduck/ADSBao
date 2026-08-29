import * as THREE from "three";
import { VectorTile, type VectorTileFeature } from "@mapbox/vector-tile";
import { PbfReader } from "pbf";
import {
  THREE_OSM_TILE_SIZE,
  THREE_OSM_VERTICAL_EXAGGERATION,
  lonLatAltitudeToThreeOsmWorld,
  metersPerTileAtLatitude,
  type TileCoordinate,
} from "./threeOsmProjection";

export type ThreeOsmVectorTilePayload = {
  tile: TileCoordinate;
  data: ArrayBuffer;
};

type RoadTier = "major" | "minor" | "service";

const ROAD_CLASSES: Record<string, RoadTier> = {
  motorway: "major",
  trunk: "major",
  primary: "major",
  secondary: "minor",
  tertiary: "minor",
  minor: "minor",
  busway: "minor",
  bridge: "minor",
  service: "service",
  pier: "service",
};
const ROAD_WIDTH_METERS: Record<RoadTier, number> = {
  major: 20,
  minor: 12,
  service: 7,
};
const ROAD_MIN_WIDTH_WORLD: Record<RoadTier, number> = {
  major: 1.4,
  minor: 0.9,
  service: 0.6,
};
const ROAD_MAX_WIDTH_WORLD: Record<RoadTier, number> = {
  major: 12,
  minor: 8,
  service: 5,
};
const ROAD_MAX_SOURCE_POINTS = 70_000;
const BUILDING_MAX_SOURCE_POINTS = 30_000;
const BUILDING_MIN_HEIGHT_METERS = 3;
const BUILDING_DEFAULT_HEIGHT_METERS = 12;
const BUILDING_MAX_HEIGHT_METERS = 180;

function finiteNumber(value: unknown) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function classifyThreeOsmRoadTier(value: unknown): RoadTier | null {
  return ROAD_CLASSES[String(value || "").trim().toLowerCase()] || null;
}

export function resolveThreeOsmBuildingHeights(properties: Record<string, unknown>) {
  const minimum = Math.max(0, finiteNumber(properties.render_min_height) || 0);
  const requestedHeight =
    finiteNumber(properties.render_height) ?? BUILDING_DEFAULT_HEIGHT_METERS;
  const height = THREE.MathUtils.clamp(
    Math.max(requestedHeight, minimum + BUILDING_MIN_HEIGHT_METERS),
    BUILDING_MIN_HEIGHT_METERS,
    BUILDING_MAX_HEIGHT_METERS,
  );
  return { minimum, height };
}

export function resolveThreeOsmRoadWidthWorld({
  tier,
  centerLat,
  zoom,
}: {
  tier: RoadTier;
  centerLat: number;
  zoom: number;
}) {
  const metersPerWorldUnit =
    metersPerTileAtLatitude(centerLat, zoom) / THREE_OSM_TILE_SIZE;
  return THREE.MathUtils.clamp(
    ROAD_WIDTH_METERS[tier] / metersPerWorldUnit,
    ROAD_MIN_WIDTH_WORLD[tier],
    ROAD_MAX_WIDTH_WORLD[tier],
  );
}

function metersToWorldHeight(meters: number, centerLat: number, zoom: number) {
  return (
    (meters / metersPerTileAtLatitude(centerLat, zoom)) *
    THREE_OSM_TILE_SIZE *
    THREE_OSM_VERTICAL_EXAGGERATION
  );
}

function projectCoordinate(
  coordinate: unknown,
  tileCenter: TileCoordinate,
  centerLat: number,
) {
  if (!Array.isArray(coordinate)) return null;
  return lonLatAltitudeToThreeOsmWorld({
    lon: coordinate[0],
    lat: coordinate[1],
    center: tileCenter,
    centerLat,
  });
}

function geometryLineStrings(geometry: Record<string, any> | null) {
  if (geometry?.type === "LineString") return [geometry.coordinates];
  if (geometry?.type === "MultiLineString") return geometry.coordinates || [];
  return [];
}

function geometryPolygons(geometry: Record<string, any> | null) {
  if (geometry?.type === "Polygon") return [geometry.coordinates];
  if (geometry?.type === "MultiPolygon") return geometry.coordinates || [];
  return [];
}

function projectedRing(
  ring: unknown,
  tileCenter: TileCoordinate,
  centerLat: number,
) {
  if (!Array.isArray(ring)) return [] as THREE.Vector2[];
  const points = ring.flatMap((coordinate) => {
    const point = projectCoordinate(coordinate, tileCenter, centerLat);
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

function pushCorridorQuad(
  positions: number[],
  from: THREE.Vector2,
  to: THREE.Vector2,
  width: number,
  y: number,
) {
  const deltaX = to.x - from.x;
  const deltaZ = to.y - from.y;
  const length = Math.hypot(deltaX, deltaZ);
  if (!length) return false;
  const offsetX = (-deltaZ / length) * (width / 2);
  const offsetZ = (deltaX / length) * (width / 2);
  positions.push(
    from.x + offsetX, y, from.y + offsetZ,
    from.x - offsetX, y, from.y - offsetZ,
    to.x + offsetX, y, to.y + offsetZ,
    to.x + offsetX, y, to.y + offsetZ,
    from.x - offsetX, y, from.y - offsetZ,
    to.x - offsetX, y, to.y - offsetZ,
  );
  return true;
}

function triangulatePolygon(
  polygon: unknown,
  tileCenter: TileCoordinate,
  centerLat: number,
) {
  if (!Array.isArray(polygon)) return null;
  const rings = polygon
    .map((ring) => projectedRing(ring, tileCenter, centerLat))
    .filter((ring) => ring.length >= 3);
  const contour = rings[0];
  if (!contour) return null;
  const holes = rings.slice(1);
  const points = [...contour, ...holes.flat()];
  return {
    rings,
    points,
    triangles: THREE.ShapeUtils.triangulateShape(contour, holes),
  };
}

function createBasicMesh(
  positions: number[],
  color: number,
  name: string,
  renderOrder: number,
  opacity = 1,
) {
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
      side: THREE.DoubleSide,
      opacity,
      transparent: opacity < 1,
      depthWrite: opacity >= 1,
    }),
  );
  mesh.name = name;
  mesh.renderOrder = renderOrder;
  return mesh;
}

function sourcePointCount(feature: VectorTileFeature) {
  return feature
    .loadGeometry()
    .reduce((total, ring) => total + ring.length, 0);
}

export function createThreeOsmVectorContextScene({
  tiles,
  tileCenter,
  centerLat,
  sceneZoom,
  sourceZoom,
  theme,
}: {
  tiles: ThreeOsmVectorTilePayload[];
  tileCenter: TileCoordinate;
  centerLat: number;
  sceneZoom: number;
  sourceZoom: number;
  theme: string;
}) {
  const group = new THREE.Group();
  group.name = "three-osm-vector-context";
  const roadPositions: Record<RoadTier, number[]> = {
    major: [],
    minor: [],
    service: [],
  };
  const buildingRoofPositions: number[] = [];
  const buildingWallPositions: number[] = [];
  const diagnostics = {
    tileCount: tiles.length,
    decodeFailures: 0,
    roadFeatures: 0,
    roadSegments: 0,
    roadSourcePoints: 0,
    buildings: 0,
    buildingRoofTriangles: 0,
    buildingSourcePoints: 0,
    skippedFeatures: 0,
    vertexCount: 0,
  };
  const roadWidths: Record<RoadTier, number> = {
    major: resolveThreeOsmRoadWidthWorld({
      tier: "major",
      centerLat,
      zoom: sceneZoom,
    }),
    minor: resolveThreeOsmRoadWidthWorld({
      tier: "minor",
      centerLat,
      zoom: sceneZoom,
    }),
    service: resolveThreeOsmRoadWidthWorld({
      tier: "service",
      centerLat,
      zoom: sceneZoom,
    }),
  };

  for (const payload of tiles) {
    let vectorTile: VectorTile;
    try {
      vectorTile = new VectorTile(new PbfReader(payload.data));
    } catch {
      diagnostics.decodeFailures += 1;
      continue;
    }

    const transportation = vectorTile.layers.transportation;
    if (transportation) {
      for (let index = 0; index < transportation.length; index += 1) {
        const feature = transportation.feature(index);
        const tier = classifyThreeOsmRoadTier(feature.properties.class);
        if (!tier) continue;
        const pointCount = sourcePointCount(feature);
        if (
          diagnostics.roadSourcePoints + pointCount >
          ROAD_MAX_SOURCE_POINTS
        ) {
          diagnostics.skippedFeatures += 1;
          continue;
        }
        diagnostics.roadSourcePoints += pointCount;
        const geojson = feature.toGeoJSON(
          payload.tile.x,
          payload.tile.y,
          payload.tile.z,
        ) as any;
        let rendered = false;
        for (const line of geometryLineStrings(geojson.geometry)) {
          if (!Array.isArray(line)) continue;
          const projected = line.flatMap((coordinate: unknown) => {
            const point = projectCoordinate(coordinate, tileCenter, centerLat);
            return point ? [new THREE.Vector2(point.x, point.z)] : [];
          });
          for (let pointIndex = 1; pointIndex < projected.length; pointIndex += 1) {
            if (
              pushCorridorQuad(
                roadPositions[tier],
                projected[pointIndex - 1],
                projected[pointIndex],
                roadWidths[tier],
                tier === "major" ? 0.38 : tier === "minor" ? 0.3 : 0.22,
              )
            ) {
              diagnostics.roadSegments += 1;
              rendered = true;
            }
          }
        }
        for (const polygon of geometryPolygons(geojson.geometry)) {
          const triangulated = triangulatePolygon(
            polygon,
            tileCenter,
            centerLat,
          );
          if (!triangulated) continue;
          const y = tier === "major" ? 0.38 : tier === "minor" ? 0.3 : 0.22;
          for (const triangle of triangulated.triangles) {
            for (const pointIndex of triangle) {
              const point = triangulated.points[pointIndex];
              roadPositions[tier].push(point.x, y, point.y);
            }
          }
          diagnostics.roadSegments += triangulated.triangles.length;
          rendered = true;
        }
        if (rendered) diagnostics.roadFeatures += 1;
      }
    }

    if (sourceZoom < 13) continue;
    const buildingLayer = vectorTile.layers.building;
    if (!buildingLayer) continue;
    for (let index = 0; index < buildingLayer.length; index += 1) {
      const feature = buildingLayer.feature(index);
      if (feature.properties.hide_3d === true) continue;
      const pointCount = sourcePointCount(feature);
      if (
        diagnostics.buildingSourcePoints + pointCount >
        BUILDING_MAX_SOURCE_POINTS
      ) {
        diagnostics.skippedFeatures += 1;
        continue;
      }
      diagnostics.buildingSourcePoints += pointCount;
      const geojson = feature.toGeoJSON(
        payload.tile.x,
        payload.tile.y,
        payload.tile.z,
      ) as any;
      const heights = resolveThreeOsmBuildingHeights(feature.properties);
      const bottom = Math.max(
        0.45,
        metersToWorldHeight(heights.minimum, centerLat, sceneZoom),
      );
      const top = Math.max(
        bottom + 1.2,
        metersToWorldHeight(heights.height, centerLat, sceneZoom),
      );
      for (const polygon of geometryPolygons(geojson.geometry)) {
        const triangulated = triangulatePolygon(
          polygon,
          tileCenter,
          centerLat,
        );
        if (!triangulated) continue;
        for (const triangle of triangulated.triangles) {
          for (const pointIndex of triangle) {
            const point = triangulated.points[pointIndex];
            buildingRoofPositions.push(point.x, top, point.y);
          }
        }
        for (const ring of triangulated.rings) {
          for (let pointIndex = 0; pointIndex < ring.length; pointIndex += 1) {
            const from = ring[pointIndex];
            const to = ring[(pointIndex + 1) % ring.length];
            buildingWallPositions.push(
              from.x, bottom, from.y,
              to.x, bottom, to.y,
              from.x, top, from.y,
              from.x, top, from.y,
              to.x, bottom, to.y,
              to.x, top, to.y,
            );
          }
        }
        diagnostics.buildings += 1;
        diagnostics.buildingRoofTriangles += triangulated.triangles.length;
      }
    }
  }

  const dark = theme !== "light";
  const roadColors: Record<RoadTier, number> = dark
    ? { major: 0xb8bfbb, minor: 0x777e7a, service: 0x555b58 }
    : { major: 0x3f4643, minor: 0x686f6c, service: 0x858b88 };
  (["service", "minor", "major"] as RoadTier[]).forEach((tier, index) => {
    if (!roadPositions[tier].length) return;
    group.add(
      createBasicMesh(
        roadPositions[tier],
        roadColors[tier],
        `three-osm-vector-road-${tier}`,
        1 + index,
        0.42,
      ),
    );
  });
  if (buildingWallPositions.length) {
    group.add(
      createBasicMesh(
        buildingWallPositions,
        dark ? 0x403c34 : 0x766f5d,
        "three-osm-vector-building-walls",
        4,
      ),
    );
  }
  if (buildingRoofPositions.length) {
    group.add(
      createBasicMesh(
        buildingRoofPositions,
        dark ? 0x8d8264 : 0xb7ad91,
        "three-osm-vector-building-roofs",
        5,
      ),
    );
  }
  diagnostics.vertexCount =
    (Object.values(roadPositions).reduce(
      (total, positions) => total + positions.length,
      0,
    ) +
      buildingRoofPositions.length +
      buildingWallPositions.length) /
    3;
  return { group, ...diagnostics };
}
