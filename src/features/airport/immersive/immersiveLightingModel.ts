const MINUTES_PER_DAY = 24 * 60;
const AIRPORT_LIGHTS_START_MINUTES = 21 * 60;
const AIRPORT_LIGHTS_END_MINUTES = 5 * 60;

function normalizeMinutes(value: unknown) {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return ((Math.round(numeric) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

export function isImmersiveNightLightingActive({
  localMinutes = null,
  phase = "",
}: {
  localMinutes?: unknown;
  phase?: unknown;
} = {}) {
  const minutes = normalizeMinutes(localMinutes);
  if (minutes == null) return String(phase || "") === "night";
  return (
    minutes >= AIRPORT_LIGHTS_START_MINUTES ||
    minutes < AIRPORT_LIGHTS_END_MINUTES
  );
}
