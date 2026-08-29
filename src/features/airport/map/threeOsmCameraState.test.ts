import assert from "node:assert/strict";
import * as THREE from "three";
import {
  captureThreeOsmCameraSnapshot,
  restoreThreeOsmCameraSnapshot,
} from "./threeOsmCameraState";

const target2d = new THREE.Vector3(120, 0, -80);
const camera2d = new THREE.OrthographicCamera(-400, 400, 300, -300, 0.1, 4_000);
camera2d.position.set(120, 900, -79.99);
camera2d.up.set(0, 0, -1);
camera2d.lookAt(target2d);
camera2d.zoom = 1.75;
camera2d.updateProjectionMatrix();
const snapshot2d = captureThreeOsmCameraSnapshot({
  camera: camera2d,
  target: target2d,
  scopeKey: "KBOS@10",
});
assert.ok(snapshot2d);

camera2d.position.set(0, 900, 0.01);
camera2d.zoom = 1;
target2d.set(0, 0, 0);
assert.equal(
  restoreThreeOsmCameraSnapshot({
    camera: camera2d,
    target: target2d,
    snapshot: snapshot2d,
    scopeKey: "KBOS@10",
  }),
  true,
);
assert.deepEqual(camera2d.position.toArray(), [120, 900, -79.99]);
assert.deepEqual(target2d.toArray(), [120, 0, -80]);
assert.equal(camera2d.zoom, 1.75);

const target3d = new THREE.Vector3(-40, 0, 65);
const camera3d = new THREE.PerspectiveCamera(45, 1, 1, 6_000);
camera3d.position.set(300, 420, 500);
camera3d.up.set(0, 1, 0);
camera3d.lookAt(target3d);
const snapshot3d = captureThreeOsmCameraSnapshot({
  camera: camera3d,
  target: target3d,
  scopeKey: "KBOS@10",
});
assert.ok(snapshot3d);

camera3d.position.set(0, 500, 200);
target3d.set(0, 0, 0);
assert.equal(
  restoreThreeOsmCameraSnapshot({
    camera: camera3d,
    target: target3d,
    snapshot: snapshot3d,
    scopeKey: "KBOS@10",
  }),
  true,
);
assert.deepEqual(camera3d.position.toArray(), [300, 420, 500]);
assert.deepEqual(target3d.toArray(), [-40, 0, 65]);

assert.equal(
  restoreThreeOsmCameraSnapshot({
    camera: camera2d,
    target: target2d,
    snapshot: snapshot3d,
    scopeKey: "KBOS@10",
  }),
  false,
  "a 3D snapshot must not be applied to the 2D camera",
);
assert.equal(
  restoreThreeOsmCameraSnapshot({
    camera: camera3d,
    target: target3d,
    snapshot: snapshot3d,
    scopeKey: "KJFK@10",
  }),
  false,
  "a snapshot from another scene scope must not be restored",
);

console.log("threeOsmCameraState.test.ts ok");
