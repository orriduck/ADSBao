import assert from "node:assert/strict";
import {
  lightBucketForRelativeAngle,
  relativeLightAngleDeg,
  resolveAircraftLightBucket,
  resolveLightBucketWithHysteresis,
  resolveTimeOfDayBucket,
  resolveWeatherMood,
  simplifiedLightBearingDeg,
} from "./aircraftAmbientModel";

const dateMs = (hour: number, minute = 0) =>
  new Date(2026, 0, 15, hour, minute, 0, 0).getTime();

// --- resolveWeatherMood ----------------------------------------------------

{
  assert.equal(resolveWeatherMood("IFR"), "severe");
  assert.equal(resolveWeatherMood("LIFR"), "severe");
  assert.equal(resolveWeatherMood("lifr"), "severe"); // case-insensitive
  assert.equal(resolveWeatherMood("MVFR"), "overcast");
  assert.equal(resolveWeatherMood("VFR"), "clear");
  assert.equal(resolveWeatherMood(null), "clear");
  assert.equal(resolveWeatherMood(""), "clear");
}

// Cloud cover is only consulted when there's no decisive flight category —
// heavy cover bumps a "clear"/unset category to overcast, light cover doesn't.
{
  assert.equal(resolveWeatherMood(null, 85), "overcast");
  assert.equal(resolveWeatherMood(null, 40), "clear");
  assert.equal(resolveWeatherMood("VFR", 90), "overcast");
  // A decisive severe category is never downgraded by cloud cover.
  assert.equal(resolveWeatherMood("IFR", 0), "severe");
}

// --- simplifiedLightBearingDeg ---------------------------------------------

{
  assert.equal(simplifiedLightBearingDeg(dateMs(3)), 90); // before dawn, clamped
  assert.equal(simplifiedLightBearingDeg(dateMs(6)), 90); // dawn
  assert.equal(simplifiedLightBearingDeg(dateMs(12)), 180); // solar noon-ish, midway
  assert.equal(simplifiedLightBearingDeg(dateMs(18)), 270); // dusk
  assert.equal(simplifiedLightBearingDeg(dateMs(22)), 270); // after dusk, clamped
}

// --- resolveTimeOfDayBucket -------------------------------------------------

{
  assert.equal(resolveTimeOfDayBucket(dateMs(2)), "night");
  assert.equal(resolveTimeOfDayBucket(dateMs(4, 59)), "night");
  assert.equal(resolveTimeOfDayBucket(dateMs(5)), "dawn");
  assert.equal(resolveTimeOfDayBucket(dateMs(7, 30)), "dawn");
  assert.equal(resolveTimeOfDayBucket(dateMs(8)), "day");
  assert.equal(resolveTimeOfDayBucket(dateMs(12)), "day");
  assert.equal(resolveTimeOfDayBucket(dateMs(16, 59)), "day");
  assert.equal(resolveTimeOfDayBucket(dateMs(17)), "dusk");
  assert.equal(resolveTimeOfDayBucket(dateMs(19, 59)), "dusk");
  assert.equal(resolveTimeOfDayBucket(dateMs(20)), "night");
  assert.equal(resolveTimeOfDayBucket(dateMs(23, 59)), "night");
}

// --- relativeLightAngleDeg + lightBucketForRelativeAngle -------------------

{
  // Light dead ahead of the nose -> 0deg -> bucket 0 (front).
  assert.equal(relativeLightAngleDeg(90, 90), 0);
  assert.equal(lightBucketForRelativeAngle(0), 0);
  // Light off the right wing.
  assert.equal(relativeLightAngleDeg(180, 90), 90);
  assert.equal(lightBucketForRelativeAngle(90), 1);
  // Light behind.
  assert.equal(lightBucketForRelativeAngle(180), 2);
  // Light off the left wing.
  assert.equal(lightBucketForRelativeAngle(270), 3);
  // Wraps correctly at the boundary.
  assert.equal(lightBucketForRelativeAngle(359), 0);
  assert.equal(lightBucketForRelativeAngle(-10), 0);
}

// --- resolveLightBucketWithHysteresis --------------------------------------

// First observation (no previous bucket) always takes the raw quantized value.
{
  assert.equal(resolveLightBucketWithHysteresis(10, null), 0);
  assert.equal(resolveLightBucketWithHysteresis(100, null), 1);
}

// Small drift near a boundary does NOT flip the bucket — this is the core
// guard against every-few-seconds flicker from normal ADS-B track noise.
{
  // Currently bucket 0 (front, centre 0deg). The nominal boundary to bucket 1
  // is at 45deg; with hysteresis the angle must pass ~58deg before switching.
  assert.equal(resolveLightBucketWithHysteresis(46, 0), 0, "stays put just past the naive boundary");
  assert.equal(resolveLightBucketWithHysteresis(50, 0), 0, "still within the hysteresis margin");
  assert.equal(resolveLightBucketWithHysteresis(60, 0), 1, "switches once clearly past the margin");
}

// Once switched, hysteresis re-centres on the NEW bucket (doesn't snap back
// just because the angle dips slightly below the old switch threshold).
{
  const afterSwitch = resolveLightBucketWithHysteresis(60, 0);
  assert.equal(afterSwitch, 1);
  assert.equal(
    resolveLightBucketWithHysteresis(50, afterSwitch),
    1,
    "holds the new bucket even though 50deg is closer to the old centre than the switch threshold would allow from bucket 0",
  );
}

// A large jump (well beyond any single-bucket hop) still resolves to the
// nearest bucket rather than getting stuck.
{
  assert.equal(resolveLightBucketWithHysteresis(181, 0), 2);
}

// --- resolveAircraftLightBucket (end-to-end convenience wrapper) -----------

{
  // Light bearing due east (90), aircraft heading due east (90) -> light dead
  // ahead -> bucket 0, regardless of prior state.
  assert.equal(resolveAircraftLightBucket(90, 90, null), 0);
  // Aircraft turns to heading 0 (due north): light is now off its right side.
  assert.equal(resolveAircraftLightBucket(90, 0, null), 1);
  // A tiny heading wobble around a boundary does not flip the held bucket.
  const held = resolveAircraftLightBucket(90, 0, null);
  assert.equal(resolveAircraftLightBucket(90, 4, held), held);
}

console.log("aircraftAmbientModel.test.ts ok");
