import assert from "node:assert/strict";
import { selectThreeOsmDebugContextTargets } from "./threeOsmContextInteraction";

const targets = [
  ...Array.from({ length: 10 }, (_, index) => ({
    key: `airport:${index}`,
    kind: "airport" as const,
  })),
  { key: "navaid:BOS", kind: "navaid" as const },
  { key: "reporting:ALLY-PALLY", kind: "reporting" as const },
  { key: "spot:castle-island", kind: "spot" as const },
];

assert.deepEqual(
  selectThreeOsmDebugContextTargets(targets).map((target) => target.key),
  [
    "airport:0",
    "navaid:BOS",
    "reporting:ALLY-PALLY",
    "spot:castle-island",
    "airport:1",
    "airport:2",
    "airport:3",
    "airport:4",
  ],
);
assert.deepEqual(selectThreeOsmDebugContextTargets(targets, 0), []);
assert.deepEqual(
  selectThreeOsmDebugContextTargets(targets.slice(0, 2), 8),
  targets.slice(0, 2),
);

console.log("threeOsmContextInteraction.test.ts ok");
