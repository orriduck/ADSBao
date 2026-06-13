import assert from "node:assert/strict";
import { DataServiceMetrics } from "../metrics/MetricsRegistry";
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
    channel: "traffic:airport:KBOS:42.3656:-71.0096:40",
    send: (event) => first.push(event),
  });
  const unsubscribeSecond = scheduler.subscribe({
    channel: "traffic:airport:KBOS:42.3656:-71.0096:40",
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
    channel: "traffic:airport:KBOS:42.3656:-71.0096:40",
    send: (event) => first.push(event),
  });
  const unsubscribeSecond = scheduler.subscribe({
    channel: "traffic:center:33.9425:-118.4081:40",
    send: (event) => second.push(event),
  });

  await sleep(80);
  assert.equal(
    scheduler.getDebugChannels().length,
    2,
    "traffic subscriptions with different centers must not share one loop",
  );
  assert.equal(targetKeys.has("42.4,-71,40"), true);
  assert.equal(targetKeys.has("33.9,-118.4,40"), true);
  assert.equal(
    first.every((event) => event.data.targetKey === "42.4,-71,40"),
    true,
  );
  assert.equal(
    second.every((event) => event.data.targetKey === "33.9,-118.4,40"),
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
    channel: "traffic:airport:KBOS:42.3656:-71.0096:40",
    send: () => {},
  });
  assert.throws(
    () =>
      scheduler.subscribe({
        channel: "traffic:airport:KSFO:37.6213:-122.379:40",
        send: () => {},
      }),
    /active channel limit/i,
  );
  unsubscribe();
  scheduler.dispose();
}

{
  const metrics = new DataServiceMetrics();
  const scheduler = new PollingScheduler({
    minIntervalMs: 25,
    maxActiveChannels: 10,
    jitterRatio: 0,
    metrics,
    fetchChannel: async ({ channel }) => ({
      type: "route:update",
      channel,
      source: "adsbdb",
      fetchedAt: new Date(0).toISOString(),
      stale: false,
      data: { callsign: "DAL44", route: null },
    }),
  });

  const unsubscribe = scheduler.subscribe({
    channel: "route:DAL44",
    send: () => {},
  });

  await sleep(40);
  const output = metrics.render({
    uptimeSec: 1,
    channels: scheduler.getDebugChannels(),
  });
  assert.match(
    output,
    /adsbao_poll_requests_total\{channel_type="route",result="success",source="adsbdb"\} 1/,
  );
  assert.match(
    output,
    /adsbao_external_requests_total\{endpoint="route",provider="adsbdb",result="success"\} 1/,
  );

  unsubscribe();
  scheduler.dispose();
}

console.log("PollingScheduler.test.ts ok");
