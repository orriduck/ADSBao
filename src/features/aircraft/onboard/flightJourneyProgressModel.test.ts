import assert from "node:assert/strict";

import { resolveFlightJourneyProgress } from "./flightJourneyProgressModel";

const NOW = Date.parse("2026-07-29T15:00:00Z");

assert.equal(resolveFlightJourneyProgress({}), null);
assert.equal(
  resolveFlightJourneyProgress({
    flightAwareFallback: { ok: true, metadata: {} },
  }),
  null,
);
assert.deepEqual(
  resolveFlightJourneyProgress({
    flightAwareFallback: {
      ok: true,
      metadata: { status: "scheduled", scheduled_out: "2026-07-29T16:00:00Z" },
    },
    now: NOW,
  }),
  {
    phase: "ground",
    progress: 0.12,
    departureTime: Date.parse("2026-07-29T16:00:00Z"),
    arrivalTime: null,
  },
);
assert.deepEqual(
  resolveFlightJourneyProgress({
    flightAwareFallback: {
      ok: true,
      metadata: {
        status: "airborne",
        actual_out: "2026-07-29T14:00:00Z",
        estimated_in: "2026-07-29T16:00:00Z",
      },
    },
    now: NOW,
  }),
  {
    phase: "airborne",
    progress: 0.5,
    departureTime: Date.parse("2026-07-29T14:00:00Z"),
    arrivalTime: Date.parse("2026-07-29T16:00:00Z"),
  },
);
assert.equal(
  resolveFlightJourneyProgress({
    flightAwareFallback: { ok: true, metadata: { status: "arrived" } },
  })?.phase,
  "arrived",
);

console.log("flightJourneyProgressModel.test.ts ok");
