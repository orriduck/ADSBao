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
import {
  isThreeOsmVectorLabelClassVisible,
  resolveThreeOsmVectorLabelText,
  selectThreeOsmVectorLabels,
  type ThreeOsmVectorLabel,
  type ThreeOsmVectorLabelCandidate,
  type ThreeOsmVectorLabelKind,
} from "./threeOsmVectorLabelModel";
import {
  classifyThreeOsmVectorSurface,
  type ThreeOsmVectorSurfaceKind,
} from "./threeOsmVectorSurfaceModel";
import {
  isThreeOsmVectorRoadClassVisible,
  isThreeOsmVectorSurfaceKindVisible,
  resolveThreeOsmVectorSemanticLod,
  type ThreeOsmVectorSemanticLodId,
} from "./threeOsmVectorSemanticLod";
import {
  THREE_OSM_ROAD_TIERS,
  type ThreeOsmRoadTier,
} from "./threeOsmVectorRoadModel";

export type ThreeOsmVectorTilePayload = {
  tile: TileCoordinate;
  data: ArrayBuffer;
};

export type ThreeOsmVectorContextDiagnostics = {
  tileCount: number;
  decodeFailures: number;
  semanticLodProfile: ThreeOsmVectorSemanticLodId;
  semanticLodSkippedFeatures: number;
  roadFeatures: number;
  roadFeaturesByTier: Record<ThreeOsmRoadTier, number>;
  roadSegments: number;
  roadSourcePoints: number;
  buildings: number;
  buildingRoofTriangles: number;
  buildingSourcePoints: number;
  surfaceFeatures: number;
  surfaceWaterFeatures: number;
  surfaceNaturalFeatures: number;
  surfaceDevelopedFeatures: number;
  surfaceAerowayFeatures: number;
  surfaceTriangles: number;
  surfaceSourcePoints: number;
  surfaceSkippedFeatures: number;
  labelCandidates: number;
  labelCount: number;
  labelAerodromes: number;
  labelPlaces: number;
  labelRoads: number;
  labelWaters: number;
  labelSkippedFeatures: number;
  skippedFeatures: number;
  vertexCount: number;
};

export type ThreeOsmVectorContextGeometry = {
  roadPositions: Record<ThreeOsmRoadTier, Float32Array>;
  surfacePositions: Record<ThreeOsmVectorSurfaceKind, Float32Array>;
  buildingRoofPositions: Float32Array;
  buildingWallPositions: Float32Array;
  labels: ThreeOsmVectorLabel[];
  diagnostics: ThreeOsmVectorContextDiagnostics;
};

export type ThreeOsmVectorContextGeometryInput = {
  tiles: ThreeOsmVectorTilePayload[];
  tileCenter: TileCoordinate;
  centerLat: number;
  sceneZoom: number;
  sourceZoom: number;
  locale: string;
  excludedAirportCodes?: string[];
  labelFocusX?: number;
  labelFocusZ?: number;
};

type Point2 = { x: number; z: number };

