import {
  THREE_OSM_AIRSPACE_TIERS,
  type ThreeOsmAirspaceTier,
} from "./threeOsmAirspaceModel";
import type {
  ThreeOsmPreparedAirspaceFeature,
  ThreeOsmPreparedAirspaceGeometry,
} from "./threeOsmAirspaceGeometry";

export type ThreeOsmSelectedAirspaceVolumeGeometry = {
  topPositions: number[];
  curtainPositions: number[];
  postPositions: number[];
  triangles: number;
  posts: number;
};

export type ThreeOsmNearbyAirspaceCueGeometry = {
  positionsByTier: Record<ThreeOsmAirspaceTier, number[]>;
  featureIds: string[];
  features: number;
  segments: number;
};

const EMPTY_SELECTED_VOLUME: ThreeOsmSelectedAirspaceVolumeGeometry = {
  topPositions: [],
  curtainPositions: [],
  postPositions: [],
  triangles: 0,
  posts: 0,
};

export function buildThreeOsmSelectedAirspaceVolumeGeometry(
  feature: ThreeOsmPreparedAirspaceFeature | null | undefined,
  maxPosts = 24,
): ThreeOsmSelectedAirspaceVolumeGeometry {
  if (!feature?.positions.length || feature.cueHeightWorld <= 0) {
    return EMPTY_SELECTED_VOLUME;
  }
  const topPositions: number[] = [];
  const curtainPositions: number[] = [];
  const postPositions: number[] = [];
  const segmentCount = feature.positions.length / 6;
  const safeMaxPosts = Math.max(
    1,
    Math.min(48, Math.trunc(Number(maxPosts)) || 24),
  );
  const postInterval = Math.max(1, Math.ceil(segmentCount / safeMaxPosts));
  let posts = 0;

  for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
    const offset = segmentIndex * 6;
    const fromX = feature.positions[offset];
    const fromY = feature.positions[offset + 1];
    const fromZ = feature.positions[offset + 2];
    const toX = feature.positions[offset + 3];
    const toY = feature.positions[offset + 4];
    const toZ = feature.positions[offset + 5];
    const fromTopY = feature.cueTopY + (fromY - feature.lowerY);
    const toTopY = feature.cueTopY + (toY - feature.lowerY);

    topPositions.push(fromX, fromTopY, fromZ, toX, toTopY, toZ);
    curtainPositions.push(
      fromX,
      fromY,
      fromZ,
      fromX,
      fromTopY,
      fromZ,
      toX,
      toY,
      toZ,
      fromX,
      fromTopY,
      fromZ,
      toX,
      toTopY,
      toZ,
      toX,
      toY,
      toZ,
    );
    if (segmentIndex % postInterval !== 0) continue;
    postPositions.push(fromX, fromY, fromZ, fromX, fromTopY, fromZ);
    posts += 1;
  }

  return {
    topPositions,
    curtainPositions,
    postPositions,
    triangles: curtainPositions.length / 9,
    posts,
  };
}

export function buildThreeOsmNearbyAirspaceCueGeometry({
  prepared,
  selectedAirspaceId = "",
  maxFeatures = 3,
  tickSize = 4,
}: {
  prepared: ThreeOsmPreparedAirspaceGeometry;
  selectedAirspaceId?: string;
  maxFeatures?: number;
  tickSize?: number;
}): ThreeOsmNearbyAirspaceCueGeometry {
  const positionsByTier = Object.fromEntries(
    THREE_OSM_AIRSPACE_TIERS.map((tier) => [tier, [] as number[]]),
  ) as Record<ThreeOsmAirspaceTier, number[]>;
  const numericLimit = Math.trunc(Number(maxFeatures));
  const safeLimit = Number.isFinite(numericLimit)
    ? Math.max(0, Math.min(3, numericLimit))
    : 3;
  const safeTickSize = Math.max(2, Math.min(8, Number(tickSize) || 4));
  const candidates = Object.values(prepared.featuresById)
    .filter(
      (feature) =>
        feature.id !== selectedAirspaceId && feature.cueHeightWorld > 0,
    )
    .sort(
      (left, right) =>
        left.cueAnchor.x ** 2 + left.cueAnchor.z ** 2 -
        (right.cueAnchor.x ** 2 + right.cueAnchor.z ** 2),
    )
    .slice(0, safeLimit);

  for (const feature of candidates) {
    const { x, y, z } = feature.cueAnchor;
    const topY = feature.cueTopY;
    positionsByTier[feature.tier].push(
      x,
      y,
      z,
      x,
      topY,
      z,
      x - safeTickSize,
      topY,
      z,
      x + safeTickSize,
      topY,
      z,
      x,
      topY,
      z - safeTickSize,
      x,
      topY,
      z + safeTickSize,
    );
  }

  return {
    positionsByTier,
    featureIds: candidates.map((feature) => feature.id),
    features: candidates.length,
    segments: candidates.length * 3,
  };
}
