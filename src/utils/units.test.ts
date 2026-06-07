import assert from "node:assert/strict";

import {
  convertDistanceFromNm,
  convertTemperatureFromC,
  convertAltitudeFromFt,
  formatAltitude,
  formatDistance,
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
  assert.deepEqual(cruise, { value: null, unit: "FL", text: "FL350" });
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

console.log("units.test.ts ok");
