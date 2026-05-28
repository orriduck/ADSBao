import assert from "node:assert/strict";
import test from "node:test";

import { getNextEntityFilter } from "./aircraftFilters.js";

test("cycles entity filter from all to aircraft to airports and back", () => {
  assert.equal(getNextEntityFilter("all"), "aircraft");
  assert.equal(getNextEntityFilter("aircraft"), "airports");
  assert.equal(getNextEntityFilter("airports"), "all");
});

test("falls back to all after an unknown entity filter value", () => {
  assert.equal(getNextEntityFilter("stale"), "all");
});
