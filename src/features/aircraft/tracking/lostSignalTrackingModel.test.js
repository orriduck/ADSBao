import assert from "node:assert/strict";

import { getLostSignalTraceRefreshKey } from "./lostSignalTrackingModel.js";

assert.equal(
  getLostSignalTraceRefreshKey({ lostSignal: false, pollVersion: 12 }),
  "",
);

assert.equal(
  getLostSignalTraceRefreshKey({ lostSignal: true, pollVersion: 12 }),
  "lost-signal:12",
);

assert.equal(
  getLostSignalTraceRefreshKey({ lostSignal: true, pollVersion: 13 }),
  "lost-signal:13",
);

assert.equal(
  getLostSignalTraceRefreshKey({ lostSignal: true, pollVersion: 0 }),
  "",
);

console.log("lostSignalTrackingModel.test.js ok");
