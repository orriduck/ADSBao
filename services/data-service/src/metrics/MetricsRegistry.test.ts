import assert from "node:assert/strict";
import { DataServiceMetrics } from "./MetricsRegistry";

{
  const metrics = new DataServiceMetrics();
  metrics.recordWsUpgrade({ reason: "ok", result: "accepted" });
  metrics.recordWsConnectionOpened();
  metrics.recordWsConnectionClosed({
    code: 1000,
    durationMs: 1_250,
    result: "closed",
  });
  metrics.recordWsMessage({
    bytes: 64,
    direction: "inbound",
    type: "subscribe",
    result: "ok",
  });
  metrics.recordWsSubscribe({ channelType: "traffic", result: "ok" });
  metrics.recordWsUnsubscribe({ channelType: "traffic", result: "ok" });
  metrics.recordPoll({
    channelType: "traffic",
    source: "adsb.lol",
    result: "success",
    durationMs: 123,
  });
  metrics.recordExternalRequest({
    provider: "adsb.lol",
    endpoint: "positions",
    result: "success",
    status: 200,
    durationMs: 123,
  });

  const output = metrics.render({
    uptimeSec: 10,
    channels: [
      {
        key: "traffic:center:42.4:-71:40",
        channel: "traffic:center:42.4:-71:40",
        type: "traffic",
        subscriberCount: 2,
        currentIntervalMs: 5_000,
        lastFetchedAt: new Date(0).toISOString(),
        lastError: null,
        source: "adsb.lol",
        stale: true,
        consecutiveFailures: 2,
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
  assert.match(output, /adsbao_ws_connections_current 0/);
  assert.match(
    output,
    /adsbao_ws_upgrades_total\{reason="ok",result="accepted"\} 1/,
  );
  assert.match(
    output,
    /adsbao_ws_disconnects_total\{close_code="1000",result="closed"\} 1/,
  );
  assert.match(
    output,
    /adsbao_ws_connection_duration_seconds_bucket\{close_code="1000",le="2.5",result="closed"\} 1/,
  );
  assert.match(
    output,
    /adsbao_ws_messages_total\{direction="inbound",result="ok",type="subscribe"\} 1/,
  );
  assert.match(
    output,
    /adsbao_ws_message_bytes_bucket\{direction="inbound",le="128",result="ok",type="subscribe"\} 1/,
  );
  assert.match(
    output,
    /adsbao_ws_subscribe_total\{channel_type="traffic",result="ok"\} 1/,
  );
  assert.match(
    output,
    /adsbao_ws_unsubscribe_total\{channel_type="traffic",result="ok"\} 1/,
  );
  assert.match(
    output,
    /adsbao_active_channels_current\{channel_type="traffic"\} 1/,
  );
  assert.match(
    output,
    /adsbao_channel_consecutive_failures_current\{channel_type="traffic"\} 2/,
  );
  assert.match(
    output,
    /adsbao_channel_poll_interval_seconds\{channel_type="traffic"\} 5/,
  );
  assert.match(
    output,
    /adsbao_stale_channels_current\{channel_type="traffic"\} 1/,
  );
  assert.match(
    output,
    /adsbao_subscriptions_current\{channel_type="traffic"\} 2/,
  );
  assert.match(
    output,
    /adsbao_poll_requests_total\{channel_type="traffic",result="success",source="adsb.lol"\} 1/,
  );
  assert.match(
    output,
    /adsbao_external_requests_total\{endpoint="positions",provider="adsb.lol",result="success",status="200",status_class="2xx"\} 1/,
  );
  assert.match(
    output,
    /adsbao_external_request_duration_seconds_bucket\{endpoint="positions",le="0.25",provider="adsb.lol",result="success",status="200",status_class="2xx"\} 1/,
  );
  assert.match(
    output,
    /adsbao_external_request_duration_seconds_bucket\{endpoint="positions",le="\+Inf",provider="adsb.lol",result="success",status="200",status_class="2xx"\} 1/,
  );
  assert.equal(output.endsWith("\n"), true);
}

console.log("MetricsRegistry.test.ts ok");
