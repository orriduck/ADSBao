import assert from "node:assert/strict";
import { BoundedTileResourceCache } from "./boundedTileResourceCache";

const loads: string[] = [];
const disposed: string[] = [];
const cache = new BoundedTileResourceCache<string>({
  maxEntries: 2,
  load: async (key) => {
    loads.push(key);
    return `texture:${key}`;
  },
  dispose: (value) => disposed.push(value),
});

const ready: string[] = [];
const first = cache.acquire("a", { ready: (value) => ready.push(value) });
const duplicate = cache.acquire("a", { ready: (value) => ready.push(value) });
assert.equal(first.cacheHit, false);
assert.equal(duplicate.cacheHit, true);
assert.deepEqual(loads, ["a"]);
await Promise.resolve();
assert.deepEqual(ready, ["texture:a", "texture:a"]);
first.release();
duplicate.release();

const second = cache.acquire("b");
await Promise.resolve();
second.release();
const third = cache.acquire("c");
await Promise.resolve();
third.release();

assert.equal(cache.snapshot().size, 2);
assert.deepEqual(disposed, ["texture:a"]);
const retained: string[] = [];
cache.forEachReady((value) => retained.push(value));
assert.deepEqual(retained.sort(), ["texture:b", "texture:c"]);
cache.disposeAll();
assert.equal(cache.snapshot().size, 0);
assert.deepEqual(disposed.sort(), ["texture:a", "texture:b", "texture:c"]);

let now = 1_000;
let retryLoads = 0;
const retryCache = new BoundedTileResourceCache<string>({
  maxEntries: 2,
  retryErrorsAfterMs: 30_000,
  now: () => now,
  load: async () => {
    retryLoads += 1;
    if (retryLoads === 1) throw new Error("temporary tile outage");
    return "recovered-texture";
  },
  dispose: () => {},
});
const failed = retryCache.acquire("retry-tile");
await Promise.resolve();
failed.release();
assert.equal(retryLoads, 1);

now += 29_999;
const beforeTtl = retryCache.acquire("retry-tile");
assert.equal(beforeTtl.cacheHit, true);
assert.equal(beforeTtl.status, "error");
beforeTtl.release();
assert.equal(retryLoads, 1);

now += 1;
const retried = retryCache.acquire("retry-tile");
assert.equal(retried.cacheHit, false);
await Promise.resolve();
assert.equal(retryLoads, 2);
assert.equal(retryCache.snapshot().ready, 1);
retried.release();
retryCache.disposeAll();

console.log("boundedTileResourceCache.test.ts ok");
