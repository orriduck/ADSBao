import assert from "node:assert/strict";

import {
  angularDistance,
  interpolateGreatCircle,
} from "./greatCircle.js";

// --- angularDistance --------------------------------------------------

// Same point → zero.
assert.equal(angularDistance(40, -73, 40, -73), 0);

// A degree of latitude is one radian / 90, so the angular distance
// between (0,0) and (1,0) should be (1° in radians) = π/180.
const oneDeg = angularDistance(0, 0, 1, 0);
assert.ok(Math.abs(oneDeg - Math.PI / 180) < 1e-9);

// --- interpolateGreatCircle -------------------------------------------

// Invalid input → empty array.
assert.deepEqual(interpolateGreatCircle(NaN, 0, 1, 1), []);
assert.deepEqual(interpolateGreatCircle(0, 0, 0, 0), []);

// 65 samples (steps + 1) when given steps = 64.
const arc = interpolateGreatCircle(40, -73, 51, 0, 64);
assert.equal(arc.length, 65);
// First and last points equal the start and end exactly.
assert.deepEqual(arc[0], [40, -73]);
const tail = arc[arc.length - 1];
assert.ok(Math.abs(tail[0] - 51) < 1e-9);
assert.ok(Math.abs(tail[1]) < 1e-9);

// JFK (40.6413, -73.7781) → LHR (51.4700, -0.4543). The midpoint of a
// great circle bows north relative to the straight Mercator line; assert
// the middle sample's latitude is meaningfully higher than the linear
// midpoint to confirm we're doing slerp, not lerp.
const transatlantic = interpolateGreatCircle(
  40.6413,
  -73.7781,
  51.47,
  -0.4543,
  32,
);
const mid = transatlantic[Math.floor(transatlantic.length / 2)];
const linearMidLat = (40.6413 + 51.47) / 2;
assert.ok(
  mid[0] - linearMidLat > 1.5,
  `expected great-circle midpoint to bow north, got lat=${mid[0]} vs linear ${linearMidLat}`,
);

console.log("greatCircle utility tests passed");
