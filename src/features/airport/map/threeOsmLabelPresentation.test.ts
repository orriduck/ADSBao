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
assert.equal(
  resolveThreeOsmLabelPresentation({ kind: "airport" }).tone,
  "operational",
);
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
