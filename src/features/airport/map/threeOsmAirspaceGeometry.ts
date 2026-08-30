import {
  THREE_OSM_AIRSPACE_TIERS,
  resolveThreeOsmAirspaceAltitudeBand,
  resolveThreeOsmAirspaceContextLabel,
  resolveThreeOsmAirspaceCueHeightWorld,
  resolveThreeOsmAirspaceLowerAltitudeFt,
  resolveThreeOsmAirspaceSimplificationTolerance,
  resolveThreeOsmAirspaceTier,
  resolveThreeOsmAirspaceUpperAltitudeFt,
  simplifyThreeOsmAirspaceRing,
  type ThreeOsmAirspaceAltitudeBand,
  type ThreeOsmAirspaceTier,
} from "./threeOsmAirspaceModel";
import {
  THREE_OSM_TILE_SIZE,
  lonLatAltitudeToThreeOsmWorld,
  type TileCoordinate,
} from "./threeOsmProjection";

export type ThreeOsmPreparedAirspaceFeature = {
  key: string;
  id: string;
  label: string;
  contextLabel: string;
  tier: ThreeOsmAirspaceTier;
  altitudeBand: ThreeOsmAirspaceAltitudeBand;
  positions: number[];
  lowerAltitudeFt: number;
  upperAltitudeFt: number | null;
  lowerY: number;
  cueTopY: number;
  cueHeightWorld: number;
  distanceFromFocusWorld: number;
  cueAnchor: { x: number; y: number; z: number };
  labelPosition: { x: number; y: number; z: number };
};

export type ThreeOsmPreparedAirspaceGeometry = {
  prepareMs: number;
  features: number;
  rawSegments: number;
  segments: number;
  simplificationTolerance: number;
  segmentsByTier: Record<ThreeOsmAirspaceTier, number[]>;
  segmentIdsByTier: Record<ThreeOsmAirspaceTier, string[]>;
  featuresByTier: Record<ThreeOsmAirspaceTier, number>;
  featuresByAltitudeBand: Record<ThreeOsmAirspaceAltitudeBand, number>;
  featureList: ThreeOsmPreparedAirspaceFeature[];
  featuresById: Record<string, ThreeOsmPreparedAirspaceFeature>;
};

export function collectAirspaceLineCoordinates(
  geometry: Record<string, any> | null,
) {
  if (!geometry) return [] as number[][][];
  if (geometry.type === "Polygon") {
    return Array.isArray(geometry.coordinates) ? geometry.coordinates : [];
  }
  if (geometry.type === "MultiPolygon") {
    return Array.isArray(geometry.coordinates)
      ? geometry.coordinates.flatMap((polygon: unknown) =>
          Array.isArray(polygon) ? polygon : [],
        )
      : [];
  }
  return [] as number[][][];
}

