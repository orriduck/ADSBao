import assert from "node:assert/strict";

import {
  getNextZoomValue,
  resolveZoomOption,
} from "./mapControlModel.js";

const options = [
  { value: 10, title: "Approach" },
  { value: 13, title: "Airport" },
  { value: 14, title: "Detail" },
];

assert.deepEqual(resolveZoomOption(10, options), options[0]);
assert.deepEqual(resolveZoomOption(999, options), options[1]);
assert.equal(getNextZoomValue(10, options), 13);
assert.equal(getNextZoomValue(13, options), 14);
assert.equal(getNextZoomValue(14, options), 10);
assert.equal(getNextZoomValue(999, options), 10);
