import assert from "node:assert/strict";

import { isImmersiveNightLightingActive } from "./immersiveLightingModel";

assert.equal(
  isImmersiveNightLightingActive({ localMinutes: 20 * 60 + 59 }),
  false,
);
assert.equal(
  isImmersiveNightLightingActive({ localMinutes: 21 * 60 }),
  true,
);
assert.equal(
  isImmersiveNightLightingActive({ localMinutes: 4 * 60 + 59 }),
  true,
);
assert.equal(
  isImmersiveNightLightingActive({ localMinutes: 5 * 60 }),
  false,
);
assert.equal(
  isImmersiveNightLightingActive({ localMinutes: null, phase: "night" }),
  true,
);
assert.equal(
  isImmersiveNightLightingActive({ localMinutes: null, phase: "dusk" }),
  false,
);

console.log("immersiveLightingModel.test.ts ok");
