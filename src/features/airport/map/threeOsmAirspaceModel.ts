export const THREE_OSM_AIRSPACE_TIERS = [
  "special-use",
  "terminal-controlled",
  "transition-controlled",
  "upper-controlled",
  "advisory",
] as const;

export type ThreeOsmAirspaceTier = (typeof THREE_OSM_AIRSPACE_TIERS)[number];
export type ThreeOsmAirspaceAltitudeBand = "surface" | "low" | "high";
export type ThreeOsmAirspaceWorldPoint = { x: number; z: number };

const SPECIAL_USE_ACCESS_LEVELS = new Set([
  "blocked",
  "restricted",
  "permission-required",
  "caution",
]);

export function resolveThreeOsmAirspaceTier(
  properties: Record<string, any> = {},
): ThreeOsmAirspaceTier {
  const accessLevel = String(properties.accessLevel || "").trim().toLowerCase();
  if (SPECIAL_USE_ACCESS_LEVELS.has(accessLevel)) return "special-use";

  const classLabel = String(properties.classLabel || "").trim().toUpperCase();
  if (classLabel === "B" || classLabel === "C" || classLabel === "D") {
    return "terminal-controlled";
  }
  if (classLabel === "E") return "transition-controlled";
  if (classLabel === "A") return "upper-controlled";
  return "advisory";
}

function rawLimitAltitudeFt(limit: unknown) {
  if (!limit || typeof limit !== "object") return null;
  const record = limit as Record<string, unknown>;
  const value = Number(record.value);
  const unit = Number(record.unit);
  if (!Number.isFinite(value)) return null;
  if (unit === 0) return value * 3.280839895;
  if (unit === 6) return value * 100;
  return value;
}

function labelAltitudeFt(label: unknown) {
  const normalized = String(label || "").trim().toUpperCase();
  if (!normalized) return null;
  if (normalized === "SFC") return 0;
  const flightLevel = normalized.match(/^FL\s*(\d+(?:\.\d+)?)/);
  if (flightLevel) return Number(flightLevel[1]) * 100;
  const numeric = normalized.match(/(-?\d+(?:\.\d+)?)\s*(FT|M)\b/);
  if (!numeric) return null;
  const value = Number(numeric[1]);
  return numeric[2] === "M" ? value * 3.280839895 : value;
}

export function resolveThreeOsmAirspaceLowerAltitudeFt(
  properties: Record<string, any> = {},
) {
  const altitudeFt =
    rawLimitAltitudeFt(properties.lowerLimit) ??
    labelAltitudeFt(properties.lowerLimitLabel);
  if (!Number.isFinite(altitudeFt)) return 0;
  return Math.min(60_000, Math.max(0, Number(altitudeFt)));
}

export function resolveThreeOsmAirspaceUpperAltitudeFt(
  properties: Record<string, any> = {},
) {
  const altitudeFt =
    rawLimitAltitudeFt(properties.upperLimit) ??
    labelAltitudeFt(properties.upperLimitLabel);
  if (!Number.isFinite(altitudeFt)) return null;
  return Math.min(60_000, Math.max(0, Number(altitudeFt)));
}

export function resolveThreeOsmAirspaceCueHeightWorld(
  lowerAltitudeFt: unknown,
  upperAltitudeFt: unknown,
) {
  const lower = Number(lowerAltitudeFt);
  const upper = Number(upperAltitudeFt);
  if (!Number.isFinite(lower) || !Number.isFinite(upper) || upper <= lower) {
    return 0;
  }
  const verticalSpanFt = upper - lower;
  // This is a bounded semantic cue, not a second physical altitude scale.
  // The full lower/upper values remain visible in the selected-airspace label.
  return Math.min(
    64,
    Math.max(14, 14 + Math.log2(1 + verticalSpanFt / 500) * 8),
  );
}

export function resolveThreeOsmAirspaceAltitudeBand(
  altitudeFt: unknown,
): ThreeOsmAirspaceAltitudeBand {
  const value = Number(altitudeFt);
  if (!Number.isFinite(value) || value <= 100) return "surface";
  if (value < 3_000) return "low";
  return "high";
}