const ROAD_CLASSES: Record<string, ThreeOsmRoadTier> = {
  motorway: "motorway",
  trunk: "arterial",
  primary: "arterial",
  secondary: "collector",
  tertiary: "collector",
  busway: "collector",
  minor: "local",
  bridge: "local",
  service: "service",
  pier: "service",
};
const ROAD_WIDTH_METERS: Record<ThreeOsmRoadTier, number> = {
  motorway: 24,
  arterial: 18,
  collector: 12,
  local: 8,
  service: 5,
};
const ROAD_MIN_WIDTH_WORLD: Record<ThreeOsmRoadTier, number> = {
  motorway: 1.8,
  arterial: 1.35,
  collector: 0.9,
  local: 0.65,
  service: 0.5,
};
const ROAD_MAX_WIDTH_WORLD: Record<ThreeOsmRoadTier, number> = {
  motorway: 14,
  arterial: 11,
  collector: 8,
  local: 6,
  service: 4,
};
const ROAD_Y_WORLD: Record<ThreeOsmRoadTier, number> = {
  motorway: 0.42,
  arterial: 0.38,
  collector: 0.32,
  local: 0.27,
  service: 0.22,
};
const ROAD_MAX_SOURCE_POINTS = 70_000;
const BUILDING_MAX_SOURCE_POINTS = 30_000;
const BUILDING_MIN_HEIGHT_METERS = 3;
const BUILDING_DEFAULT_HEIGHT_METERS = 12;
const BUILDING_MAX_HEIGHT_METERS = 180;
// Preserve complete low-zoom surfaces when a desktop overview uses 5x5 tiles.
const SURFACE_MAX_SOURCE_POINTS: Record<ThreeOsmVectorSurfaceKind, number> = {
  water: 100_000,
  natural: 80_000,
  developed: 20_000,
  aeroway: 20_000,
};
const SURFACE_LAYERS = ["water", "landcover", "landuse", "aeroway"] as const;
const AEROWAY_WIDTH_METERS: Record<string, number> = {
  runway: 45,
  taxiway: 18,
  helipad: 18,
  heliport: 18,
};
const AEROWAY_MIN_WIDTH_WORLD: Record<string, number> = {
  runway: 2.4,
  taxiway: 1.15,
  helipad: 1.15,
  heliport: 1.15,
};
const AEROWAY_MAX_WIDTH_WORLD: Record<string, number> = {
  runway: 18,
  taxiway: 9,
  helipad: 9,
  heliport: 9,
};
const VECTOR_LABEL_CANDIDATE_LIMITS: Record<ThreeOsmVectorLabelKind, number> = {
  aerodrome: 32,
  place: 128,
  road: 320,
  water: 48,
};
const VECTOR_LABEL_LAYERS: Array<{
  layerName: string;
  kind: ThreeOsmVectorLabelKind;
}> = [
  { layerName: "aerodrome_label", kind: "aerodrome" },
  { layerName: "place", kind: "place" },
  { layerName: "transportation_name", kind: "road" },
  { layerName: "water_name", kind: "water" },
];

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

