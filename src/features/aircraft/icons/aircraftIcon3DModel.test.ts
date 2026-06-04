import assert from "node:assert/strict";

import {
  resolveAircraft3DAttitudeRotation,
  resolveAircraft3DLightingProfile,
  resolveAircraft3DMaterialProfile,
  resolveAircraft3DModelScalePx,
  shouldRenderAircraft3DOverlay,
  shouldRenderAircraftContrail,
} from "./aircraftIcon3DModel";

assert.equal(
  shouldRenderAircraft3DOverlay({ immersiveModeActive: true }),
  true,
);
assert.equal(
  shouldRenderAircraft3DOverlay({ immersiveModeActive: false }),
  false,
);

assert.equal(
  shouldRenderAircraftContrail({
    immersiveModeActive: true,
    altitude: 39_000,
    velocity: 460,
  }),
  true,
);
assert.equal(
  shouldRenderAircraftContrail({
    immersiveModeActive: true,
    altitude: 24_000,
    velocity: 460,
  }),
  false,
);
assert.equal(
  shouldRenderAircraftContrail({
    immersiveModeActive: true,
    altitude: 39_000,
    velocity: 180,
  }),
  false,
);
assert.equal(
  shouldRenderAircraftContrail({
    immersiveModeActive: false,
    altitude: 39_000,
    velocity: 460,
  }),
  false,
);

const nightLighting = resolveAircraft3DLightingProfile({ phase: "night" });
const duskLighting = resolveAircraft3DLightingProfile({ phase: "dusk" });
const dayLighting = resolveAircraft3DLightingProfile({ phase: "day" });

assert.equal(nightLighting.navLightsVisible, true);
assert.ok(nightLighting.navLightIntensity > duskLighting.navLightIntensity);
assert.ok(duskLighting.navLightIntensity > dayLighting.navLightIntensity);
assert.ok(dayLighting.keyLightIntensity > nightLighting.keyLightIntensity);

assert.equal(
  resolveAircraft3DModelScalePx({
    altitude: 42_000,
    family: "jet",
    selected: true,
    sizeScale: 1,
  }),
  18,
);
assert.equal(resolveAircraft3DModelScalePx({ sizeScale: 1.1 }), 19.8);
assert.ok(
  resolveAircraft3DModelScalePx({ family: "propeller", sizeScale: 0.95 }) < 16,
);
assert.ok(
  resolveAircraft3DModelScalePx({ family: "propeller", sizeScale: 0.9 }) <
    resolveAircraft3DModelScalePx({ family: "jet", sizeScale: 1.05 }),
);

const dayMaterial = resolveAircraft3DMaterialProfile({ phase: "day" });
const sunsetMaterial = resolveAircraft3DMaterialProfile({ phase: "sunset" });
const nightMaterial = resolveAircraft3DMaterialProfile({ phase: "night" });
assert.notEqual(dayMaterial.color, sunsetMaterial.color);
assert.notEqual(sunsetMaterial.color, nightMaterial.color);
assert.ok(nightMaterial.emissiveIntensity > dayMaterial.emissiveIntensity);
assert.ok(nightMaterial.bodyGlowOpacity <= 0.08);
assert.ok(nightMaterial.lightGlowScale <= 6);

const levelRotation = resolveAircraft3DAttitudeRotation({ phase: "day" });
const rightBankRotation = resolveAircraft3DAttitudeRotation({
  phase: "day",
  pitch: 6,
  roll: 24,
});
const leftBankRotation = resolveAircraft3DAttitudeRotation({
  phase: "day",
  roll: -24,
});
assert.ok(rightBankRotation.rotationYDeg > levelRotation.rotationYDeg);
assert.ok(leftBankRotation.rotationYDeg < levelRotation.rotationYDeg);
assert.ok(rightBankRotation.rotationXDeg < levelRotation.rotationXDeg);
