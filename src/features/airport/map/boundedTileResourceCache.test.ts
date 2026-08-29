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
cache.disposeAll();
assert.equal(cache.snapshot().size, 0);
assert.deepEqual(disposed.sort(), ["texture:a", "texture:b", "texture:c"]);

console.log("boundedTileResourceCache.test.ts ok");
