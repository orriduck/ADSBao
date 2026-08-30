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
  labelFeatures: ThreeOsmPreparedAirspaceFeature[];
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

function focusScore(feature: ThreeOsmPreparedAirspaceFeature) {
  return feature.distanceFromFocusWorld +
    TIER_PENALTY_WORLD[feature.tier] +
    ALTITUDE_PENALTY_WORLD[feature.altitudeBand];
}

function canLabelFocusFeature(feature: ThreeOsmPreparedAirspaceFeature) {
  return feature.tier === "terminal-controlled" ||
    feature.tier === "special-use" ||
    feature.altitudeBand === "surface";
}

export function resolveThreeOsmAirspaceFocus({
  prepared,
  selectedAirspaceId = "",
  maxFocusFeatures = 6,
  maxLabels = 2,
}: {
  prepared: ThreeOsmPreparedAirspaceGeometry;
  selectedAirspaceId?: string;
  maxFocusFeatures?: number;
  maxLabels?: number;
}): ThreeOsmAirspaceFocusResolution {
  const safeFocusLimit = Math.max(
    0,
    Math.min(10, Math.trunc(Number(maxFocusFeatures)) || 0),
  );
  const safeLabelLimit = Math.max(
    0,
    Math.min(3, Math.trunc(Number(maxLabels)) || 0),
  );
  const ranked = [...prepared.featureList].sort(
    (left, right) =>
      focusScore(left) - focusScore(right) || left.key.localeCompare(right.key),
  );
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
      !canLabelFocusFeature(feature) ||
      !feature.contextLabel ||
      seenLabels.has(feature.contextLabel)
    ) {
      return false;
    }
    seenLabels.add(feature.contextLabel);
    return true;
  }).slice(0, safeLabelLimit);

  return {
    focus,
    context,
    focusFeatures,
    labelFeatures,
  };
}
