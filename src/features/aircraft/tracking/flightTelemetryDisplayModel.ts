function toFiniteTelemetryNumber(value: unknown) {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function formatFlightTelemetryMetric({
  metric,
  value,
  alternate = false,
}: {
  metric?: string;
  value?: unknown;
  alternate?: boolean;
} = {}) {
  const numeric = toFiniteTelemetryNumber(value);
  if (numeric == null) return null;

  if (metric === "speed") {
    return alternate
      ? { value: Math.round(numeric * KNOT_TO_KMH), suffix: "km/h" }
      : { value: Math.round(numeric), suffix: "kt" };
  }

  if (metric === "altitude") {
    return alternate
      ? { value: Math.round(numeric * FOOT_TO_METER), suffix: "m" }
      : { value: Math.round(numeric), suffix: "ft" };
  }

  if (metric === "verticalSpeed") {
    return {
      value: Math.round(alternate ? numeric * FOOT_TO_METER : numeric),
      suffix: alternate ? "m/min" : "fpm",
      format: { signDisplay: "exceptZero" },
    };
  }

  return null;
}

export function resolveTrackDirectionTranslationKey(track: unknown) {
  const degrees = toFiniteTelemetryNumber(track);
  if (degrees == null) return null;
  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % TRACK_DIRECTION_KEYS.length;
  return `directions.${TRACK_DIRECTION_KEYS[index]}`;
}

export type VerticalState = "climbing" | "descending" | "level" | "unknown";

// Classify a (rounded) vertical-speed value into a flight state. The value is
// compared after rounding so tiny vertical rates read as level, matching the
// displayed number. Null/undefined means the reading is unavailable.
export function resolveVerticalState(
  verticalSpeed: number | null | undefined,
): VerticalState {
  if (verticalSpeed == null) return "unknown";
  if (verticalSpeed > 0) return "climbing";
  if (verticalSpeed < 0) return "descending";
  return "level";
}

export function resolveVerticalStateTranslationKey(state: VerticalState) {
  return `metrics.verticalState.${state}`;
}
const KNOT_TO_KMH = 1.852;
const FOOT_TO_METER = 0.3048;
const TRACK_DIRECTION_KEYS = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];
