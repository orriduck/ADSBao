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

// UTC-based construction (not the local-time Date constructor) so these
// tests are deterministic regardless of the machine's own timezone — the
// whole point of resolveLocalHour is to derive time from longitude instead
// of the runtime's local clock.
const dateMs = (hour: number, minute = 0) =>
  Date.UTC(2026, 0, 15, hour, minute, 0, 0);

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

// --- longitude-derived local time (the actual bug fix) ---------------------
// Time-of-day must follow the LOCATION (via longitude), not the machine
// running the code. UTC 00:00 is night at lon=0, but broad daylight on the
// other side of the world — the exact bug a device-local clock would get
// wrong for an airport far from the viewer.

{
  const utcMidnight = dateMs(0);
  assert.equal(resolveTimeOfDayBucket(utcMidnight, 0), "night");
  // lon=150 (~East Asia, UTC+10): local hour = 0 + 10 = 10 -> day.
  assert.equal(resolveTimeOfDayBucket(utcMidnight, 150), "day");
  // lon=-120 (~US Pacific, UTC-8): local hour = 0 - 8 = 16 -> day.
  assert.equal(resolveTimeOfDayBucket(utcMidnight, -120), "day");

  const utcNoon = dateMs(12);
  assert.equal(resolveTimeOfDayBucket(utcNoon, 0), "day");
  // lon=180: local hour = 12 + 12 = 24 -> wraps to 0 -> night.
  assert.equal(resolveTimeOfDayBucket(utcNoon, 180), "night");

  assert.equal(simplifiedLightBearingDeg(utcMidnight, 0), 90, "clamped before dawn at lon 0");
  // lon=150: local hour 10 (mid-morning) -> partway from dawn (90) to dusk (270).
  assert.equal(simplifiedLightBearingDeg(utcMidnight, 150), 150, "local mid-morning at lon 150");
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
