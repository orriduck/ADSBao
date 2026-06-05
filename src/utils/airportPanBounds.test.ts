import assert from "node:assert/strict";

import {
  APPROACH_PAN_RADIUS_NM,
  computeApproachPanBounds,
} from "./airportPanBounds";

const NM_PER_DEGREE_LAT = 60;

// KBOS — 42.36°N, 71.01°W
const bos = computeApproachPanBounds(42.36, -71.01);
assert.ok(bos, "expected bounds for KBOS");
const [[south, west], [north, east]] = bos!;
const expectedLatDelta = APPROACH_PAN_RADIUS_NM / NM_PER_DEGREE_LAT;
assert.ok(Math.abs((north - south) / 2 - expectedLatDelta) < 1e-9, "lat half-span matches radius");
assert.ok(west < -71.01 && east > -71.01, "longitude box brackets the airport");
const lonHalfSpan = (east - west) / 2;
// at 42°N, cos(42) ≈ 0.743, so lon delta should be ~ latDelta / 0.743
const expectedLonHalfSpan = expectedLatDelta / Math.cos((42.36 * Math.PI) / 180);
assert.ok(Math.abs(lonHalfSpan - expectedLonHalfSpan) < 1e-9, "lon half-span widens by cos(lat)");

// Invalid inputs return null instead of throwing.
assert.equal(computeApproachPanBounds(Number.NaN, 0), null);
assert.equal(computeApproachPanBounds(0, Number.POSITIVE_INFINITY), null);
assert.equal(computeApproachPanBounds(0, 0, 0), null);
assert.equal(computeApproachPanBounds(0, 0, -5), null);

// Polar-ish airport still produces a wide-but-finite box.
const polar = computeApproachPanBounds(89.5, 0);
assert.ok(polar, "expected bounds near pole");
const [, [polarN]] = polar!;
assert.ok(Number.isFinite(polarN), "polar latitude box is finite");

console.log("airportPanBounds.test.ts ok");
