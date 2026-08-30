import assert from "node:assert/strict";
import { resolveThreeOsmLabelPresentation } from "./threeOsmLabelPresentation";

assert.deepEqual(resolveThreeOsmLabelPresentation({ kind: "aircraft" }), {
  mode: "halo",
  tone: "context",
  fontSizePx: 9,
  fontWeight: 600,
  heightPx: 16,
  horizontalPaddingPx: 6,
  opacity: 0.96,
});

assert.deepEqual(
  resolveThreeOsmLabelPresentation({ kind: "aircraft", selected: true }),
  {
    mode: "sign",
    tone: "selected",
    fontSizePx: 9,
    fontWeight: 600,
    heightPx: 18,
    horizontalPaddingPx: 12,
    opacity: 1,
  },
);

assert.equal(
  resolveThreeOsmLabelPresentation({ kind: "focal-airport" }).tone,
  "focal",
);
assert.deepEqual(resolveThreeOsmLabelPresentation({ kind: "airport" }), {
  mode: "sign",
  tone: "operational",
  fontSizePx: 9,
  fontWeight: 700,
  heightPx: 16,
  horizontalPaddingPx: 8,
  opacity: 1,
});
assert.deepEqual(
  resolveThreeOsmLabelPresentation({ kind: "vector-road" }),
  {
    mode: "halo",
    tone: "semantic",
    fontSizePx: 9,
    fontWeight: 600,
    heightPx: 16,
    horizontalPaddingPx: 6,
    opacity: 0.84,
  },
);

console.log("threeOsmLabelPresentation.test.ts ok");
