import assert from "node:assert/strict";
import { DataServiceMetrics } from "./MetricsRegistry";

{
  const metrics = new DataServiceMetrics();
  metrics.recordWsConnectionOpened();
  metrics.recordWsMessage({
    direction: "inbound",
    type: "subscribe",
    result: "ok",
  });
  metrics.recordWsSubscribe({ channelType: "airport", result: "ok" });
  metrics.recordPoll({
    channelType: "airport",
    source: "adsb.lol",
    result: "success",
    durationMs: 123,
  });
  metrics.recordExternalRequest({
    provider: "adsb.lol",
    endpoint: "positions",
    result: "success",
    durationMs: 123,
  });

  const output = metrics.render({
    uptimeSec: 10,
    channels: [
      {
        key: "airport:KBOS|42.3656|-71.0096|40",
        channel: "airport:KBOS",
        type: "airport",
        subscriberCount: 2,
        currentIntervalMs: 5_000,
        lastFetchedAt: new Date(0).toISOString(),
        lastError: null,
        source: "adsb.lol",
        stale: false,
        consecutiveFailures: 0,
      },
      {
        key: "route:DAL44",
        channel: "route:DAL44",
        type: "route",
        subscriberCount: 1,
        currentIntervalMs: 1_800_000,
        lastFetchedAt: null,
        lastError: null,
        source: null,
        stale: false,
        consecutiveFailures: 0,
      },
    ],
  });

  assert.match(output, /^# HELP adsbao_ws_connections_current/m);
  assert.match(output, /adsbao_ws_connections_current 1/);
  assert.match(
    output,
    /adsbao_ws_messages_total\{direction="inbound",result="ok",type="subscribe"\} 1/,
  );
  assert.match(
    output,
    /adsbao_ws_subscribe_total\{channel_type="airport",result="ok"\} 1/,
  );
  assert.match(
    output,
    /adsbao_active_channels_current\{channel_type="airport"\} 1/,
  );
  assert.match(
    output,
    /adsbao_subscriptions_current\{channel_type="airport"\} 2/,
  );
  assert.match(
    output,
    /adsbao_poll_requests_total\{channel_type="airport",result="success",source="adsb.lol"\} 1/,
  );
  assert.match(
    output,
    /adsbao_external_requests_total\{endpoint="positions",provider="adsb.lol",result="success"\} 1/,
  );
  assert.match(
    output,
    /adsbao_external_request_duration_seconds_bucket\{endpoint="positions",le="0.25",provider="adsb.lol",result="success"\} 1/,
  );
  assert.match(
    output,
    /adsbao_external_request_duration_seconds_bucket\{endpoint="positions",le="\+Inf",provider="adsb.lol",result="success"\} 1/,
  );
  assert.equal(output.endsWith("\n"), true);
}

console.log("MetricsRegistry.test.ts ok");
