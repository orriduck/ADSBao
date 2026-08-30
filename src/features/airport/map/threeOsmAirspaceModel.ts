export const THREE_OSM_AIRSPACE_TIERS = [
  "special-use",
  "terminal-controlled",
  "transition-controlled",
  "upper-controlled",
  "advisory",
] as const;

export type ThreeOsmAirspaceTier = (typeof THREE_OSM_AIRSPACE_TIERS)[number];
export type ThreeOsmAirspaceAltitudeBand = "surface" | "low" | "high";

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

export function resolveThreeOsmAirspaceAltitudeBand(
  altitudeFt: unknown,
): ThreeOsmAirspaceAltitudeBand {
  const value = Number(altitudeFt);
  if (!Number.isFinite(value) || value <= 100) return "surface";
  if (value < 3_000) return "low";
  return "high";
}
