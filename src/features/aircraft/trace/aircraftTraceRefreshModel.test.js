import assert from "node:assert/strict";

import {
  resolveAircraftTraceRefreshSources,
} from "./aircraftTraceRefreshModel.js";

assert.deepEqual(
  resolveAircraftTraceRefreshSources({
    refreshKey: "",
    fullTrace: true,
  }),
  [],
);

assert.deepEqual(
  resolveAircraftTraceRefreshSources({
    refreshKey: "visibility:1",
    fullTrace: false,
  }),
  [
    { source: "recent", full: false },
  ],
);

assert.deepEqual(
  resolveAircraftTraceRefreshSources({
    refreshKey: "visibility:1",
    fullTrace: true,
  }),
  [
    { source: "recent", full: false },
    { source: "full", full: true },
  ],
);

console.log("aircraftTraceRefreshModel.test.js ok");
