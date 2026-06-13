import assert from "node:assert/strict";
import { resolveRealtimeStatusLabel } from "./realtimeStatusModel";

assert.equal(
  resolveRealtimeStatusLabel({
    available: true,
    connectionState: "connecting",
    settled: false,
  }),
  "CONNECTING",
);
assert.equal(
  resolveRealtimeStatusLabel({
    available: true,
    connectionState: "closed",
    settled: true,
  }),
  "RECONNECTING",
);
assert.equal(
  resolveRealtimeStatusLabel({
    available: true,
    connectionState: "open",
    settled: true,
  }),
  "",
);
assert.equal(
  resolveRealtimeStatusLabel({
    available: false,
    connectionState: "closed",
    settled: true,
  }),
  "",
);

console.log("realtimeStatusModel.test.ts ok");
