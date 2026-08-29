import assert from "node:assert/strict";
import {
  buildOsmRasterTileUrl,
  buildThreeOsmTileGridBounds,
  buildVisibleTileGrid,
  clampThreeOsmZoom,
  lonLatAltitudeToThreeOsmWorld,
  lonLatToTileCoordinate,
} from "./threeOsmProjection";

const center = lonLatToTileCoordinate(-71.0064, 42.3629, 10);

assert.equal(clampThreeOsmZoom(99), 16);
assert.equal(clampThreeOsmZoom(1), 3);
assert.equal(center.z, 10);

const grid = buildVisibleTileGrid(center, 2);
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

console.log("threeOsmProjection.test.ts ok");
