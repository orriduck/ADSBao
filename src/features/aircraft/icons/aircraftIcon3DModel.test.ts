import assert from "node:assert/strict";

import {
  resolveAircraft3DLightingProfile,
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
