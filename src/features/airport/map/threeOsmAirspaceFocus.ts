import {
  THREE_OSM_AIRSPACE_TIERS,
  type ThreeOsmAirspaceTier,
} from "./threeOsmAirspaceModel";
import type {
  ThreeOsmPreparedAirspaceFeature,
  ThreeOsmPreparedAirspaceGeometry,
} from "./threeOsmAirspaceGeometry";

type ThreeOsmAirspaceSegmentLayer = {
  features: number;
  segments: number;
  positionsByTier: Record<ThreeOsmAirspaceTier, number[]>;
  segmentIdsByTier: Record<ThreeOsmAirspaceTier, string[]>;
};

export type ThreeOsmAirspaceFocusResolution = {
  focus: ThreeOsmAirspaceSegmentLayer;
  context: ThreeOsmAirspaceSegmentLayer;
  focusFeatures: ThreeOsmPreparedAirspaceFeature[];
  labelCandidates: Array<{
    feature: ThreeOsmPreparedAirspaceFeature;
    anchor: { x: number; z: number; distance: number };
  }>;
  labelLimit: number;
  selectedAnchor: { x: number; z: number; distance: number } | null;
};

const TIER_PENALTY_WORLD: Record<ThreeOsmAirspaceTier, number> = {
  "terminal-controlled": 0,
  "special-use": 16,
  "transition-controlled": 48,
  "upper-controlled": 64,
  advisory: 80,
};

const ALTITUDE_PENALTY_WORLD = {
  surface: 0,
  low: 24,
  high: 96,
} as const;

function createSegmentLayer(): ThreeOsmAirspaceSegmentLayer {
  return {
    features: 0,
    segments: 0,
    positionsByTier: Object.fromEntries(
      THREE_OSM_AIRSPACE_TIERS.map((tier) => [tier, [] as number[]]),
    ) as Record<ThreeOsmAirspaceTier, number[]>,
    segmentIdsByTier: Object.fromEntries(
      THREE_OSM_AIRSPACE_TIERS.map((tier) => [tier, [] as string[]]),
    ) as Record<ThreeOsmAirspaceTier, string[]>,
  };
}

function appendFeature(
  layer: ThreeOsmAirspaceSegmentLayer,
  feature: ThreeOsmPreparedAirspaceFeature,
) {
  layer.features += 1;
  const segments = feature.positions.length / 6;
  layer.segments += segments;
  layer.positionsByTier[feature.tier].push(...feature.positions);
  layer.segmentIdsByTier[feature.tier].push(
    ...Array.from({ length: segments }, () => feature.id),
  );
}

function resolveBoundaryAnchor(
  feature: ThreeOsmPreparedAirspaceFeature,
  focusX: number,
  focusZ: number,
) {
  let bestX = feature.cueAnchor.x;
  let bestZ = feature.cueAnchor.z;
  let bestDistanceSquared =
    (bestX - focusX) ** 2 + (bestZ - focusZ) ** 2;

  for (let index = 0; index + 5 < feature.positions.length; index += 6) {
    const fromX = feature.positions[index];
    const fromZ = feature.positions[index + 2];
    const toX = feature.positions[index + 3];
    const toZ = feature.positions[index + 5];
    if (![fromX, fromZ, toX, toZ].every(Number.isFinite)) continue;
    const deltaX = toX - fromX;
    const deltaZ = toZ - fromZ;
    const lengthSquared = deltaX ** 2 + deltaZ ** 2;
    const ratio = lengthSquared > 0
      ? Math.max(
          0,
          Math.min(
            1,
            ((focusX - fromX) * deltaX + (focusZ - fromZ) * deltaZ) /
              lengthSquared,
          ),
        )
      : 0;
    const x = fromX + deltaX * ratio;
    const z = fromZ + deltaZ * ratio;
    const distanceSquared = (x - focusX) ** 2 + (z - focusZ) ** 2;
    if (distanceSquared >= bestDistanceSquared) continue;
    bestX = x;
    bestZ = z;
    bestDistanceSquared = distanceSquared;
  }

  return {
    x: bestX,
    z: bestZ,
    distance: Math.sqrt(bestDistanceSquared),
  };
}

