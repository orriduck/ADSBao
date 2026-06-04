import assert from "node:assert/strict";

import {
  resolveAircraft3DAttitudeRotation,
  resolveAircraft3DLightingProfile,
  resolveAircraft3DMaterialProfile,
  resolveAircraft3DModelScalePx,
  resolveAircraft3DEdgeTone,
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
assert.equal(nightLighting.landingLightsVisible, true);
assert.ok(nightLighting.navLightIntensity > duskLighting.navLightIntensity);
assert.ok(duskLighting.navLightIntensity > dayLighting.navLightIntensity);
assert.ok(dayLighting.keyLightIntensity > nightLighting.keyLightIntensity);
assert.ok(nightLighting.rimLightIntensity < duskLighting.rimLightIntensity);
assert.ok(nightLighting.shadowOpacity < duskLighting.shadowOpacity);
assert.ok(nightLighting.shadowOpacity <= 0.12);

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
const duskMaterial = resolveAircraft3DMaterialProfile({ phase: "dusk" });
const nightMaterial = resolveAircraft3DMaterialProfile({ phase: "night" });
assert.notEqual(dayMaterial.color, sunsetMaterial.color);
assert.notEqual(sunsetMaterial.color, nightMaterial.color);
assert.ok(nightMaterial.emissiveIntensity > dayMaterial.emissiveIntensity);
assert.ok(nightMaterial.bodyGlowOpacity <= 0.08);
assert.ok(nightMaterial.lightGlowScale > duskMaterial.lightGlowScale);
assert.ok(nightMaterial.lightGlowScale >= 8);
assert.ok(nightMaterial.lightRadius >= duskMaterial.lightRadius * 1.5);
assert.ok(nightMaterial.landingLightScale >= duskMaterial.landingLightScale * 2);
assert.ok(relativeLuminance(dayMaterial.color) > 0.8);
assert.ok(relativeLuminance(sunsetMaterial.color) > 0.74);
assert.ok(relativeLuminance(duskMaterial.color) > 0.7);
assert.ok(dayMaterial.edgeOpacity <= 0.16);
assert.ok(sunsetMaterial.edgeOpacity <= 0.2);
assert.ok(nightMaterial.edgeOpacity <= 0.22);
assert.ok(nightMaterial.landingLightOpacity >= 0.72);
assert.ok(sunsetMaterial.landingLightOpacity >= 0.3);
assert.ok(dayMaterial.landingLightOpacity <= 0.18);

const dayShadowEdge = resolveAircraft3DEdgeTone({
  phase: "day",
  lightDot: -0.9,
});
const dayLitEdge = resolveAircraft3DEdgeTone({
  phase: "day",
  lightDot: 0.9,
});
const sunsetShadowEdge = resolveAircraft3DEdgeTone({
  phase: "sunset",
  lightDot: -0.8,
});
const sunsetLitEdge = resolveAircraft3DEdgeTone({
  phase: "sunset",
  lightDot: 0.8,
});
const nightShadowEdge = resolveAircraft3DEdgeTone({
  phase: "night",
  lightDot: -0.9,
});
const nightLitEdge = resolveAircraft3DEdgeTone({
  phase: "night",
  lightDot: 0.9,
});
assert.ok(relativeLuminance(dayLitEdge.color) > relativeLuminance(dayShadowEdge.color));
assert.ok(dayLitEdge.opacity > dayShadowEdge.opacity);
assert.ok(
  relativeLuminance(sunsetLitEdge.color) >
    relativeLuminance(sunsetShadowEdge.color),
);
assert.ok(sunsetLitEdge.opacity > sunsetShadowEdge.opacity);
assert.ok(
  relativeLuminance(nightLitEdge.color) >
    relativeLuminance(nightShadowEdge.color),
);
assert.ok(nightLitEdge.opacity <= 0.16);
assert.ok(nightShadowEdge.opacity < nightLitEdge.opacity);

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

function relativeLuminance(hex: string) {
  const normalized = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((start) =>
    Number.parseInt(normalized.slice(start, start + 2), 16) / 255,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
