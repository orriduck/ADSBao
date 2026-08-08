import assert from "node:assert/strict";
import { resolveRealtimeStatusLabel } from "./realtimeStatusModel";

assert.equal(
  resolveRealtimeStatusLabel({
    available: true,
    connectionState: "loading",
    settled: false,
  }),
  "CONNECTING",
);
assert.equal(
  resolveRealtimeStatusLabel({
    available: true,
    connectionState: "reconnecting",
    settled: true,
  }),
  "RECONNECTING",
);
assert.equal(
  resolveRealtimeStatusLabel({
    available: true,
    connectionState: "live",
    settled: true,
  }),
  "",
);
assert.equal(
  resolveRealtimeStatusLabel({
    available: false,
    connectionState: "reconnecting",
    settled: true,
  }),
  "",
);

console.log("realtimeStatusModel.test.ts ok");