export function resolveThreeOsmAerowayWidthWorld({
  className,
  centerLat,
  zoom,
}: {
  className: string;
  centerLat: number;
  zoom: number;
}) {
  const normalizedClass = className.trim().toLowerCase();
  const meters = AEROWAY_WIDTH_METERS[normalizedClass];
  if (!meters) return null;
  const metersPerWorldUnit =
    metersPerTileAtLatitude(centerLat, zoom) / THREE_OSM_TILE_SIZE;
  return clamp(
    meters / metersPerWorldUnit,
    AEROWAY_MIN_WIDTH_WORLD[normalizedClass],
    AEROWAY_MAX_WIDTH_WORLD[normalizedClass],
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

function geometryPoints(geometry: Record<string, any> | null) {
  if (geometry?.type === "Point") return [geometry.coordinates];
  if (geometry?.type === "MultiPoint") return geometry.coordinates || [];
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

function projectedLineMidpoint(
  line: unknown,
  tileCenter: TileCoordinate,
  centerLat: number,
) {
  if (!Array.isArray(line)) return null;
  const points = line.flatMap((coordinate) => {
    const point = projectCoordinate(coordinate, tileCenter, centerLat);
    return point ? [point] : [];
  });
  if (points.length < 2) return null;
  const segmentLengths = points.slice(1).map((point, index) =>
    Math.hypot(point.x - points[index].x, point.z - points[index].z),
  );
  const totalLength = segmentLengths.reduce((total, length) => total + length, 0);
  if (!totalLength) return null;
  let remaining = totalLength / 2;
  for (let index = 0; index < segmentLengths.length; index += 1) {
    const segmentLength = segmentLengths[index];
    if (remaining > segmentLength) {
      remaining -= segmentLength;
      continue;
    }
    const ratio = segmentLength ? remaining / segmentLength : 0;
    return {
      point: {
        x: points[index].x + (points[index + 1].x - points[index].x) * ratio,
        z: points[index].z + (points[index + 1].z - points[index].z) * ratio,
      },
      length: totalLength,
    };
  }
  return { point: points[points.length - 1], length: totalLength };
}

function resolveVectorLabelAnchor({
  geometry,
  tileCenter,
  centerLat,
  focusX,
  focusZ,
}: {
  geometry: Record<string, any> | null;
  tileCenter: TileCoordinate;
  centerLat: number;
  focusX: number;
  focusZ: number;
}) {
  const points = geometryPoints(geometry)
    .flatMap((coordinate) => {
      const point = projectCoordinate(coordinate, tileCenter, centerLat);
      return point ? [point] : [];
    })
    .sort(
      (left, right) =>
        Math.hypot(left.x - focusX, left.z - focusZ) -
        Math.hypot(right.x - focusX, right.z - focusZ),
    );
  if (points.length) return points[0];

  const lineAnchor = geometryLineStrings(geometry)
    .flatMap((line) => {
      const midpoint = projectedLineMidpoint(line, tileCenter, centerLat);
      return midpoint ? [midpoint] : [];
    })
    .sort((left, right) => right.length - left.length)[0];
  if (lineAnchor) return lineAnchor.point;

  const ring = geometryPolygons(geometry)
    .flatMap((polygon) => (Array.isArray(polygon) ? polygon.slice(0, 1) : []))
    .map((value) => projectedRing(value, tileCenter, centerLat))
    .find((value) => value.length >= 3);
  if (!ring) return null;
  return {
    x: ring.reduce((total, point) => total + point.x, 0) / ring.length,
    z: ring.reduce((total, point) => total + point.z, 0) / ring.length,
  };
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
  locale,
  excludedAirportCodes = [],
  labelFocusX = 0,
  labelFocusZ = 0,
}: ThreeOsmVectorContextGeometryInput): ThreeOsmVectorContextGeometry {
  const excludedAirportCodeSet = new Set(
    excludedAirportCodes
      .map((code) => String(code || "").trim().toUpperCase())
      .filter(Boolean),
  );
  const roadPositions: Record<ThreeOsmRoadTier, number[]> = {
    motorway: [],
    arterial: [],
    collector: [],
    local: [],
    service: [],
  };
  const surfacePositions: Record<ThreeOsmVectorSurfaceKind, number[]> = {
    water: [],
    natural: [],
    developed: [],
    aeroway: [],
  };
  const surfaceSourcePoints: Record<ThreeOsmVectorSurfaceKind, number> = {
    water: 0,
    natural: 0,
    developed: 0,
    aeroway: 0,
  };
  const buildingRoofPositions: number[] = [];
  const buildingWallPositions: number[] = [];
  const labelCandidates: ThreeOsmVectorLabelCandidate[] = [];
  const labelCandidateCounts: Record<ThreeOsmVectorLabelKind, number> = {
    aerodrome: 0,
    place: 0,
    road: 0,
    water: 0,
  };
  const semanticLod = resolveThreeOsmVectorSemanticLod(sourceZoom);
  const diagnostics: ThreeOsmVectorContextDiagnostics = {
    tileCount: tiles.length,
    decodeFailures: 0,
    semanticLodProfile: semanticLod.id,
    semanticLodSkippedFeatures: 0,
    roadFeatures: 0,
    roadFeaturesByTier: {
      motorway: 0,
      arterial: 0,
      collector: 0,
      local: 0,
      service: 0,
    },
    roadSegments: 0,
    roadSourcePoints: 0,
    buildings: 0,
    buildingRoofTriangles: 0,
    buildingSourcePoints: 0,
    surfaceFeatures: 0,
    surfaceWaterFeatures: 0,
    surfaceNaturalFeatures: 0,
    surfaceDevelopedFeatures: 0,
    surfaceAerowayFeatures: 0,
    surfaceTriangles: 0,
    surfaceSourcePoints: 0,
    surfaceSkippedFeatures: 0,
    labelCandidates: 0,
    labelCount: 0,
    labelAerodromes: 0,
    labelPlaces: 0,
    labelRoads: 0,
    labelWaters: 0,
    labelSkippedFeatures: 0,
    skippedFeatures: 0,
    vertexCount: 0,
  };
  const roadWidths: Record<ThreeOsmRoadTier, number> = {
    motorway: resolveThreeOsmRoadWidthWorld({
      tier: "motorway",
      centerLat,
      zoom: sceneZoom,
    }),
    arterial: resolveThreeOsmRoadWidthWorld({
      tier: "arterial",
      centerLat,
      zoom: sceneZoom,
    }),
    collector: resolveThreeOsmRoadWidthWorld({
      tier: "collector",
      centerLat,
      zoom: sceneZoom,
    }),
    local: resolveThreeOsmRoadWidthWorld({
      tier: "local",
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
        const className = String(feature.properties.class || "")
          .trim()
          .toLowerCase();
        const tier = classifyThreeOsmRoadTier(className);
        if (!tier) continue;
        if (!isThreeOsmVectorRoadClassVisible({ className, lod: semanticLod })) {
          diagnostics.semanticLodSkippedFeatures += 1;
          continue;
        }
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
                ROAD_Y_WORLD[tier],
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
          const y = ROAD_Y_WORLD[tier];
          for (const pointIndex of triangulated.triangles) {
            const point = triangulated.points[pointIndex];
            roadPositions[tier].push(point.x, y, point.z);
          }
          diagnostics.roadSegments += triangulated.triangles.length / 3;
          rendered = true;
        }
        if (rendered) {
          diagnostics.roadFeatures += 1;
          diagnostics.roadFeaturesByTier[tier] += 1;
        }
      }
    }

    for (const layerName of SURFACE_LAYERS) {
      const layer = vectorTile.layers[layerName];
      if (!layer) continue;
      for (let index = 0; index < layer.length; index += 1) {
        const feature = layer.feature(index);
        const className = String(feature.properties.class || "")
          .trim()
          .toLowerCase();
        const kind = classifyThreeOsmVectorSurface({
          layerName,
          className,
          geometryType: feature.type,
        });
        if (!kind) continue;
        if (!isThreeOsmVectorSurfaceKindVisible({ kind, lod: semanticLod })) {
          diagnostics.semanticLodSkippedFeatures += 1;
          continue;
        }
        const pointCount = sourcePointCount(feature);
        if (
          surfaceSourcePoints[kind] + pointCount >
          SURFACE_MAX_SOURCE_POINTS[kind]
        ) {
          diagnostics.surfaceSkippedFeatures += 1;
          continue;
        }
        surfaceSourcePoints[kind] += pointCount;
        diagnostics.surfaceSourcePoints += pointCount;
        let geojson: Record<string, any>;
        try {
          geojson = feature.toGeoJSON(
            payload.tile.x,
            payload.tile.y,
            payload.tile.z,
          ) as any;
        } catch {
          diagnostics.surfaceSkippedFeatures += 1;
          continue;
        }
        let rendered = false;
        if (kind === "aeroway") {
          const width = resolveThreeOsmAerowayWidthWorld({
            className,
            centerLat,
            zoom: sceneZoom,
          });
          if (width) {
            for (const line of geometryLineStrings(geojson.geometry)) {
              if (!Array.isArray(line)) continue;
              const projected = line.flatMap((coordinate: unknown) => {
                const point = projectCoordinate(
                  coordinate,
                  tileCenter,
                  centerLat,
                );
                return point ? [point] : [];
              });
              for (
                let pointIndex = 1;
                pointIndex < projected.length;
                pointIndex += 1
              ) {
                if (
                  pushCorridorQuad(
                    surfacePositions.aeroway,
                    projected[pointIndex - 1],
                    projected[pointIndex],
                    width,
                    0.16,
                  )
                ) {
                  diagnostics.surfaceTriangles += 2;
                  rendered = true;
                }
              }
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
          const y =
            kind === "water"
              ? 0.04
              : kind === "natural"
                ? 0.08
                : kind === "developed"
                  ? 0.12
                  : 0.16;
          for (const pointIndex of triangulated.triangles) {
            const point = triangulated.points[pointIndex];
            surfacePositions[kind].push(point.x, y, point.z);
          }
          diagnostics.surfaceTriangles += triangulated.triangles.length / 3;
          rendered = rendered || triangulated.triangles.length > 0;
        }
        if (!rendered) continue;
        diagnostics.surfaceFeatures += 1;
        if (kind === "water") diagnostics.surfaceWaterFeatures += 1;
        if (kind === "natural") diagnostics.surfaceNaturalFeatures += 1;
        if (kind === "developed") diagnostics.surfaceDevelopedFeatures += 1;
        if (kind === "aeroway") diagnostics.surfaceAerowayFeatures += 1;
      }
    }

    for (const { layerName, kind } of VECTOR_LABEL_LAYERS) {
      const layer = vectorTile.layers[layerName];
      if (!layer) continue;
      for (let index = 0; index < layer.length; index += 1) {
        if (
          labelCandidateCounts[kind] >= VECTOR_LABEL_CANDIDATE_LIMITS[kind]
        ) {
          diagnostics.labelSkippedFeatures += layer.length - index;
          break;
        }
        const feature = layer.feature(index);
        const className = String(feature.properties.class || "")
          .trim()
          .toLowerCase();
        if (
          !isThreeOsmVectorLabelClassVisible({
            kind,
            className,
            sourceZoom,
          })
        ) {
          continue;
        }
        const text = resolveThreeOsmVectorLabelText({
          properties: feature.properties,
          kind,
          locale,
        });
        if (!text) continue;
        if (kind === "aerodrome") {
          const featureCodes = [
            feature.properties.iata,
            feature.properties.icao,
          ].map((value) => String(value || "").trim().toUpperCase());
          if (featureCodes.some((code) => excludedAirportCodeSet.has(code))) {
            continue;
          }
        }
        try {
          const geojson = feature.toGeoJSON(
            payload.tile.x,
            payload.tile.y,
            payload.tile.z,
          ) as any;
          const anchor = resolveVectorLabelAnchor({
            geometry: geojson.geometry,
            tileCenter,
            centerLat,
            focusX: labelFocusX,
            focusZ: labelFocusZ,
          });
          if (!anchor) continue;
          labelCandidates.push({
            id: `vector:${kind}:${payload.tile.z}/${payload.tile.x}/${payload.tile.y}:${index}`,
            text,
            kind,
            className,
            rank: finiteNumber(feature.properties.rank),
            x: anchor.x,
            z: anchor.z,
          });
          labelCandidateCounts[kind] += 1;
        } catch {
          diagnostics.labelSkippedFeatures += 1;
        }
      }
    }

    if (!semanticLod.showBuildings) continue;
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
    motorway: new Float32Array(roadPositions.motorway),
    arterial: new Float32Array(roadPositions.arterial),
    collector: new Float32Array(roadPositions.collector),
    local: new Float32Array(roadPositions.local),
    service: new Float32Array(roadPositions.service),
  };
  const typedSurfacePositions: Record<
    ThreeOsmVectorSurfaceKind,
    Float32Array
  > = {
    water: new Float32Array(surfacePositions.water),
    natural: new Float32Array(surfacePositions.natural),
    developed: new Float32Array(surfacePositions.developed),
    aeroway: new Float32Array(surfacePositions.aeroway),
  };
  const typedBuildingRoofPositions = new Float32Array(buildingRoofPositions);
  const typedBuildingWallPositions = new Float32Array(buildingWallPositions);
  const labels = selectThreeOsmVectorLabels(labelCandidates, {
    sourceZoom,
    maxLabels: semanticLod.maxLabels,
    focusX: labelFocusX,
    focusZ: labelFocusZ,
  });
  diagnostics.labelCandidates = labelCandidates.length;
  diagnostics.labelCount = labels.length;
  diagnostics.labelAerodromes = labels.filter(
    (label) => label.kind === "aerodrome",
  ).length;
  diagnostics.labelPlaces = labels.filter((label) => label.kind === "place").length;
  diagnostics.labelRoads = labels.filter((label) => label.kind === "road").length;
  diagnostics.labelWaters = labels.filter((label) => label.kind === "water").length;
  diagnostics.vertexCount =
    (THREE_OSM_ROAD_TIERS.reduce(
      (total, tier) => total + typedRoadPositions[tier].length,
      0,
    ) +
      typedSurfacePositions.water.length +
      typedSurfacePositions.natural.length +
      typedSurfacePositions.developed.length +
      typedSurfacePositions.aeroway.length +
      typedBuildingRoofPositions.length +
      typedBuildingWallPositions.length) /
    3;
  return {
    roadPositions: typedRoadPositions,
    surfacePositions: typedSurfacePositions,
    buildingRoofPositions: typedBuildingRoofPositions,
    buildingWallPositions: typedBuildingWallPositions,
    labels,
    diagnostics,
  };
}
