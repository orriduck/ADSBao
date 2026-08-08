function toFiniteTelemetryNumber(value: unknown) {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function formatFlightTelemetryMetric({
  metric,
  value,
}: {
  metric?: string;
  value?: unknown;
} = {}) {
  const numeric = toFiniteTelemetryNumber(value);
  if (numeric == null) return null;

  if (metric === "speed") {
    return { value: Math.round(numeric), suffix: "kt" };
  }

  if (metric === "altitude") {
    return { value: Math.round(numeric), suffix: "ft" };
  }

  if (metric === "verticalSpeed") {
    return {
      value: Math.round(numeric),
      suffix: "fpm",
      format: { signDisplay: "exceptZero" },
    };
  }

  return null;
}
