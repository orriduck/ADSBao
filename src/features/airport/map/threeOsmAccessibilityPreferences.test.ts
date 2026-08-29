import assert from "node:assert/strict";
import {
  cssColorToHexNumber,
  parseThreeOsmAccessibilityDebugOverrides,
  resolveThreeOsmAccessibilityPreferences,
  resolveThreeOsmVisualPalette,
} from "./threeOsmAccessibilityPreferences";

assert.deepEqual(
  resolveThreeOsmAccessibilityPreferences({
    media: {
      reducedMotion: true,
      moreContrast: false,
      forcedColors: true,
    },
  }),
  { reducedMotion: true, contrastMode: "forced" },
);

assert.deepEqual(
  resolveThreeOsmAccessibilityPreferences({
    media: {
      reducedMotion: false,
      moreContrast: false,
      forcedColors: false,
    },
    debugEnabled: true,
    debugOverrides: { motion: "reduce", contrast: "more" },
  }),
  { reducedMotion: true, contrastMode: "more" },
);

assert.deepEqual(
  parseThreeOsmAccessibilityDebugOverrides(
    new URLSearchParams("threeOsmMotion=reduce&threeOsmContrast=forced"),
  ),
  { motion: "reduce", contrast: "forced" },
);

const standardDark = resolveThreeOsmVisualPalette({
  theme: "dark",
  contrastMode: "standard",
});
assert.equal(standardDark.background, 0x101111);
assert.equal(standardDark.focalAirport, 0xf5c542);
assert.equal(standardDark.runwayLightAmber, 0xffc23d);
assert.equal(standardDark.taxiwayLightBlue, 0x3f86ff);
assert.equal(standardDark.label.borderWidth, 1);
assert.equal(standardDark.label.contextBackground, "rgba(0,0,0,.74)");

const forcedLight = resolveThreeOsmVisualPalette({
  theme: "light",
  contrastMode: "forced",
});
assert.equal(forcedLight.background, 0xffffff);
assert.equal(forcedLight.foreground, 0x000000);
assert.equal(forcedLight.aircraft, 0x000000);
assert.equal(forcedLight.aircraftHalo, 0xffffff);
assert.equal(forcedLight.focalAirport, 0x000000);
assert.equal(forcedLight.label.background, "#ffffff");
assert.equal(forcedLight.label.text, "#000000");
assert.equal(forcedLight.label.borderWidth, 2);

const forcedSystem = resolveThreeOsmVisualPalette({
  theme: "dark",
  contrastMode: "forced",
  systemColors: {
    canvas: "rgb(12, 34, 56)",
    canvasText: "rgb(240, 241, 242)",
    highlight: "rgb(90, 120, 240)",
    highlightText: "rgb(255, 255, 255)",
  },
});
assert.equal(forcedSystem.background, 0x0c2238);
assert.equal(forcedSystem.aircraft, 0xf0f1f2);
assert.equal(forcedSystem.selectedAircraft, 0x5a78f0);
assert.equal(forcedSystem.label.selectedBackground, "rgb(90, 120, 240)");
assert.equal(cssColorToHexNumber("#123456", 0), 0x123456);
assert.equal(cssColorToHexNumber("CanvasText", 0xabcdef), 0xabcdef);

console.log("threeOsmAccessibilityPreferences.test.ts ok");
