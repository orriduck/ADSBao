// Pure environmental-shading model for the aircraft canvas renderer: a
// weather-driven ambient "mood" (feeds palette lookup) and a simplified,
// deliberately-not-astronomical light bearing (feeds the 4-direction gradient
// mask picked in aircraftLightMask.ts). Kept framework/canvas-free so the
// mapping and hysteresis math are unit-testable without a browser.
//
// This is a distinct, narrower thing than a real day/night terminator: the
// light bearing here is a linear East->West sweep over the browser's local
// clock, not a solar-position calculation. That's an explicit, user-approved
// simplification for this ambient glyph-shading effect only.

export type WeatherMood = "clear" | "overcast" | "severe";

const OVERCAST_CLOUD_COVER_PCT = 70;

// Weather -> ambient mood. Flight-rules category takes priority (it already
// captures the "how bad is it" signal pilots use); cloud cover is a fallback
// for callers that only have Open-Meteo data (e.g. here-mode with no nearby
// METAR station yet). VFR/MVFR are visually merged into "overcast" only when
// cloud cover is heavy — otherwise both read as "clear" ambience, since the
// mood is meant to convey a coarse atmosphere, not the four-way FAA category.
export function resolveWeatherMood(
  flightCategory: unknown,
  cloudCoverPct: unknown = null,
): WeatherMood {
  const category = String(flightCategory || "").trim().toUpperCase();
  if (category === "IFR" || category === "LIFR") return "severe";
  if (category === "MVFR") return "overcast";
  const cloudCover = Number(cloudCoverPct);
  if (Number.isFinite(cloudCover) && cloudCover >= OVERCAST_CLOUD_COVER_PCT) {
    return "overcast";
  }
  return "clear";
}

const DAWN_HOUR = 6;
const DUSK_HOUR = 18;
const DAWN_BEARING_DEG = 90;
const DUSK_BEARING_DEG = 270;

// Simplified light source bearing: sweeps linearly from due-east at dawn to
// due-west at dusk using the browser's local clock, clamping outside that
// window. Not solar-accurate (no latitude/season/declination) — that
// precision belongs to a real day/night terminator overlay, a separate,
// deferred feature. This is intentionally just "does the sun feel like it's
// behind me or ahead of me right now".
export function simplifiedLightBearingDeg(nowMs: number): number {
  const date = new Date(nowMs);
  const hour = date.getHours() + date.getMinutes() / 60;
  if (hour <= DAWN_HOUR) return DAWN_BEARING_DEG;
  if (hour >= DUSK_HOUR) return DUSK_BEARING_DEG;
  const t = (hour - DAWN_HOUR) / (DUSK_HOUR - DAWN_HOUR);
  return DAWN_BEARING_DEG + t * (DUSK_BEARING_DEG - DAWN_BEARING_DEG);
}

function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

// Angle of the light source relative to the aircraft's own nose (0deg = light
// dead ahead, 90deg = light off the right side, ...). This is the frame the
// gradient mask must be picked in, since the mask composites AFTER the
// canvas has already been rotated by heading.
export function relativeLightAngleDeg(
  lightBearingDeg: number,
  headingDeg: number,
): number {
  return normalizeDeg(lightBearingDeg - headingDeg);
}

// Quantizes a relative angle into `bucketCount` equal-width buckets centred
// on 0/90/180/270 (for the default 4) — front/right/back/left.
export function lightBucketForRelativeAngle(
  relativeAngleDeg: number,
  bucketCount = 4,
): number {
  const bucketWidthDeg = 360 / bucketCount;
  const normalized = normalizeDeg(relativeAngleDeg);
  return Math.floor((normalized + bucketWidthDeg / 2) / bucketWidthDeg) % bucketCount;
}

function bucketCenterDeg(bucket: number, bucketCount: number): number {
  return (bucket * (360 / bucketCount)) % 360;
}

// Signed-shortest angular distance between two compass angles, in [0, 180].
function angularDistanceDeg(a: number, b: number): number {
  return Math.abs(((a - b + 540) % 360) - 180);
}

export interface LightBucketHysteresisOptions {
  bucketCount?: number;
  /**
   * How far the relative angle must drift from the CURRENT bucket's centre
   * (in degrees) before switching buckets. Deliberately larger than half the
   * bucket width (45deg for 4 buckets) so a heading that hovers near a
   * bucket boundary — normal ADS-B track noise — doesn't flip the highlight
   * side every time new data arrives (schmitt-trigger style hysteresis).
   */
  switchThresholdDeg?: number;
}

// Given the raw relative angle and the bucket currently held for this
// aircraft, decide whether to keep it or switch. `previousBucket` is null
// the first time an aircraft is seen (no hysteresis to apply yet).
export function resolveLightBucketWithHysteresis(
  relativeAngleDeg: number,
  previousBucket: number | null,
  { bucketCount = 4, switchThresholdDeg = 58 }: LightBucketHysteresisOptions = {},
): number {
  const normalized = normalizeDeg(relativeAngleDeg);
  if (previousBucket == null) {
    return lightBucketForRelativeAngle(normalized, bucketCount);
  }
  const distanceFromCurrentCenter = angularDistanceDeg(
    normalized,
    bucketCenterDeg(previousBucket, bucketCount),
  );
  if (distanceFromCurrentCenter <= switchThresholdDeg) return previousBucket;
  return lightBucketForRelativeAngle(normalized, bucketCount);
}

// Convenience wrapper for the call site (per-aircraft, per render): combines
// the light-bearing/heading angle with the hysteresis decision in one call.
export function resolveAircraftLightBucket(
  lightBearingDeg: number,
  headingDeg: number,
  previousBucket: number | null,
  options?: LightBucketHysteresisOptions,
): number {
  const relativeAngleDeg = relativeLightAngleDeg(lightBearingDeg, headingDeg);
  return resolveLightBucketWithHysteresis(relativeAngleDeg, previousBucket, options);
}
