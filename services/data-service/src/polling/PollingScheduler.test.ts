import assert from "node:assert/strict";
import { PollingScheduler } from "./PollingScheduler";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

{
  let calls = 0;
  const scheduler = new PollingScheduler({
    minIntervalMs: 25,
    maxActiveChannels: 10,
    jitterRatio: 0,
    fetchChannel: async ({ channel }) => {
      calls += 1;
      return {
        type: "aircraft:update",
        channel,
        source: "test-provider",
        fetchedAt: new Date(0).toISOString(),
        stale: false,
        data: [{ hex: "abc123", lat: 42, lon: -71 }],
      };
    },
  });

  const first: unknown[] = [];
  const second: unknown[] = [];
  const unsubscribeFirst = scheduler.subscribe({
    channel: "airport:KBOS",
    params: { lat: 42.3656, lon: -71.0096, distNm: 40 },
    send: (event) => first.push(event),
  });
  const unsubscribeSecond = scheduler.subscribe({
    channel: "airport:KBOS",
    params: { lat: 42.3656, lon: -71.0096, distNm: 40 },
    send: (event) => second.push(event),
  });

  await sleep(80);
  assert.equal(first.length > 0, true);
  assert.equal(second.length > 0, true);
  assert.equal(calls <= 4, true, "one loop should be shared per channel");

  unsubscribeFirst();
  unsubscribeSecond();
  const callsAfterUnsubscribe = calls;
  await sleep(80);
  assert.equal(calls, callsAfterUnsubscribe);
  assert.deepEqual(scheduler.getDebugChannels(), []);
  scheduler.dispose();
}

{
  const targetKeys = new Set<string>();
  const first: any[] = [];
  const second: any[] = [];
  const scheduler = new PollingScheduler({
    minIntervalMs: 25,
    maxActiveChannels: 10,
    jitterRatio: 0,
    fetchChannel: async ({ channel, target }) => {
      assert.equal(target.kind, "positions");
      const targetKey = `${target.lat},${target.lon},${target.distNm}`;
      targetKeys.add(targetKey);
      return {
        type: "aircraft:update",
        channel,
        source: "test-provider",
        fetchedAt: new Date(0).toISOString(),
        stale: false,
        data: { targetKey, ac: [] },
      };
    },
  });

  const unsubscribeFirst = scheduler.subscribe({
    channel: "airport:KBOS",
    params: { lat: 42.3656, lon: -71.0096, distNm: 40 },
    send: (event) => first.push(event),
  });
  const unsubscribeSecond = scheduler.subscribe({
    channel: "airport:KBOS",
    params: { lat: 33.9425, lon: -118.4081, distNm: 40 },
    send: (event) => second.push(event),
  });

  await sleep(80);
  assert.equal(
    scheduler.getDebugChannels().length,
    2,
    "airport subscriptions with different targets must not share one loop",
  );
  assert.equal(targetKeys.has("42.3656,-71.0096,40"), true);
  assert.equal(targetKeys.has("33.9425,-118.4081,40"), true);
  assert.equal(
    first.every((event) => event.data.targetKey === "42.3656,-71.0096,40"),
    true,
  );
  assert.equal(
    second.every((event) => event.data.targetKey === "33.9425,-118.4081,40"),
    true,
  );

  unsubscribeFirst();
  unsubscribeSecond();
  scheduler.dispose();
}

{
  const scheduler = new PollingScheduler({
    minIntervalMs: 25,
    maxActiveChannels: 1,
    jitterRatio: 0,
    fetchChannel: async ({ channel }) => ({
      type: "aircraft:update",
      channel,
      source: "test-provider",
      fetchedAt: new Date(0).toISOString(),
      stale: false,
      data: [],
    }),
  });

  const unsubscribe = scheduler.subscribe({
    channel: "airport:KBOS",
    params: { lat: 42.3656, lon: -71.0096 },
    send: () => {},
  });
  assert.throws(
    () =>
      scheduler.subscribe({
        channel: "airport:KSFO",
        params: { lat: 37.6213, lon: -122.379 },
        send: () => {},
      }),
    /active channel limit/i,
  );
  unsubscribe();
  scheduler.dispose();
}

console.log("PollingScheduler.test.ts ok");
