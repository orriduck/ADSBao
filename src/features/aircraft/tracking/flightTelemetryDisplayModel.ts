const KNOT_TO_KMH = 1.852;
const FOOT_TO_METER = 0.3048;
const TRACK_DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const TRACK_DIRECTION_KEYS = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];

function toFiniteTelemetryNumber(value: unknown) {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function resolveTrackDirection(track: unknown) {
  const index = resolveTrackDirectionIndex(track);
  return index == null ? null : TRACK_DIRECTIONS[index];
}

export function resolveTrackDirectionTranslationKey(track: unknown) {
  const index = resolveTrackDirectionIndex(track);
  return index == null ? null : `directions.${TRACK_DIRECTION_KEYS[index]}`;
}

function resolveTrackDirectionIndex(track: unknown) {
  const degrees = toFiniteTelemetryNumber(track);
  if (degrees == null) return null;
  const normalized = ((degrees % 360) + 360) % 360;
  return Math.round(normalized / 45) % TRACK_DIRECTIONS.length;
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
