import assert from "node:assert/strict";

import { resolveNextPollDelayMs } from "./pollBackoffModel";

// Healthy feed keeps the live cadence.
assert.equal(
  resolveNextPollDelayMs({ baseMs: 3_000, maxMs: 30_000, consecutiveFailures: 0 }),
  3_000,
);

// Failures double the delay: 6s, 12s, 24s, then clamp at the cap.
assert.equal(
  resolveNextPollDelayMs({ baseMs: 3_000, maxMs: 30_000, consecutiveFailures: 1 }),
  6_000,
);
assert.equal(
  resolveNextPollDelayMs({ baseMs: 3_000, maxMs: 30_000, consecutiveFailures: 2 }),
  12_000,
);
assert.equal(
  resolveNextPollDelayMs({ baseMs: 3_000, maxMs: 30_000, consecutiveFailures: 3 }),
  24_000,
);
assert.equal(
  resolveNextPollDelayMs({ baseMs: 3_000, maxMs: 30_000, consecutiveFailures: 4 }),
  30_000,
);

// Huge failure counts stay clamped (no overflow past the cap).
assert.equal(
  resolveNextPollDelayMs({ baseMs: 3_000, maxMs: 30_000, consecutiveFailures: 1_000 }),
  30_000,
);

// Degenerate inputs fall back to sane values.
assert.equal(
  resolveNextPollDelayMs({ baseMs: 0, maxMs: 0, consecutiveFailures: 5 }),
  1,
);
assert.equal(
  resolveNextPollDelayMs({ baseMs: 3_000, maxMs: 1_000, consecutiveFailures: 2 }),
  3_000,
  "cap below base should clamp to base",
);
assert.equal(resolveNextPollDelayMs(), 3_000, "defaults apply with no args");

console.log("pollBackoffModel.test.ts ok");
