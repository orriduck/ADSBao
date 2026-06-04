import assert from "node:assert/strict";

import {
  estimateLocalSolarMinutes,
  resolveImmersiveLocalTime,
} from "./localTimeModel";

const bostonMorning = resolveImmersiveLocalTime({
  date: "2026-06-04T12:00:00.000Z",
  lat: 42.3656,
  lon: -71.0096,
});

assert.equal(bostonMorning.utcMinutes, 720);
assert.equal(bostonMorning.localOffsetMinutes, -284);
assert.equal(bostonMorning.localMinutes, 436);
assert.equal(bostonMorning.bucketMinutes, 435);
assert.equal(bostonMorning.cacheKey, "immersive-local-435");

assert.equal(
  estimateLocalSolarMinutes({
    date: "2026-06-04T00:05:00.000Z",
    lat: 42.3656,
    lon: -71.0096,
  }),
  1161,
);

assert.equal(
  resolveImmersiveLocalTime({
    date: "2026-06-04T12:13:59.000Z",
    lat: 42.3656,
    lon: -71.0096,
  }).cacheKey,
  "immersive-local-435",
);

assert.equal(
  resolveImmersiveLocalTime({
    date: "2026-06-04T12:14:00.000Z",
    lat: 42.3656,
    lon: -71.0096,
  }).cacheKey,
  "immersive-local-450",
);

assert.equal(
  resolveImmersiveLocalTime({
    date: "2026-06-04T12:00:00.000Z",
    lat: null,
    lon: null,
  }).localMinutes,
  720,
);

console.log("localTimeModel.test.ts ok");
