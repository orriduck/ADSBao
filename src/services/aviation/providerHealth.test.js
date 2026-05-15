import assert from "node:assert/strict";

import {
  createProviderHealthTracker,
  isRetriableStatus,
  selectProviderOrder,
} from "./providerHealth.js";

// isRetriableStatus
assert.equal(isRetriableStatus(503), true);
assert.equal(isRetriableStatus(429), true);
assert.equal(isRetriableStatus(500), true);
assert.equal(isRetriableStatus(404), false);
assert.equal(isRetriableStatus(200), false);

// cool-down lifecycle
{
  let currentTime = 1_000;
  const tracker = createProviderHealthTracker({
    coolDownMs: 5_000,
    now: () => currentTime,
  });

  assert.equal(tracker.isUnhealthy("adsb.lol"), false);
  tracker.markUnhealthy("adsb.lol");
  assert.equal(tracker.isUnhealthy("adsb.lol"), true);
  assert.deepEqual(tracker.snapshot(), { "adsb.lol": 5_000 });

  // Halfway through the window — still unhealthy.
  currentTime = 3_500;
  assert.equal(tracker.isUnhealthy("adsb.lol"), true);

  // Past the window — auto-recovers and snapshot drops it.
  currentTime = 7_000;
  assert.equal(tracker.isUnhealthy("adsb.lol"), false);
  assert.deepEqual(tracker.snapshot(), {});
}

// selectProviderOrder: healthy first, unhealthy as last-resort fallback
{
  let currentTime = 1_000;
  const tracker = createProviderHealthTracker({
    coolDownMs: 5_000,
    now: () => currentTime,
  });
  const chain = [
    { id: "adsb.lol" },
    { id: "adsb.fi" },
  ];

  // All healthy: declared order.
  assert.deepEqual(
    selectProviderOrder(chain, tracker).map((p) => p.id),
    ["adsb.lol", "adsb.fi"],
  );

  // Primary unhealthy: secondary moves to front, primary tails as fallback.
  tracker.markUnhealthy("adsb.lol");
  assert.deepEqual(
    selectProviderOrder(chain, tracker).map((p) => p.id),
    ["adsb.fi", "adsb.lol"],
  );

  // After cool-down: primary is back at the top.
  currentTime = 7_000;
  assert.deepEqual(
    selectProviderOrder(chain, tracker).map((p) => p.id),
    ["adsb.lol", "adsb.fi"],
  );
}

console.log("providerHealth.test.js: ok");
