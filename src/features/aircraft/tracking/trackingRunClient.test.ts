import assert from "node:assert/strict";

import {
  bootstrapTrackingRun,
  mergeTrackingObservations,
  readTrackingRunDelta,
} from "./trackingRunClient";

const run = { id: "run-one", status: "active" };
const calls: Array<{ url: string; method: string }> = [];
let responses: unknown[] = [];

globalThis.fetch = (async (input, init) => {
  calls.push({ url: String(input), method: init?.method || "GET" });
  const body = responses.shift();
  return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
}) as typeof fetch;

responses = [
  { run },
  {
    run,
    observations: [{ id: "obs-1", receivedAt: "2026-08-27T21:00:00.000Z", aircraft: { hex: "a1" } }],
    observationCursor: "cursor-1",
    observationsHasMore: false,
  },
  {
    run,
    observations: [{ id: "obs-2", receivedAt: "2026-08-27T21:00:10.000Z", aircraft: { hex: "a1" } }],
    observationCursor: "cursor-2",
    observationsHasMore: false,
  },
];

const bootstrap = await bootstrapTrackingRun("JBU1115");
const delta = await readTrackingRunDelta(bootstrap.run!, bootstrap.observationCursor);
assert.deepEqual(calls, [
  { url: "/api/tracking-runs?callsign=JBU1115", method: "GET" },
  { url: "/api/tracking-runs/run-one", method: "GET" },
  { url: "/api/tracking-runs/run-one?after=cursor-1", method: "GET" },
]);
assert.deepEqual(bootstrap.observations.map((observation) => observation.id), ["obs-1"]);
assert.deepEqual(delta.observations.map((observation) => observation.id), ["obs-2"]);
assert.equal(delta.observationCursor, "cursor-2");

calls.length = 0;
responses = [
  { run },
  {
    run,
    observations: [{ id: "obs-1", receivedAt: "2026-08-27T21:00:00.000Z" }],
    observationCursor: "page-1",
    observationsHasMore: true,
  },
  {
    run,
    observations: [{ id: "obs-2", receivedAt: "2026-08-27T21:00:10.000Z" }],
    observationCursor: "page-2",
    observationsHasMore: false,
  },
];

const pagedBootstrap = await bootstrapTrackingRun("JBU1115");
assert.deepEqual(calls.map((call) => call.url), [
  "/api/tracking-runs?callsign=JBU1115",
  "/api/tracking-runs/run-one",
  "/api/tracking-runs/run-one?after=page-1",
]);
assert.deepEqual(pagedBootstrap.observations.map((observation) => observation.id), ["obs-1", "obs-2"]);
assert.equal(pagedBootstrap.observationCursor, "page-2");

assert.deepEqual(
  mergeTrackingObservations(
    [{ id: "obs-b", receivedAt: "2026-08-27T21:00:00.000Z", aircraft: { lat: 1 } }],
    [
      { id: "obs-b", receivedAt: "2026-08-27T21:00:00.000Z", aircraft: { lat: 2 } },
      { id: "obs-a", receivedAt: "2026-08-27T21:00:00.000Z" },
    ],
  ).map((observation) => [observation.id, observation.aircraft?.lat]),
  [["obs-a", undefined], ["obs-b", 2]],
);

console.log("trackingRunClient.test.ts ok");
