import assert from "node:assert/strict";

import {
  resolveAircraftTraceRefreshSources,
} from "./aircraftTraceRefreshModel";

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

console.log("aircraftTraceRefreshModel.test.ts ok");
