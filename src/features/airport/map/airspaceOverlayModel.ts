type AirspaceOverlayRecord = Record<string, any>;
type AirspaceOverlayAnimationPhase = "enter" | "exit";

type AirspaceOverlayFeature = {
  type: "Feature";
  geometry: Record<string, any>;
  properties: {
    id: string;
    name: string;
    typeLabel: string;
    classLabel: string;
    accessLevel: string;
    accessLabel: string;
    lowerLimitLabel: string;
    upperLimitLabel: string;
    verticalLimit: string;
    source: string;
  };
};

const AIRSPACE_OVERLAY_ANIMATION = {
  itemDurationMs: 220,
  staggerMs: 32,
  maxDelayMs: 420,
};

const TOKEN_BY_LEVEL: Record<string, string> = {
  blocked: "blocked",
  restricted: "restricted",
  "permission-required": "permission",
  caution: "destructive",
  controlled: "controlled",
  informational: "info",
  unknown: "unknown",
};

const tokenForLevel = (level: string) =>
  TOKEN_BY_LEVEL[level] || TOKEN_BY_LEVEL.unknown;

const DASH_BY_LEVEL: Record<string, string | undefined> = {
  blocked: undefined,
  restricted: "1 5",
  "permission-required": "1 5",
  caution: undefined,
  controlled: "1 6",
  informational: "1 6",
  unknown: "1 6",
};

const isDrawableGeometry = (geometry: AirspaceOverlayRecord | null | undefined) =>
  geometry?.type === "Polygon" || geometry?.type === "MultiPolygon";

const verticalLimitLabel = (airspace: AirspaceOverlayRecord) =>
  [airspace.lowerLimitLabel, airspace.upperLimitLabel].filter(Boolean).join(" - ");

export function buildAirspaceOverlayFeatures(
  airspaces: AirspaceOverlayRecord[] = [],
): AirspaceOverlayFeature[] {
  return airspaces.flatMap((airspace) => {
    if (!isDrawableGeometry(airspace?.geometry)) return [];
    const accessLevel = String(airspace.accessTag?.level || "unknown");
    return [{
      type: "Feature" as const,
      geometry: airspace.geometry,
      properties: {
        id: String(airspace.id || ""),
        name: String(airspace.name || "Unnamed airspace"),
        typeLabel: String(airspace.typeLabel || "Airspace"),
        classLabel: String(airspace.classLabel || ""),
        accessLevel,
        accessLabel: String(airspace.accessTag?.shortLabel || airspace.accessTag?.label || ""),
        lowerLimitLabel: String(airspace.lowerLimitLabel || ""),
        upperLimitLabel: String(airspace.upperLimitLabel || ""),
        verticalLimit: verticalLimitLabel(airspace),
        source: airspace.source === "openaip" ? "OpenAIP" : String(airspace.source || ""),
      },
    }];
  }).sort(
    (a, b) => approximateGeometryBoundsArea(b.geometry) - approximateGeometryBoundsArea(a.geometry),
  );
}

export function buildAirspaceOverlayAnimationPlan(
  items: readonly unknown[] = [],
  phase: AirspaceOverlayAnimationPhase,
  options: { reducedMotion?: boolean } = {},
) {
  const count = items.length;
  const indexes = Array.from({ length: count }, (_, index) => index);
  const orderedIndexes = phase === "exit" ? indexes.reverse() : indexes;

  if (options.reducedMotion || count === 0) {
    return {
      itemDurationMs: 0,
      totalDurationMs: 0,
      steps: orderedIndexes.map((index) => ({ index, delayMs: 0 })),
    };
  }

  const maxDelayMs = Math.min(
    AIRSPACE_OVERLAY_ANIMATION.maxDelayMs,
    Math.max(0, (count - 1) * AIRSPACE_OVERLAY_ANIMATION.staggerMs),
  );
  const staggerMs = count <= 1 ? 0 : maxDelayMs / (count - 1);

  return {
    itemDurationMs: AIRSPACE_OVERLAY_ANIMATION.itemDurationMs,
    totalDurationMs: Math.round(maxDelayMs + AIRSPACE_OVERLAY_ANIMATION.itemDurationMs),
    steps: orderedIndexes.map((index, order) => ({
      index,
      delayMs: Math.round(order * staggerMs),
    })),
  };
}

export function resolveAirspaceInitialOpacity({
  visible,
  animateInitialEnter,
}: {
  visible: boolean;
  animateInitialEnter: boolean;
}) {
  if (!visible) return 0;
  return animateInitialEnter ? 0 : 1;
}

function approximateGeometryBoundsArea(geometry: AirspaceOverlayRecord = {}) {
  const pairs: number[][] = [];
  collectCoordinatePairs(geometry.coordinates, pairs);
  if (pairs.length === 0) return 0;

  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  for (const [lon, lat] of pairs) {
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    minLon = Math.min(minLon, lon);
    minLat = Math.min(minLat, lat);
    maxLon = Math.max(maxLon, lon);
    maxLat = Math.max(maxLat, lat);
  }
  if (!Number.isFinite(minLon) || !Number.isFinite(minLat)) return 0;
  return Math.max(0, maxLon - minLon) * Math.max(0, maxLat - minLat);
}

function collectCoordinatePairs(value: any, pairs: number[][]) {
  if (!Array.isArray(value)) return;
  if (typeof value[0] === "number" && typeof value[1] === "number") {
    pairs.push([value[0], value[1]]);
    return;
  }
  value.forEach((item) => collectCoordinatePairs(item, pairs));
}

export function resolveAirspaceOverlayStyle(feature: AirspaceOverlayRecord = {}) {
  const level = String(feature.properties?.accessLevel || "unknown");
  const token = tokenForLevel(level);
  return {
    color: `var(--airspace-${token}-stroke)`,
    fillColor: `var(--airspace-${token}-fill)`,
    fillOpacity: 0.32,
    opacity: 0.88,
    weight: level === "blocked" || level === "restricted" ? 2.1 : 1.75,
    dashArray: DASH_BY_LEVEL[level],
    lineCap: "round" as const,
    lineJoin: "round" as const,
  };
}

export function resolveAirspaceOverlayFocusStyle(feature: AirspaceOverlayRecord = {}) {
  const level = String(feature.properties?.accessLevel || "unknown");
  const token = tokenForLevel(level);
  const style = resolveAirspaceOverlayStyle(feature);
  return {
    ...style,
    fillColor: `var(--airspace-${token}-focus-fill)`,
    fillOpacity: 1,
    opacity: 1,
    weight: Number(style.weight || 1.5) + 0.8,
  };
}