function focusScore(
  feature: ThreeOsmPreparedAirspaceFeature,
  distance: number,
) {
  return distance +
    TIER_PENALTY_WORLD[feature.tier] +
    ALTITUDE_PENALTY_WORLD[feature.altitudeBand];
}

export function resolveThreeOsmAirspaceFocus({
  prepared,
  selectedAirspaceId = "",
  maxFocusFeatures = 6,
  maxLabels = 2,
  focusX = 0,
  focusZ = 0,
  labelFocusX = focusX,
  labelFocusZ = focusZ,
}: {
  prepared: ThreeOsmPreparedAirspaceGeometry;
  selectedAirspaceId?: string;
  maxFocusFeatures?: number;
  maxLabels?: number;
  focusX?: number;
  focusZ?: number;
  labelFocusX?: number;
  labelFocusZ?: number;
}): ThreeOsmAirspaceFocusResolution {
  const safeFocusLimit = Math.max(
    0,
    Math.min(10, Math.trunc(Number(maxFocusFeatures)) || 0),
  );
  const safeLabelLimit = Math.max(
    0,
    Math.min(3, Math.trunc(Number(maxLabels)) || 0),
  );
  const safeFocusX = Number.isFinite(Number(focusX)) ? Number(focusX) : 0;
  const safeFocusZ = Number.isFinite(Number(focusZ)) ? Number(focusZ) : 0;
  const safeLabelFocusX = Number.isFinite(Number(labelFocusX))
    ? Number(labelFocusX)
    : safeFocusX;
  const safeLabelFocusZ = Number.isFinite(Number(labelFocusZ))
    ? Number(labelFocusZ)
    : safeFocusZ;
  const rankedEntries = prepared.featureList
    .map((feature) => ({
      feature,
      anchor: resolveBoundaryAnchor(feature, safeFocusX, safeFocusZ),
    }))
    .sort(
      (left, right) =>
        focusScore(left.feature, left.anchor.distance) -
          focusScore(right.feature, right.anchor.distance) ||
        left.feature.key.localeCompare(right.feature.key),
    );
  const rankingAnchorsByKey = new Map(
    rankedEntries.map(({ feature, anchor }) => [feature.key, anchor]),
  );
  const ranked = rankedEntries.map(({ feature }) => feature);
  const selected = selectedAirspaceId
    ? prepared.featuresById[selectedAirspaceId] || null
    : null;
  const focusFeatures = selected
    ? [selected, ...ranked.filter((feature) => feature !== selected)].slice(
        0,
        safeFocusLimit,
      )
    : ranked.slice(0, safeFocusLimit);
  const focusKeys = new Set(focusFeatures.map((feature) => feature.key));
  const focus = createSegmentLayer();
  const context = createSegmentLayer();
  for (const feature of prepared.featureList) {
    appendFeature(focusKeys.has(feature.key) ? focus : context, feature);
  }

  const seenLabels = new Set<string>();
  const labelFeatures = focusFeatures.filter((feature) => {
    if (
      feature.id === selectedAirspaceId ||
      !feature.contextLabel ||
      seenLabels.has(feature.contextLabel)
    ) {
      return false;
    }
    seenLabels.add(feature.contextLabel);
    return true;
  });
  const resolveLabelAnchor = (feature: ThreeOsmPreparedAirspaceFeature) =>
    safeLabelFocusX === safeFocusX && safeLabelFocusZ === safeFocusZ
      ? rankingAnchorsByKey.get(feature.key)!
      : resolveBoundaryAnchor(feature, safeLabelFocusX, safeLabelFocusZ);

  return {
    focus,
    context,
    focusFeatures,
    labelCandidates: labelFeatures.map((feature) => ({
      feature,
      anchor: resolveLabelAnchor(feature),
    })),
    labelLimit: safeLabelLimit,
    selectedAnchor: selected ? resolveLabelAnchor(selected) : null,
  };
}
