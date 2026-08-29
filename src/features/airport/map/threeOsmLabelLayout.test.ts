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
  ["selected", "edge", "free", "low"],
);
for (const [index, item] of placed.entries()) {
  assert.ok(item.left >= 4 && item.right <= 316);
  assert.ok(item.top >= 4 && item.bottom <= 196);
  for (const other of placed.slice(index + 1)) {
    assert.ok(
      item.right <= other.left ||
        item.left >= other.right ||
        item.bottom <= other.top ||
        item.top >= other.bottom,
    );
  }
}

const capped = layoutThreeOsmLabels(
  [
    { id: "one", text: "ONE", x: 20, y: 80, width: 30, height: 16, priority: 2 },
    { id: "two", text: "TWO", x: 120, y: 80, width: 30, height: 16, priority: 1 },
  ],
  { viewportWidth: 240, viewportHeight: 140, maxLabels: 1 },
);
assert.equal(capped.length, 1);
assert.equal(capped[0].id, "one");

const edgeAware = layoutThreeOsmLabels(
  [
    { id: "right-edge", text: "RIGHT", x: 236, y: 80, width: 48, height: 18, priority: 4 },
    { id: "top-edge", text: "TOP", x: 90, y: 42, width: 30, height: 18, priority: 3 },
    { id: "collision", text: "COLLISION", x: 116, y: 95, width: 68, height: 18, priority: 2 },
  ],
  { viewportWidth: 240, viewportHeight: 160, reservedTop: 40 },
);
assert.deepEqual(
  edgeAware.map((item) => item.id),
  ["right-edge", "top-edge", "collision"],
);
assert.ok(edgeAware.find((item) => item.id === "right-edge")!.right <= 236);
assert.ok(edgeAware.find((item) => item.id === "top-edge")!.top >= 40);
assert.equal(edgeAware.find((item) => item.id === "right-edge")!.placement, "top-left");
assert.equal(edgeAware.find((item) => item.id === "top-edge")!.placement, "bottom-right");
for (const [index, item] of edgeAware.entries()) {
  assert.ok(item.left >= 4 && item.right <= 236);
  assert.ok(item.top >= 40 && item.bottom <= 156);
  for (const other of edgeAware.slice(index + 1)) {
    assert.ok(
      item.right <= other.left ||
        item.left >= other.right ||
        item.bottom <= other.top ||
        item.top >= other.bottom,
    );
  }
}

console.log("threeOsmLabelLayout.test.ts ok");
