import assert from "node:assert/strict";
import * as THREE from "three";
import { resolveThreeOsmNearestScreenTarget } from "./threeOsmScreenHit";

const camera = new THREE.OrthographicCamera(-100, 100, 75, -75, 0.1, 1_000);
camera.position.set(0, 200, 0.01);
camera.up.set(0, 0, -1);
camera.lookAt(0, 0, 0);
camera.updateMatrixWorld();

const center = { id: "center", position: new THREE.Vector3(0, 0, 0) };
const right = { id: "right", position: new THREE.Vector3(25, 0, 0) };

assert.equal(
  resolveThreeOsmNearestScreenTarget({
    targets: [center, right],
    camera,
    width: 800,
    height: 600,
    x: 413,
    y: 300,
    radiusPx: 14,
  })?.id,
  "center",
);
assert.equal(
  resolveThreeOsmNearestScreenTarget({
    targets: [center, right],
    camera,
    width: 800,
    height: 600,
    x: 415,
    y: 300,
    radiusPx: 14,
  }),
  null,
);
assert.equal(
  resolveThreeOsmNearestScreenTarget({
    targets: [center, right],
    camera,
    width: 800,
    height: 600,
    x: 498,
    y: 300,
    radiusPx: 14,
  })?.id,
  "right",
);

console.log("threeOsmScreenHit.test.ts ok");
