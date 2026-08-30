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

const partial = resolveThreeOsmRasterComposition({
  ...baseInput,
  vectorState: "partial",
});
assert.equal(partial.mode, "context-underlay");
assert.equal(partial.washStrength, 0.78);
assert.equal(
  resolveThreeOsmRasterTileComposition(partial, false).washStrength,
  0.78 * 0.28,
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
const regional = resolveThreeOsmRasterComposition({ ...baseInput, zoom: 11 });
assert.equal(regional.mode, "transition");
assert.equal(regional.washStrength, 0.92 * 0.78);

const approach = resolveThreeOsmRasterComposition({ ...baseInput, zoom: 12 });
assert.equal(approach.mode, "transition");
assert.equal(approach.washStrength, 0.96 * 0.78);

const transition = resolveThreeOsmRasterComposition({
  ...baseInput,
  zoom: 13,
});
assert.equal(transition.mode, "transition");
assert.equal(transition.washStrength, 0.95 * 0.78);

const lightUnderlay = resolveThreeOsmRasterComposition(baseInput);
assert.equal(lightUnderlay.mode, "context-underlay");
assert.equal(lightUnderlay.washStrength, 0.78);
const darkUnderlay = resolveThreeOsmRasterComposition({
  ...baseInput,
  theme: "dark",
});
assert.equal(darkUnderlay.washStrength, 0.94);
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
