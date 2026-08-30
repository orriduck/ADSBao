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

const blocked = layoutThreeOsmLabels(
  [
    { id: "blocker", text: "BLOCK", x: 100, y: 100, width: 60, height: 18, priority: 10 },
  ],
  { viewportWidth: 240, viewportHeight: 180 },
);
const placedAroundBlocked = layoutThreeOsmLabels(
  [
    { id: "candidate", text: "NEXT", x: 100, y: 100, width: 60, height: 18, priority: 10 },
  ],
  { viewportWidth: 240, viewportHeight: 180, blocked },
);
assert.equal(placedAroundBlocked.length, 1);
assert.notEqual(placedAroundBlocked[0].placement, blocked[0].placement);
assert.ok(
  placedAroundBlocked[0].right <= blocked[0].left ||
    placedAroundBlocked[0].left >= blocked[0].right ||
    placedAroundBlocked[0].bottom <= blocked[0].top ||
    placedAroundBlocked[0].top >= blocked[0].bottom,
);

const edgePinned = layoutThreeOsmLabels(
  [
    {
      id: "pinned",
      text: "PINNED",
      x: 120,
      y: 8,
      width: 48,
      height: 18,
      priority: 10,
      pinToViewport: true,
    },
  ],
  { viewportWidth: 240, viewportHeight: 160, reservedTop: 40 },
);
assert.equal(edgePinned.length, 1);
assert.equal(edgePinned[0].placement, "edge");
assert.equal(edgePinned[0].top, 40);

const pinnedAroundPanel = layoutThreeOsmLabels(
  [
    {
      id: "panel-candidate",
      text: "AIRSPACE",
      x: 120,
      y: 180,
      width: 100,
      height: 18,
      priority: 10,
      pinToViewport: true,
    },
  ],
  {
    viewportWidth: 390,
    viewportHeight: 844,
    reservedTop: 92,
    reservedBottom: 64,
    blocked: [
      {
        id: "panel",
        text: "",
        x: 0,
        y: 0,
        width: 250,
        height: 205,
        priority: 100,
        left: 9,
        top: 9,
        right: 267,
        bottom: 222,
        placement: "edge",
      },
    ],
  },
);
assert.equal(pinnedAroundPanel.length, 1);
assert.ok(pinnedAroundPanel[0].top >= 227);

console.log("threeOsmLabelLayout.test.ts ok");
