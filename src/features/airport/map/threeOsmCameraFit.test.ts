import assert from "node:assert/strict";
import {
  resolveThreeOsmCameraFrame,
  resolveThreeOsmDefaultPerspectiveFrame,
  resolveThreeOsmFitViewport,
} from "./threeOsmCameraFit";

const regional = resolveThreeOsmFitViewport({
  points: [
    [42.3656, -71.0096],
    [40.6413, -73.7781],
  ],
  requestedZoom: 10,
  tileRadius: 2,
  aspect: 16 / 9,
});
assert.ok(regional);
assert.ok(regional.zoom < 10);
assert.ok(regional.zoom >= 3);
assert.ok(regional.xSpanTiles <= 4.35);
assert.ok(regional.framedWidthTiles <= 4.5);
assert.ok(regional.centerLat < 42.3656 && regional.centerLat > 40.6413);

const mobileNearbyRoute = resolveThreeOsmFitViewport({
  points: [
    [42.3656, -71.0096],
    [42.5842, -70.9165],
  ],
  requestedZoom: 14,
  tileRadius: 1,
  aspect: 390 / 844,
});
assert.ok(mobileNearbyRoute);
assert.ok(
  mobileNearbyRoute.zoom >= 10,
  "a portrait route fit should not fall through to the global minimum zoom",
);
assert.ok(mobileNearbyRoute.framedWidthTiles <= 2.75);
assert.ok(mobileNearbyRoute.framedHeightTiles <= 2.75);

const dateline = resolveThreeOsmFitViewport({
  points: [
    [35, 179.5],
    [35.2, -179.5],
  ],
  requestedZoom: 8,
  tileRadius: 2,
  aspect: 16 / 9,
});
assert.ok(dateline);
assert.ok(dateline.zoom >= 7, "dateline neighbors should not force a world view");
assert.ok(Math.abs(dateline.centerLon) > 170);

const orthographic = resolveThreeOsmCameraFrame({
  points: [
    { x: -300, y: 0, z: -100 },
    { x: 300, y: 200, z: 100 },
  ],
  mode: "2d",
  aspect: 16 / 9,
});
assert.ok(orthographic);
assert.equal(orthographic.target.y, 0);
assert.ok(orthographic.orthographicZoom < 2);

const perspective = resolveThreeOsmCameraFrame({
  points: [
    { x: -300, y: 0, z: -100 },
    { x: 300, y: 400, z: 100 },
  ],
  mode: "3d",
  aspect: 16 / 9,
});
assert.ok(perspective);
assert.equal(perspective.target.y, 0);
assert.ok(perspective.distance > 700);
assert.equal(perspective.position.x, perspective.target.x);
assert.ok(perspective.position.y - perspective.target.y > perspective.position.z - perspective.target.z);

const desktopDefault = resolveThreeOsmDefaultPerspectiveFrame({
  aspect: 16 / 9,
  tileRadius: 2,
});
const mobileDefault = resolveThreeOsmDefaultPerspectiveFrame({
  aspect: 390 / 844,
  tileRadius: 1,
});
assert.equal(desktopDefault.position.x, 0);
assert.equal(mobileDefault.position.x, 0);
assert.equal(desktopDefault.elevationDegrees, 60);
assert.equal(mobileDefault.elevationDegrees, 60);
assert.ok(desktopDefault.position.z > 0);
assert.ok(mobileDefault.position.z > 0);
assert.ok(desktopDefault.position.y > desktopDefault.position.z);
assert.ok(mobileDefault.position.y > mobileDefault.position.z);
assert.ok(desktopDefault.up.y > 0);
assert.ok(desktopDefault.up.z < 0);
assert.ok(
  Math.abs(
    desktopDefault.direction.y * desktopDefault.up.y +
      desktopDefault.direction.z * desktopDefault.up.z,
  ) < 0.0001,
);
assert.ok(desktopDefault.distance > mobileDefault.distance);
assert.ok(desktopDefault.distance < 700);
assert.ok(mobileDefault.distance >= 300);

console.log("threeOsmCameraFit.test.ts ok");
