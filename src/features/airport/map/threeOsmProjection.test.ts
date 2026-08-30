import assert from "node:assert/strict";
import {
  buildOsmRasterTileUrl,
  buildThreeOsmTileGridBounds,
  clampThreeOsmZoom,
  lonLatAltitudeToThreeOsmWorld,
  lonLatToTileCoordinate,
  shortestWrappedTileDelta,
} from "./threeOsmProjection";
import {
  buildThreeOsmTileWindowGrid,
  createThreeOsmSquareTileWindow,
} from "./threeOsmTileWindow";

const center = lonLatToTileCoordinate(-71.0064, 42.3629, 10);

assert.equal(clampThreeOsmZoom(99), 16);
assert.equal(clampThreeOsmZoom(1), 3);
assert.equal(center.z, 10);

const grid = buildThreeOsmTileWindowGrid({
  center,
  window: createThreeOsmSquareTileWindow(2),
});
assert.equal(grid.length, 25);
assert.equal(buildOsmRasterTileUrl(grid[0]).startsWith("https://tile.openstreetmap.org/10/"), true);

const bounds = buildThreeOsmTileGridBounds(center, 2);
assert.ok(bounds.west < -71.0064);
assert.ok(bounds.east > -71.0064);
assert.ok(bounds.south < 42.3629);
assert.ok(bounds.north > 42.3629);

const origin = lonLatAltitudeToThreeOsmWorld({
  lon: -71.0064,
  lat: 42.3629,
  altitudeFt: 0,
  center,
  centerLat: 42.3629,
});
assert.ok(origin);
assert.ok(Math.abs(origin.x) < 0.01);
assert.ok(Math.abs(origin.z) < 0.01);
assert.equal(origin.y, 0);

const airborne = lonLatAltitudeToThreeOsmWorld({
  lon: -70.95,
  lat: 42.4,
  altitudeFt: 10_000,
  center,
  centerLat: 42.3629,
});
assert.ok(airborne);
assert.ok(airborne.x > 0);
assert.ok(airborne.z < 0);
assert.ok(airborne.y > 0);

const datelineCenter = lonLatToTileCoordinate(179.8, 35, 8);
const datelineNeighbor = lonLatAltitudeToThreeOsmWorld({
  lon: -179.8,
  lat: 35,
  center: datelineCenter,
  centerLat: 35,
});
assert.ok(datelineNeighbor);
assert.ok(Math.abs(datelineNeighbor.x) < 256);
assert.ok(
  Math.abs(shortestWrappedTileDelta(0.1, 255.9, 8) - 0.2) < 0.0001,
);

console.log("threeOsmProjection.test.ts ok");
