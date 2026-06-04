import assert from "node:assert/strict";

import {
  resolveImmersiveColorScheme,
  resolveImmersiveColorSchemeFromLocalMinutes,
} from "./immersiveColorModel";

const bostonDawn = resolveImmersiveColorScheme({
  date: "2026-06-04T12:00:00.000Z",
  lat: 42.3656,
  lon: -71.0096,
});

assert.equal(bostonDawn.phase, "dawn");
assert.equal(bostonDawn.cacheKey, "immersive-local-435");
assert.equal(bostonDawn.localTime.bucketMinutes, 435);
assert.equal(bostonDawn.mapPalette.background, "#1b244d");
assert.equal(bostonDawn.mapPalette.roadOpacity, 0.22);
assert.equal(bostonDawn.cssProperties["--immersive-light-x"], "27%");
assert.equal(bostonDawn.cssProperties["--immersive-map-detail-opacity"], "0.86");
assert.equal(
  bostonDawn.cssProperties["--immersive-atmosphere-horizon"],
  bostonDawn.atmosphere.horizon,
);

const sameBucket = resolveImmersiveColorScheme({
  date: "2026-06-04T12:13:59.000Z",
  lat: 42.3656,
  lon: -71.0096,
});
assert.equal(sameBucket.cacheKey, bostonDawn.cacheKey);

const nextBucket = resolveImmersiveColorScheme({
  date: "2026-06-04T12:14:00.000Z",
  lat: 42.3656,
  lon: -71.0096,
});
assert.notEqual(nextBucket.cacheKey, bostonDawn.cacheKey);

const day = resolveImmersiveColorSchemeFromLocalMinutes(720);
assert.equal(day.phase, "day");
assert.equal(day.mapPalette.background, "#d7e4e8");
assert.equal(day.mapPalette.roadOpacity, 0.12);
assert.equal(day.cssProperties["--immersive-atmosphere-opacity"], "0.78");
assert.equal(day.cssProperties["--immersive-light-x"], "50.1%");
assert.equal(day.cssProperties["--immersive-light-y"], "19.2%");

const morning = resolveImmersiveColorSchemeFromLocalMinutes(555);
assert.equal(morning.phase, "morning");
assert.equal(morning.mapPalette.background, "#e1e7df");
assert.equal(morning.cssProperties["--immersive-light-x"], "36.7%");
assert.equal(morning.cssProperties["--immersive-map-detail-opacity"], "0.76");

const sunset = resolveImmersiveColorSchemeFromLocalMinutes(1080);
assert.equal(sunset.phase, "sunset");
assert.equal(sunset.mapPalette.background, "#f4e7d2");
assert.equal(sunset.mapPalette.roadShieldOpacity, 0.24);

const night = resolveImmersiveColorSchemeFromLocalMinutes(90);
assert.equal(night.phase, "night");
assert.notEqual(night.mapPalette.background, day.mapPalette.background);

console.log("immersiveColorModel.test.ts ok");