export function buildThreeOsmAirspaceGeometry({
  airspaceFeatures,
  showAirspaces,
  tileCenter,
  centerLat,
  zoom,
}: {
  airspaceFeatures: Array<Record<string, any>>;
  showAirspaces: boolean;
  tileCenter: TileCoordinate;
  centerLat: number;
  zoom: number;
}): ThreeOsmPreparedAirspaceGeometry {
  const startedAt = performance.now();
  const segmentsByTier = Object.fromEntries(
    THREE_OSM_AIRSPACE_TIERS.map((tier) => [tier, [] as number[]]),
  ) as Record<ThreeOsmAirspaceTier, number[]>;
  const segmentIdsByTier = Object.fromEntries(
    THREE_OSM_AIRSPACE_TIERS.map((tier) => [tier, [] as string[]]),
  ) as Record<ThreeOsmAirspaceTier, string[]>;
  const featuresByTier = Object.fromEntries(
    THREE_OSM_AIRSPACE_TIERS.map((tier) => [tier, 0]),
  ) as Record<ThreeOsmAirspaceTier, number>;
  const featuresByAltitudeBand = {
    surface: 0,
    low: 0,
    high: 0,
  } satisfies Record<ThreeOsmAirspaceAltitudeBand, number>;
  const featuresById: Record<string, ThreeOsmPreparedAirspaceFeature> = {};
  const featureList: ThreeOsmPreparedAirspaceFeature[] = [];
  const simplificationTolerance =
    resolveThreeOsmAirspaceSimplificationTolerance(zoom);
  let featureCount = 0;
  let rawSegmentCount = 0;

  if (showAirspaces) {
    const localProjectionScale =
      (THREE_OSM_TILE_SIZE * 2 ** Number(tileCenter.z)) / 360;
    const localLatitudeScale =
      localProjectionScale /
      Math.max(0.01, Math.cos((Number(centerLat) * Math.PI) / 180));
    const centerLon = (tileCenter.x / 2 ** tileCenter.z) * 360 - 180;

    for (const [featureIndex, feature] of airspaceFeatures.entries()) {
      const featureId = String(feature?.properties?.id || "");
      const featureKey = featureId || `airspace-${featureIndex}`;
      const tier = resolveThreeOsmAirspaceTier(feature?.properties);
      const lowerAltitudeFt = resolveThreeOsmAirspaceLowerAltitudeFt(
        feature?.properties,
      );
      const upperAltitudeFt = resolveThreeOsmAirspaceUpperAltitudeFt(
        feature?.properties,
      );
      const cueHeightWorld = resolveThreeOsmAirspaceCueHeightWorld(
        lowerAltitudeFt,
        upperAltitudeFt,
      );
      const altitudeBand = resolveThreeOsmAirspaceAltitudeBand(lowerAltitudeFt);
      const featurePositions: number[] = [];
      let minX = Infinity;
      let minZ = Infinity;
      let maxX = -Infinity;
      let maxZ = -Infinity;
      let boundaryYForFeature = 2.4;
      let cueAnchorX = 0;
      let cueAnchorZ = 0;
      let cueAnchorDistanceSquared = Infinity;

      for (const ring of collectAirspaceLineCoordinates(feature?.geometry)) {
        type SourcePoint = {
          x: number;
          z: number;
          lon: number;
          lat: number;
        };
        const sourcePaths: SourcePoint[][] = [];
        let sourcePath: SourcePoint[] = [];
        const flushSourcePath = () => {
          if (sourcePath.length >= 2) sourcePaths.push(sourcePath);
          sourcePath = [];
        };
        for (const coordinate of ring) {
          const lon = Number(coordinate?.[0]);
          const lat = Number(coordinate?.[1]);
          if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
            flushSourcePath();
            continue;
          }
          let longitudeDelta = lon - centerLon;
          if (longitudeDelta > 180) longitudeDelta -= 360;
          if (longitudeDelta < -180) longitudeDelta += 360;
          sourcePath.push({
            x: longitudeDelta * localProjectionScale,
            z: (lat - Number(centerLat)) * localLatitudeScale,
            lon,
            lat,
          });
        }
        flushSourcePath();

        for (const path of sourcePaths) {
          rawSegmentCount += path.length - 1;
          const simplifiedSourcePath = simplifyThreeOsmAirspaceRing(
            path,
            simplificationTolerance,
          );
          const simplifiedPath = simplifiedSourcePath.flatMap((sourcePoint) => {
            const point = lonLatAltitudeToThreeOsmWorld({
              lon: sourcePoint.lon,
              lat: sourcePoint.lat,
              center: tileCenter,
              centerLat,
            });
            return point ? [{ x: point.x, z: point.z }] : [];
          });
          if (simplifiedPath.length < 2) continue;
          const altitudeY = lonLatAltitudeToThreeOsmWorld({
            lon: simplifiedSourcePath[0]?.lon,
            lat: simplifiedSourcePath[0]?.lat,
            altitudeFt: lowerAltitudeFt,
            center: tileCenter,
            centerLat,
          })?.y || 0;
          const boundaryY = Math.max(2.4, altitudeY + 2.4);
          boundaryYForFeature = boundaryY;

          for (let index = 1; index < simplifiedPath.length; index += 1) {
            const fromPoint = simplifiedPath[index - 1];
            const toPoint = simplifiedPath[index];
            const segment = [
              fromPoint.x,
              boundaryY,
              fromPoint.z,
              toPoint.x,
              boundaryY,
              toPoint.z,
            ];
            segmentsByTier[tier].push(...segment);
            featurePositions.push(...segment);
            segmentIdsByTier[tier].push(featureId);
            minX = Math.min(minX, fromPoint.x, toPoint.x);
            minZ = Math.min(minZ, fromPoint.z, toPoint.z);
            maxX = Math.max(maxX, fromPoint.x, toPoint.x);
            maxZ = Math.max(maxZ, fromPoint.z, toPoint.z);
            const fromDistanceSquared = fromPoint.x ** 2 + fromPoint.z ** 2;
            if (fromDistanceSquared < cueAnchorDistanceSquared) {
              cueAnchorDistanceSquared = fromDistanceSquared;
              cueAnchorX = fromPoint.x;
              cueAnchorZ = fromPoint.z;
            }
            const toDistanceSquared = toPoint.x ** 2 + toPoint.z ** 2;
            if (toDistanceSquared < cueAnchorDistanceSquared) {
              cueAnchorDistanceSquared = toDistanceSquared;
              cueAnchorX = toPoint.x;
              cueAnchorZ = toPoint.z;
            }
          }
        }
      }

      if (!Number.isFinite(minX) || !Number.isFinite(minZ)) continue;
      featureCount += 1;
      featuresByTier[tier] += 1;
      featuresByAltitudeBand[altitudeBand] += 1;
      const name = String(feature?.properties?.name || "Airspace").trim();
      const classLabel = String(feature?.properties?.classLabel || "").trim();
      const verticalLimit = String(
        feature?.properties?.verticalLimit || "",
      ).trim();
      const metadata = [classLabel, verticalLimit].filter(Boolean).join(" · ");
      const cueTopY = boundaryYForFeature + cueHeightWorld;
      const preparedFeature: ThreeOsmPreparedAirspaceFeature = {
        key: featureKey,
        id: featureId,
        label: metadata ? `${name} · ${metadata}` : name,
        contextLabel: resolveThreeOsmAirspaceContextLabel(feature?.properties),
        tier,
        altitudeBand,
        positions: featurePositions,
        lowerAltitudeFt,
        upperAltitudeFt,
        lowerY: boundaryYForFeature,
        cueTopY,
        cueHeightWorld,
        distanceFromFocusWorld: Math.sqrt(cueAnchorDistanceSquared),
        cueAnchor: {
          x: cueAnchorX,
          y: boundaryYForFeature,
          z: cueAnchorZ,
        },
        labelPosition: {
          x: (minX + maxX) / 2,
          y: (cueHeightWorld > 0 ? cueTopY : boundaryYForFeature) + 5.6,
          z: (minZ + maxZ) / 2,
        },
      };
      featureList.push(preparedFeature);
      if (featureId) featuresById[featureId] = preparedFeature;
    }
  }

  return {
    prepareMs: performance.now() - startedAt,
    features: featureCount,
    rawSegments: rawSegmentCount,
    segments:
      Object.values(segmentsByTier).reduce(
        (total, positions) => total + positions.length,
        0,
      ) / 6,
    simplificationTolerance,
    segmentsByTier,
    segmentIdsByTier,
    featuresByTier,
    featuresByAltitudeBand,
    featureList,
    featuresById,
  };
}
