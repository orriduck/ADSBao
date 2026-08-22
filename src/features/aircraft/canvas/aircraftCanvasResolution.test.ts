import assert from "node:assert/strict";

import { resolveAircraftCanvasDpr } from "./aircraftCanvasResolution";

assert.equal(resolveAircraftCanvasDpr(undefined), 1);
assert.equal(resolveAircraftCanvasDpr(0), 1);
assert.equal(resolveAircraftCanvasDpr(1), 1);
assert.equal(resolveAircraftCanvasDpr(2), 2);
assert.equal(resolveAircraftCanvasDpr(3), 3);
assert.equal(resolveAircraftCanvasDpr(4), 3);

console.log("aircraftCanvasResolution.test.ts ok");
