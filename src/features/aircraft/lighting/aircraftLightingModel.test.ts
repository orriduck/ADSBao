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

// Navigation lights
assert.equal(ALL_LIGHTS.navLeft.color, "red");
assert.equal(ALL_LIGHTS.navRight.color, "green");
assert.equal(ALL_LIGHTS.navTail.color, "white");
assert.equal(ALL_LIGHTS.navTail.blink, "steady");

// Anti-collision
assert.equal(ALL_LIGHTS.beaconTop.color, "red");
assert.equal(ALL_LIGHTS.beaconTop.blink, "beacon");
assert.equal(ALL_LIGHTS.beaconBottom.color, "red");
assert.equal(ALL_LIGHTS.beaconBottom.blink, "beacon");

// Strobes
assert.equal(ALL_LIGHTS.strobeLeft.color, "white");
assert.equal(ALL_LIGHTS.strobeLeft.blink, "strobe");
assert.equal(ALL_LIGHTS.strobeRight.color, "white");
assert.equal(ALL_LIGHTS.strobeRight.blink, "strobe");

// Landing / taxi
assert.equal(ALL_LIGHTS.landingLight.color, "white");
assert.equal(ALL_LIGHTS.landingLight.blink, "steady");
assert.equal(ALL_LIGHTS.taxiLight.color, "white");
assert.equal(ALL_LIGHTS.taxiLight.blink, "steady");

// Logo
assert.equal(ALL_LIGHTS.logoLight.color, "white");
assert.equal(ALL_LIGHTS.logoLight.blink, "steady");

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

// Taxi — nav + beacon + taxi
const taxi = resolveActiveLights({ onGround: true, velocity: 15 }, mockAnchors);
const taxiIds = new Set(taxi.map((l) => l.def.id));
assert.ok(taxiIds.has("navLeft"));
assert.ok(taxiIds.has("navRight"));
assert.ok(taxiIds.has("navTail"));
assert.ok(taxiIds.has("beaconTop"));
assert.ok(taxiIds.has("beaconBottom"));
assert.ok(taxiIds.has("taxiLight"));
assert.ok(!taxiIds.has("strobeLeft"), "strobes should be OFF during taxi");
assert.ok(!taxiIds.has("landingLight"), "landing light should be OFF during taxi");

// Cruise — nav + beacon + strobes, NO landing/taxi
const cruise = resolveActiveLights({ onGround: false, velocity: 450, baroAltitude: 35000 }, mockAnchors);
const cruiseIds = new Set(cruise.map((l) => l.def.id));
assert.ok(cruiseIds.has("navLeft"));
assert.ok(cruiseIds.has("strobeLeft"));
assert.ok(cruiseIds.has("strobeRight"));
assert.ok(cruiseIds.has("beaconTop"));
assert.ok(cruiseIds.has("beaconBottom"));
assert.ok(!cruiseIds.has("landingLight"), "landing light should be OFF during cruise");
assert.ok(!cruiseIds.has("taxiLight"), "taxi light should be OFF during cruise");

// Climb — nav + beacon + strobes + landing
const climb = resolveActiveLights({ onGround: false, velocity: 200, baroAltitude: 5000 }, mockAnchors);
const climbIds = new Set(climb.map((l) => l.def.id));
assert.ok(climbIds.has("landingLight"), "landing light should be ON during climb");

// No anchors → empty
assert.deepEqual(resolveActiveLights({ onGround: false, velocity: 400, baroAltitude: 35000 }), []);

// Balloon family → no strobes, no landing
const balloonAnchors = {
  bottomBeacon: { x: 0.5, y: 0.84 },
};
const balloon = resolveActiveLights(
  { onGround: false, velocity: 0, baroAltitude: 5000 },
  balloonAnchors,
  "balloon",
);
const balloonIds = new Set(balloon.map((l) => l.def.id));
assert.ok(!balloonIds.has("strobeLeft"), "balloons have no wingtip strobes");
assert.ok(!balloonIds.has("landingLight"), "balloons have no landing lights");

console.log("✅ aircraftLightingModel.test.ts passed");