export function resolveThreeOsmAirspaceSimplificationTolerance(zoom: unknown) {
  const value = Number(zoom);
  if (!Number.isFinite(value) || value <= 10) return 0.75;
  if (value <= 11) return 0.55;
  if (value <= 12) return 0.35;
  if (value <= 13) return 0.2;
  return 0.1;
}

function squaredDistance<T extends ThreeOsmAirspaceWorldPoint>(
  left: T,
  right: T,
) {
  return (left.x - right.x) ** 2 + (left.z - right.z) ** 2;
}

function squaredSegmentDistance<T extends ThreeOsmAirspaceWorldPoint>(
  point: T,
  start: T,
  end: T,
) {
  let x = start.x;
  let z = start.z;
  const deltaX = end.x - x;
  const deltaZ = end.z - z;
  if (deltaX !== 0 || deltaZ !== 0) {
    const offset = Math.min(
      1,
      Math.max(
        0,
        ((point.x - x) * deltaX + (point.z - z) * deltaZ) /
          (deltaX ** 2 + deltaZ ** 2),
      ),
    );
    x += deltaX * offset;
    z += deltaZ * offset;
  }
  return (point.x - x) ** 2 + (point.z - z) ** 2;
}

function simplifyOpenPath<T extends ThreeOsmAirspaceWorldPoint>(
  points: T[],
  toleranceSquared: number,
) {
  if (points.length <= 2) return points;

  const radial: T[] = [points[0]];
  let previous = points[0];
  for (let index = 1; index < points.length - 1; index += 1) {
    const point = points[index];
    if (squaredDistance(point, previous) <= toleranceSquared) continue;
    radial.push(point);
    previous = point;
  }
  radial.push(points[points.length - 1]);
  if (radial.length <= 2) return radial;

  const markers = new Uint8Array(radial.length);
  markers[0] = 1;
  markers[radial.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, radial.length - 1]];
  while (stack.length) {
    const [startIndex, endIndex] = stack.pop() as [number, number];
    let farthestIndex = -1;
    let farthestDistance = toleranceSquared;
    for (let index = startIndex + 1; index < endIndex; index += 1) {
      const distance = squaredSegmentDistance(
        radial[index],
        radial[startIndex],
        radial[endIndex],
      );
      if (distance <= farthestDistance) continue;
      farthestDistance = distance;
      farthestIndex = index;
    }
    if (farthestIndex < 0) continue;
    markers[farthestIndex] = 1;
    stack.push([startIndex, farthestIndex], [farthestIndex, endIndex]);
  }
  return radial.filter((_, index) => markers[index] === 1);
}

export function simplifyThreeOsmAirspaceRing<T extends ThreeOsmAirspaceWorldPoint>(
  points: T[] = [],
  tolerance: unknown,
) {
  const numericTolerance = Math.max(0, Number(tolerance) || 0);
  if (points.length <= 4 || numericTolerance === 0) return points;
  const closed = squaredDistance(points[0], points[points.length - 1]) < 1e-12;
  if (!closed) {
    return simplifyOpenPath(points, numericTolerance ** 2);
  }

  const unique = points.slice(0, -1);
  if (unique.length < 4) return points;
  let splitIndex = 1;
  let farthestDistance = -1;
  for (let index = 1; index < unique.length; index += 1) {
    const distance = squaredDistance(unique[0], unique[index]);
    if (distance <= farthestDistance) continue;
    farthestDistance = distance;
    splitIndex = index;
  }
  const toleranceSquared = numericTolerance ** 2;
  const firstArc = simplifyOpenPath(
    unique.slice(0, splitIndex + 1),
    toleranceSquared,
  );
  const secondArc = simplifyOpenPath(
    [...unique.slice(splitIndex), unique[0]],
    toleranceSquared,
  );
  const simplified = [...firstArc, ...secondArc.slice(1)];
  if (simplified.length < 4) return points;
  return simplified;
}
