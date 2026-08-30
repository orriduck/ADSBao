import assert from "node:assert/strict";
import { resolveThreeOsmOperationalProminence } from "./threeOsmOperationalProminence";

const standard = resolveThreeOsmOperationalProminence("standard");
assert.ok(standard.runwaySurface < 1);
assert.ok(standard.runwayLightWhite < standard.runwaySurface);
assert.ok(standard.approachLine < standard.runwaySurface);

for (const mode of ["more", "forced"] as const) {
  const elevated = resolveThreeOsmOperationalProminence(mode);
  assert.ok(Object.values(elevated).every((value) => value === 1));
}

console.log("threeOsmOperationalProminence.test.ts ok");
