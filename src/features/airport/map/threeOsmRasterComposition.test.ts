import assert from "node:assert/strict";
import * as THREE from "three";
import {
  applyThreeOsmRasterComposition,
  resolveThreeOsmRasterComposition,
  resolveThreeOsmRasterTileComposition,
} from "./threeOsmRasterComposition";

const baseInput = {
  vectorEnabled: true,
  vectorState: "ready" as const,
  zoom: 14,
  layerMode: "all" as const,
  theme: "light",
  contrastMode: "standard" as const,
  background: 0xd8d8d5,
};

assert.deepEqual(
  resolveThreeOsmRasterComposition({
    ...baseInput,
    vectorState: "partial",
  }),
  { mode: "primary", washColor: 0xd8d8d5, washStrength: 0 },
);
assert.equal(
  resolveThreeOsmRasterComposition({
    ...baseInput,
    layerMode: "basemap",
  }).washStrength,
  0,
);
assert.equal(
  resolveThreeOsmRasterComposition({
    ...baseInput,
    contrastMode: "more",
  }).washStrength,
  0,
);
assert.equal(
  resolveThreeOsmRasterComposition({ ...baseInput, zoom: 11 }).mode,
  "primary",
);

const transition = resolveThreeOsmRasterComposition({
  ...baseInput,
  zoom: 13,
});
assert.equal(transition.mode, "transition");
assert.ok(transition.washStrength > 0.5 && transition.washStrength < 0.7);

const lightUnderlay = resolveThreeOsmRasterComposition(baseInput);
assert.equal(lightUnderlay.mode, "context-underlay");
assert.equal(lightUnderlay.washStrength, 0.78);
const darkUnderlay = resolveThreeOsmRasterComposition({
  ...baseInput,
  theme: "dark",
});
assert.equal(darkUnderlay.washStrength, 0.72);
assert.equal(
  resolveThreeOsmRasterTileComposition(lightUnderlay, true),
  lightUnderlay,
);
assert.equal(
  resolveThreeOsmRasterTileComposition(lightUnderlay, false).washStrength,
  0.78 * 0.28,
);

const material = new THREE.MeshBasicMaterial();
applyThreeOsmRasterComposition(material, lightUnderlay);
const uniforms = material.userData.threeOsmRasterCompositionUniforms;
assert.equal(uniforms.washStrength.value, 0.78);
const shader = {
  uniforms: {} as Record<string, unknown>,
  fragmentShader: "#include <common>\n#include <map_fragment>",
};
material.onBeforeCompile(shader as never, {} as never);
assert.match(shader.fragmentShader, /threeOsmRasterWashStrength/);
assert.equal(
  shader.uniforms.threeOsmRasterWashStrength,
  uniforms.washStrength,
);
applyThreeOsmRasterComposition(material, {
  mode: "primary",
  washColor: 0x101111,
  washStrength: 0,
});
assert.equal(uniforms.washStrength.value, 0);
assert.equal(uniforms.washColor.value.getHex(), 0x101111);
material.dispose();

console.log("threeOsmRasterComposition.test.ts ok");
