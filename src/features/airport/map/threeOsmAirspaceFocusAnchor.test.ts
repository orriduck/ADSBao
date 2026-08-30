import assert from "node:assert/strict";
import { resolveThreeOsmAirspaceFocusAnchor } from "./threeOsmAirspaceFocusAnchor";

const focal = resolveThreeOsmAirspaceFocusAnchor({
  scopeKey: "kbos:3d",
  targetX: 72,
  targetZ: 0,
});
assert.deepEqual(focal, {
  scopeKey: "kbos:3d",
  key: "kbos:3d:focal",
  mode: "focal",
  x: 0,
  z: 0,
});

const camera = resolveThreeOsmAirspaceFocusAnchor({
  current: focal,
  scopeKey: "kbos:3d",
  targetX: 176,
  targetZ: 0,
});
assert.equal(camera.mode, "camera");
assert.equal(camera.x, 192);
assert.equal(camera.z, 0);

const retained = resolveThreeOsmAirspaceFocusAnchor({
  current: camera,
  scopeKey: "kbos:3d",
  targetX: 160,
  targetZ: 8,
});
assert.equal(retained, camera);

const hysteresis = resolveThreeOsmAirspaceFocusAnchor({
  current: camera,
  scopeKey: "kbos:3d",
  targetX: 100,
  targetZ: 0,
});
assert.equal(hysteresis.mode, "camera");
assert.equal(hysteresis.x, 128);

const returned = resolveThreeOsmAirspaceFocusAnchor({
  current: hysteresis,
  scopeKey: "kbos:3d",
  targetX: 80,
  targetZ: 0,
});
assert.equal(returned.mode, "focal");

const nextScope = resolveThreeOsmAirspaceFocusAnchor({
  current: camera,
  scopeKey: "kbos:2d",
  targetX: 176,
  targetZ: 0,
});
assert.equal(nextScope.mode, "camera");
assert.equal(nextScope.scopeKey, "kbos:2d");

console.log("threeOsmAirspaceFocusAnchor.test.ts ok");
