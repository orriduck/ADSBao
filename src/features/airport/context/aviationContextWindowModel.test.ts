import assert from "node:assert/strict";

import {
  resolveContextTileWindowPromotion,
  resolveContextTileWindowRetryDelay,
  resolveContextTileWindowResults,
} from "./aviationContextWindowModel";

const complete = resolveContextTileWindowResults([
  { status: "fulfilled", value: { tile: "a" } },
  { status: "fulfilled", value: { tile: "b" } },
]);
assert.deepEqual(complete, {
  canPromote: true,
  payloads: [{ tile: "a" }, { tile: "b" }],
  loaded: 2,
  failed: 0,
  error: null,
});

const failure = new Error("tile failed");
const partial = resolveContextTileWindowResults([
  { status: "fulfilled", value: { tile: "a" } },
  { status: "rejected", reason: failure },
]);
assert.equal(partial.canPromote, false);
assert.deepEqual(partial.payloads, [{ tile: "a" }]);
assert.equal(partial.loaded, 1);
assert.equal(partial.failed, 1);
assert.equal(partial.error, failure);
assert.equal(
  resolveContextTileWindowResults(
    [
      { status: "fulfilled", value: { tile: "a" } },
      { status: "rejected", reason: failure },
    ],
    { requireComplete: false },
  ).canPromote,
  true,
);

const visibleItems = [{ tile: "old" }];
const retained = resolveContextTileWindowPromotion({
  currentItems: visibleItems,
  currentVisibleSignature: "old-window",
  requestSignature: "failed-window",
  resolution: partial,
  nextItems: [{ tile: "partial" }],
});
assert.equal(retained.items, visibleItems);
assert.deepEqual(retained, {
  items: [{ tile: "old" }],
  visibleSignature: "old-window",
  promoted: false,
});

assert.deepEqual(
  resolveContextTileWindowPromotion({
    currentItems: visibleItems,
    currentVisibleSignature: "old-window",
    requestSignature: "ready-window",
    resolution: complete,
    nextItems: [{ tile: "new" }],
  }),
  {
    items: [{ tile: "new" }],
    visibleSignature: "ready-window",
    promoted: true,
  },
);

assert.deepEqual(resolveContextTileWindowResults([]), {
  canPromote: true,
  payloads: [],
  loaded: 0,
  failed: 0,
  error: null,
});

assert.equal(
  resolveContextTileWindowRetryDelay({
    attempt: 0,
    retryLimit: 2,
    baseDelayMs: 30_000,
  }),
  30_000,
);
assert.equal(
  resolveContextTileWindowRetryDelay({
    attempt: 1,
    retryLimit: 2,
    baseDelayMs: 30_000,
  }),
  60_000,
);
assert.equal(
  resolveContextTileWindowRetryDelay({
    attempt: 2,
    retryLimit: 2,
    baseDelayMs: 30_000,
  }),
  null,
);

console.log("aviationContextWindowModel.test.ts ok");
