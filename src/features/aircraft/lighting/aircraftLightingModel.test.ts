import assert from "node:assert/strict";
import {
  classifyFlightPhase,
  resolveActiveLights,
  ALL_LIGHTS,
} from "./aircraftLightingModel";

// ---- classifyFlightPhase ----

assert.equal(classifyFlightPhase({ onGround: true, velocity: 0 }), "parked");
assert.equal(classifyFlightPhase({ onGround: true, velocity: 2 }), "parked");
assert.equal(classifyFlightPhase({ onGround: true, velocity: 10 }), "taxi");
assert.equal(classifyFlightPhase({ onGround: false, velocity: 150, baroAltitude: 5000 }), "climb");
assert.equal(classifyFlightPhase({ onGround: false, velocity: 450, baroAltitude: 35000 }), "cruise");
assert.equal(classifyFlightPhase({}), "parked");

// ---- ALL_LIGHTS catalogue ----

assert.deepEqual(Object.keys(ALL_LIGHTS), ["headLight"]);
assert.equal(ALL_LIGHTS.headLight.color, "white");
assert.equal(ALL_LIGHTS.headLight.blink, "steady");
assert.equal(ALL_LIGHTS.headLight.animationClass, "aircraft-light--head");

// ---- resolveActiveLights ----

const mockAnchors = {
  leftWingTip: { x: 0.04, y: 0.52 },
  rightWingTip: { x: 0.96, y: 0.52 },
  tailLight: { x: 0.5, y: 0.96 },
  topBeacon: { x: 0.5, y: 0.22 },
  bottomBeacon: { x: 0.5, y: 0.78 },
  landingLight: { x: 0.5, y: 0.1 },
  taxiLight: { x: 0.5, y: 0.06 },
  logoLight: { x: 0.5, y: 0.92 },
};

// Parked — no lights
assert.deepEqual(resolveActiveLights({ onGround: true, velocity: 0 }, mockAnchors), []);

// Taxi — one static headlight only
const taxi = resolveActiveLights({ onGround: true, velocity: 15 }, mockAnchors);
assert.deepEqual(taxi.map((l) => l.def.id), ["headLight"]);
assert.deepEqual(taxi.map((l) => [l.x, l.y]), [[0.5, 0.1]]);

// Cruise — still just one static headlight, no beacon/strobe/nav lights
const cruise = resolveActiveLights({ onGround: false, velocity: 450, baroAltitude: 35000 }, mockAnchors);
assert.deepEqual(cruise.map((l) => l.def.id), ["headLight"]);

// Climb — one static headlight only
const climb = resolveActiveLights({ onGround: false, velocity: 200, baroAltitude: 5000 }, mockAnchors);
assert.deepEqual(climb.map((l) => l.def.id), ["headLight"]);

// No anchors → empty
assert.deepEqual(resolveActiveLights({ onGround: false, velocity: 400, baroAltitude: 35000 }), []);

// Balloon family → no marker headlight
const balloonAnchors = {
  bottomBeacon: { x: 0.5, y: 0.84 },
};
const balloon = resolveActiveLights(
  { onGround: false, velocity: 0, baroAltitude: 5000 },
  balloonAnchors,
  "balloon",
);
assert.deepEqual(balloon, []);

console.log("✅ aircraftLightingModel.test.ts passed");
