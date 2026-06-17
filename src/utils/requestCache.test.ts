import assert from "node:assert/strict";
import { createRequestCache } from "./requestCache";

{
  const calls = [];
  let resolvePayload;
  const cache = createRequestCache();

  const first = cache.request("same", () => {
    calls.push("load");
    return new Promise((resolve) => {
      resolvePayload = () => resolve({ ok: true });
    });
  });
  const second = cache.request("same", () => {
    calls.push("load");
    return Promise.resolve({ ok: false });
  });

  assert.equal(calls.length, 1);
  resolvePayload();
  assert.deepEqual(await first, { ok: true });
  assert.deepEqual(await second, { ok: true });
}

{
  const calls = [];
  const cache = createRequestCache();

  await cache.request("retry", async () => {
    calls.push("first");
    return "first";
  });
  await cache.request("retry", async () => {
    calls.push("second");
    return "second";
  });

  assert.deepEqual(calls, ["first", "second"]);
}

{
  const calls = [];
  const cache = createRequestCache<null>({
    ttlMs: 500,
    shouldCache: () => true,
  });

  assert.equal(
    await cache.request("nullable", async () => {
      calls.push("first");
      return null;
    }),
    null,
  );
  assert.equal(
    await cache.request("nullable", async () => {
      calls.push("second");
      return null;
    }),
    null,
  );
  assert.deepEqual(calls, ["first"]);
}

{
  const cache = createRequestCache();

  await assert.rejects(
    () =>
      cache.request("throws", () => {
        throw new Error("sync failure");
      }),
    /sync failure/,
  );
  assert.equal(
    await cache.request("throws", async () => "recovered"),
    "recovered",
  );
}

{
  let now = 1_000;
  const calls = [];
  const cache = createRequestCache<string>({
    ttlMs: 500,
    now: () => now,
  });

  assert.equal(
    await cache.request("cached", async () => {
      calls.push("first");
      return "first";
    }),
    "first",
  );
  assert.equal(
    await cache.request("cached", async () => {
      calls.push("second");
      return "second";
    }),
    "first",
  );
  now = 1_501;
  assert.equal(
    await cache.request("cached", async () => {
      calls.push("third");
      return "third";
    }),
    "third",
  );
  assert.deepEqual(calls, ["first", "third"]);
}

{
  const calls = [];
  const cache = createRequestCache();

  await Promise.all([
    cache.request(
      "isolated",
      async () => {
        calls.push("first");
        return "first";
      },
      { coalesce: false },
    ),
    cache.request(
      "isolated",
      async () => {
        calls.push("second");
        return "second";
      },
      { coalesce: false },
    ),
  ]);

  assert.deepEqual(calls, ["first", "second"]);
}

console.log("requestCache.test.ts: ok");
