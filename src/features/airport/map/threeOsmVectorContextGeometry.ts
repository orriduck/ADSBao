import earcut from "earcut";
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

export type ThreeOsmRoadTier = "major" | "minor" | "service";

export type ThreeOsmVectorContextDiagnostics = {
  tileCount: number;
  decodeFailures: number;
  roadFeatures: number;
  roadSegments: number;
  roadSourcePoints: number;
  buildings: number;
  buildingRoofTriangles: number;
  buildingSourcePoints: number;
  skippedFeatures: number;
  vertexCount: number;
};

export type ThreeOsmVectorContextGeometry = {
  roadPositions: Record<ThreeOsmRoadTier, Float32Array>;
  buildingRoofPositions: Float32Array;
  buildingWallPositions: Float32Array;
  diagnostics: ThreeOsmVectorContextDiagnostics;
};

export type ThreeOsmVectorContextGeometryInput = {
  tiles: ThreeOsmVectorTilePayload[];
  tileCenter: TileCoordinate;
  centerLat: number;
  sceneZoom: number;
  sourceZoom: number;
};

type Point2 = { x: number; z: number };

const ROAD_CLASSES: Record<string, ThreeOsmRoadTier> = {
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
const ROAD_WIDTH_METERS: Record<ThreeOsmRoadTier, number> = {
  major: 20,
  minor: 12,
  service: 7,
};
const ROAD_MIN_WIDTH_WORLD: Record<ThreeOsmRoadTier, number> = {
  major: 1.4,
  minor: 0.9,
  service: 0.6,
};
const ROAD_MAX_WIDTH_WORLD: Record<ThreeOsmRoadTier, number> = {
  major: 12,
  minor: 8,
  service: 5,
};
const ROAD_MAX_SOURCE_POINTS = 70_000;
const BUILDING_MAX_SOURCE_POINTS = 30_000;
const BUILDING_MIN_HEIGHT_METERS = 3;
const BUILDING_DEFAULT_HEIGHT_METERS = 12;
const BUILDING_MAX_HEIGHT_METERS = 180;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function finiteNumber(value: unknown) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function classifyThreeOsmRoadTier(
  value: unknown,
): ThreeOsmRoadTier | null {
  return ROAD_CLASSES[String(value || "").trim().toLowerCase()] || null;
}

export function resolveThreeOsmBuildingHeights(
  properties: Record<string, unknown>,
) {
  const minimum = Math.max(0, finiteNumber(properties.render_min_height) || 0);
  const requestedHeight =
    finiteNumber(properties.render_height) ?? BUILDING_DEFAULT_HEIGHT_METERS;
  const height = clamp(
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
  tier: ThreeOsmRoadTier;
  centerLat: number;
  zoom: number;
}) {
  const metersPerWorldUnit =
    metersPerTileAtLatitude(centerLat, zoom) / THREE_OSM_TILE_SIZE;
  return clamp(
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
): Point2 | null {
  if (!Array.isArray(coordinate)) return null;
  const point = lonLatAltitudeToThreeOsmWorld({
    lon: coordinate[0],
    lat: coordinate[1],
    center: tileCenter,
    centerLat,
  });
  return point ? { x: point.x, z: point.z } : null;
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
  if (!Array.isArray(ring)) return [] as Point2[];
  const points = ring.flatMap((coordinate) => {
    const point = projectCoordinate(coordinate, tileCenter, centerLat);
    return point ? [point] : [];
  });
  if (points.length > 1) {
    const first = points[0];
    const last = points[points.length - 1];
    if ((first.x - last.x) ** 2 + (first.z - last.z) ** 2 < 1e-8) {
      points.pop();
    }
  }
  return points;
}

function pushCorridorQuad(
  positions: number[],
  from: Point2,
  to: Point2,
  width: number,
  y: number,
) {
  const deltaX = to.x - from.x;
  const deltaZ = to.z - from.z;
  const length = Math.hypot(deltaX, deltaZ);
  if (!length) return false;
  const offsetX = (-deltaZ / length) * (width / 2);
  const offsetZ = (deltaX / length) * (width / 2);
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

function triangulatePolygon(
  polygon: unknown,
  tileCenter: TileCoordinate,
  centerLat: number,
) {
  if (!Array.isArray(polygon)) return null;
  const rings = polygon
    .map((ring) => projectedRing(ring, tileCenter, centerLat))
    .filter((ring) => ring.length >= 3);
  if (!rings.length) return null;
  const points: Point2[] = [];
  const vertices: number[] = [];
  const holes: number[] = [];
  rings.forEach((ring, index) => {
    if (index > 0) holes.push(points.length);
    ring.forEach((point) => {
      points.push(point);
      vertices.push(point.x, point.z);
    });
  });
  return {
    rings,
    points,
    triangles: earcut(vertices, holes.length ? holes : undefined, 2),
  };
}

function sourcePointCount(feature: VectorTileFeature) {
  return feature
    .loadGeometry()
    .reduce((total, ring) => total + ring.length, 0);
}

export function buildThreeOsmVectorContextGeometry({
  tiles,
  tileCenter,
  centerLat,
  sceneZoom,
  sourceZoom,
}: ThreeOsmVectorContextGeometryInput): ThreeOsmVectorContextGeometry {
  const roadPositions: Record<ThreeOsmRoadTier, number[]> = {
    major: [],
    minor: [],
    service: [],
  };
  const buildingRoofPositions: number[] = [];
  const buildingWallPositions: number[] = [];
  const diagnostics: ThreeOsmVectorContextDiagnostics = {
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
  const roadWidths: Record<ThreeOsmRoadTier, number> = {
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
            return point ? [point] : [];
          });
          for (
            let pointIndex = 1;
            pointIndex < projected.length;
            pointIndex += 1
          ) {
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
          for (const pointIndex of triangulated.triangles) {
            const point = triangulated.points[pointIndex];
            roadPositions[tier].push(point.x, y, point.z);
          }
          diagnostics.roadSegments += triangulated.triangles.length / 3;
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
        for (const pointIndex of triangulated.triangles) {
          const point = triangulated.points[pointIndex];
          buildingRoofPositions.push(point.x, top, point.z);
        }
        for (const ring of triangulated.rings) {
          for (let pointIndex = 0; pointIndex < ring.length; pointIndex += 1) {
            const from = ring[pointIndex];
            const to = ring[(pointIndex + 1) % ring.length];
            buildingWallPositions.push(
              from.x, bottom, from.z,
              to.x, bottom, to.z,
              from.x, top, from.z,
              from.x, top, from.z,
              to.x, bottom, to.z,
              to.x, top, to.z,
            );
          }
        }
        diagnostics.buildings += 1;
        diagnostics.buildingRoofTriangles +=
          triangulated.triangles.length / 3;
      }
    }
  }

  const typedRoadPositions: Record<ThreeOsmRoadTier, Float32Array> = {
    major: new Float32Array(roadPositions.major),
    minor: new Float32Array(roadPositions.minor),
    service: new Float32Array(roadPositions.service),
  };
  const typedBuildingRoofPositions = new Float32Array(buildingRoofPositions);
  const typedBuildingWallPositions = new Float32Array(buildingWallPositions);
  diagnostics.vertexCount =
    (typedRoadPositions.major.length +
      typedRoadPositions.minor.length +
      typedRoadPositions.service.length +
      typedBuildingRoofPositions.length +
      typedBuildingWallPositions.length) /
    3;
  return {
    roadPositions: typedRoadPositions,
    buildingRoofPositions: typedBuildingRoofPositions,
    buildingWallPositions: typedBuildingWallPositions,
    diagnostics,
  };
}
