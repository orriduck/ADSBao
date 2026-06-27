import assert from "node:assert/strict";

import {
  convertDistanceFromNm,
  convertTemperatureFromC,
  convertAltitudeFromFt,
  defaultGroundSpeedUnit,
  formatAltitude,
  formatAltitudeFromMeters,
  formatDistance,
  formatGroundSpeed,
  formatTemperature,
} from "./units";

// --- Distance conversions

assert.equal(convertDistanceFromNm(100, "nm"), 100);
assert.equal(Math.round(convertDistanceFromNm(100, "km") * 10) / 10, 185.2);
assert.equal(
  Math.round(convertDistanceFromNm(100, "mi") * 10) / 10,
  115.1,
);

// --- Temperature conversions

assert.equal(convertTemperatureFromC(0, "c"), 0);
assert.equal(convertTemperatureFromC(0, "f"), 32);
assert.equal(convertTemperatureFromC(100, "f"), 212);
assert.equal(convertTemperatureFromC(-40, "f"), -40);

// --- Altitude conversions (raw)

assert.equal(convertAltitudeFromFt(1000, "ft"), 1000);
assert.equal(Math.round(convertAltitudeFromFt(1000, "m")), 305);
assert.equal(convertAltitudeFromFt(35000, "fl"), 350);

// --- formatDistance honors precision and sub-one fallback

assert.deepEqual(formatDistance(9.3, "nm", { precision: 0 }), {
  value: 9,
  unit: "NM",
  text: null,
});
assert.deepEqual(formatDistance(0.4, "nm", { precision: 0 }), {
  value: null,
  unit: "NM",
  text: "<1",
});
assert.equal(formatDistance(null, "nm"), null);
assert.equal(formatDistance("oops", "km"), null);

// --- formatTemperature carries the right label

{
  const result = formatTemperature(25, "f");
  assert.ok(result);
  assert.equal(result.unit, "°F");
  assert.equal(result.value, 77);
}

// --- formatAltitude: FL only kicks in above the minimum

{
  const cruise = formatAltitude(35000, "fl");
  assert.deepEqual(cruise, {
    value: 350,
    unit: "",
    text: null,
    prefix: "FL ",
  });
}

{
  // Below the FL minimum the helper falls back to ft so a 600 ft taxi reads
  // as "600 ft" instead of the nonsensical "FL6".
  const low = formatAltitude(600, "fl");
  assert.deepEqual(low, { value: 600, unit: "ft", text: null });
}

{
  // Ground kind always falls back to ft (or m if user picked m).
  const elevation = formatAltitude(1234, "fl", { kind: "ground" });
  assert.deepEqual(elevation, { value: 1234, unit: "ft", text: null });
}

{
  const meters = formatAltitude(1000, "m");
  assert.ok(meters);
  assert.equal(meters.unit, "m");
  assert.equal(Math.round(meters.value as number), 305);
}

// --- Here-mode ground speed (km/h default, mph on toggle; never knots)
{
  // 10 m/s = 36 km/h, and the same speed in mph.
  assert.deepEqual(formatGroundSpeed(10, "kmh"), {
    value: 36,
    unit: "km/h",
    text: null,
  });
  assert.deepEqual(formatGroundSpeed(10, "mph"), {
    value: 22,
    unit: "mph",
    text: null,
  });
  // No fix / negative / non-finite collapses to null (em dash at the call site).
  assert.equal(formatGroundSpeed(null, "kmh"), null);
  assert.equal(formatGroundSpeed(-1, "kmh"), null);
  // A stationary device reporting 0 is a real reading, not "no fix".
  assert.deepEqual(formatGroundSpeed(0, "kmh"), {
    value: 0,
    unit: "km/h",
    text: null,
  });
}

// --- Here-mode speed default follows the user's metric/imperial system
{
  // Distance is the primary signal.
  assert.equal(defaultGroundSpeedUnit({ distance: "km", altitude: "ft" }), "kmh");
  assert.equal(defaultGroundSpeedUnit({ distance: "mi", altitude: "m" }), "mph");
  // Nautical miles (neither system) falls back to the altitude unit.
  assert.equal(defaultGroundSpeedUnit({ distance: "nm", altitude: "ft" }), "mph");
  assert.equal(defaultGroundSpeedUnit({ distance: "nm", altitude: "m" }), "kmh");
  // Fully aviation prefs (nm + fl) default to metric.
  assert.equal(defaultGroundSpeedUnit({ distance: "nm", altitude: "fl" }), "kmh");
}

// --- Altitude from metres (Geolocation API reports metres)
{
  // ~305 m ≈ 1000 ft.
  const feet = formatAltitudeFromMeters(304.8, "ft");
  assert.deepEqual(feet, { value: 1000, unit: "ft", text: null });
  // Metres preference round-trips back to metres.
  const meters = formatAltitudeFromMeters(305, "m");
  assert.ok(meters);
  assert.equal(meters.unit, "m");
  assert.equal(Math.round(meters.value as number), 305);
  // Ground kind keeps a pedestrian off flight levels.
  const fl = formatAltitudeFromMeters(304.8, "fl", { kind: "ground" });
  assert.deepEqual(fl, { value: 1000, unit: "ft", text: null });
  assert.equal(formatAltitudeFromMeters(null, "ft"), null);
}

console.log("units.test.ts ok");
