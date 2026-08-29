import assert from "node:assert/strict";
import { layoutThreeOsmLabels } from "./threeOsmLabelLayout";

const placed = layoutThreeOsmLabels(
  [
    { id: "low", text: "LOW", x: 100, y: 100, width: 40, height: 18, priority: 1 },
    { id: "selected", text: "SELECTED", x: 102, y: 102, width: 70, height: 18, priority: 100 },
    { id: "edge", text: "EDGE", x: 295, y: 100, width: 50, height: 18, priority: 90 },
    { id: "free", text: "FREE", x: 180, y: 160, width: 50, height: 18, priority: 10 },
  ],
  { viewportWidth: 320, viewportHeight: 200 },
);

assert.deepEqual(
  placed.map((item) => item.id),
  ["selected", "free"],
);

const capped = layoutThreeOsmLabels(
  [
    { id: "one", text: "ONE", x: 20, y: 80, width: 30, height: 16, priority: 2 },
    { id: "two", text: "TWO", x: 120, y: 80, width: 30, height: 16, priority: 1 },
  ],
  { viewportWidth: 240, viewportHeight: 140, maxLabels: 1 },
);
assert.equal(capped.length, 1);
assert.equal(capped[0].id, "one");

console.log("threeOsmLabelLayout.test.ts ok");
