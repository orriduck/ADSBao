// User-pickable interface units. Stored client-side; defaults match the
// aviation conventions ADSBao started with so a fresh install reads the same
// way as today (nautical miles, Celsius, feet).

export const DISTANCE_UNITS = ["nm", "mi", "km"] as const;
export const TEMPERATURE_UNITS = ["c", "f"] as const;
export const ALTITUDE_UNITS = ["ft", "m", "fl"] as const;

export type DistanceUnit = (typeof DISTANCE_UNITS)[number];
export type TemperatureUnit = (typeof TEMPERATURE_UNITS)[number];
export type AltitudeUnit = (typeof ALTITUDE_UNITS)[number];

export interface UnitPreferences {
  distance: DistanceUnit;
  temperature: TemperatureUnit;
  altitude: AltitudeUnit;
}

export const DEFAULT_UNIT_PREFERENCES: UnitPreferences = Object.freeze({
  distance: "nm",
  temperature: "c",
  altitude: "ft",
});

function normalizeMember<T extends string>(
  value: unknown,
  members: readonly T[],
  fallback: T,
): T {
  if (typeof value !== "string") return fallback;
  const lowered = value.toLowerCase() as T;
  return members.includes(lowered) ? lowered : fallback;
}

export function normalizeUnitPreferences(
  value: unknown = DEFAULT_UNIT_PREFERENCES,
): UnitPreferences {
  const record =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    distance: normalizeMember(
      record.distance,
      DISTANCE_UNITS,
      DEFAULT_UNIT_PREFERENCES.distance,
    ),
    temperature: normalizeMember(
      record.temperature,
      TEMPERATURE_UNITS,
      DEFAULT_UNIT_PREFERENCES.temperature,
    ),
    altitude: normalizeMember(
      record.altitude,
      ALTITUDE_UNITS,
      DEFAULT_UNIT_PREFERENCES.altitude,
    ),
  };
}

export function mergeUnitPreferences(
  current: UnitPreferences,
  patch: Partial<UnitPreferences>,
): UnitPreferences {
  return normalizeUnitPreferences({ ...current, ...patch });
}
