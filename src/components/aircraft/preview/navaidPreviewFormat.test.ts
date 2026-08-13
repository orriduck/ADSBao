import assert from "node:assert/strict";

import {
  formatNavaidFrequency,
  formatNavaidType,
  formatNavaidVariation,
} from "./navaidPreviewFormat";

assert.equal(formatNavaidType(0), "DME");
assert.equal(formatNavaidType("4"), "VOR-DME");
assert.equal(formatNavaidType("ndb"), "NDB");
assert.equal(formatNavaidType(99), "");
assert.equal(formatNavaidFrequency(112700), "112.7 MHz");
assert.equal(formatNavaidFrequency(112000), "112 MHz");
assert.equal(formatNavaidFrequency(402), "402 kHz");
assert.equal(formatNavaidVariation(7), "7°E");
assert.equal(formatNavaidVariation(-14.5), "14.5°W");

console.log("navaidPreviewFormat.test.ts ok");
