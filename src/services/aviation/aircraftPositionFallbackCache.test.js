import assert from "node:assert/strict";

import { createAircraftPositionFallbackCache } from "./aircraftPositionFallbackCache.js";

{
  let currentTime = 1_000;
  const cache = createAircraftPositionFallbackCache({
    maxAgeMs: 5_000,
    now: () => currentTime,
  });

  cache.remember("KBOS:30", { ac: [{ hex: "abc123" }] });
  currentTime = 2_500;

  assert.deepEqual(cache.recall("KBOS:30"), {
    payload: { ac: [{ hex: "abc123" }] },
    staleAgeMs: 1_500,
  });
}

{
  let currentTime = 1_000;
  const cache = createAircraftPositionFallbackCache({
    maxAgeMs: 500,
    now: () => currentTime,
  });

  cache.remember("KBOS:30", { ac: [{ hex: "abc123" }] });
  currentTime = 1_600;

  assert.equal(cache.recall("KBOS:30"), null);
}

{
  let currentTime = 1_000;
  const cache = createAircraftPositionFallbackCache({
    maxAgeMs: 5_000,
    maxEntries: 2,
    now: () => currentTime,
  });

  cache.remember("A", { ac: [{ hex: "A" }] });
  currentTime = 1_100;
  cache.remember("B", { ac: [{ hex: "B" }] });
  currentTime = 1_200;
  cache.remember("C", { ac: [{ hex: "C" }] });

  assert.equal(cache.recall("A"), null);
  assert.deepEqual(cache.recall("B"), {
    payload: { ac: [{ hex: "B" }] },
    staleAgeMs: 100,
  });
  assert.deepEqual(cache.recall("C"), {
    payload: { ac: [{ hex: "C" }] },
    staleAgeMs: 0,
  });
}
