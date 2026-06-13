import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { DataServiceMetrics } from "../metrics/MetricsRegistry";
import { ChannelManager } from "./ChannelManager";

class FakeSocket extends EventEmitter {
  OPEN = 1;
  readyState = 1;
  sent: string[] = [];

  send(payload: string) {
    this.sent.push(payload);
  }
}

{
  const metrics = new DataServiceMetrics();
  const socket = new FakeSocket();
  const manager = new ChannelManager({
    maxSubscriptionsPerSocket: 1,
    metrics,
    scheduler: {
      subscribe({ channel, send }: any) {
        send({
          type: "aircraft:update",
          channel,
          source: "test-provider",
          fetchedAt: new Date(0).toISOString(),
          stale: false,
          data: [],
        });
        return () => {};
      },
    } as any,
  });

  manager.attach(socket as any);
  socket.emit(
    "message",
    JSON.stringify({
      type: "subscribe",
      channel: "traffic:center:42.3656:-71.0096:40",
    }),
  );
  socket.emit(
    "message",
    JSON.stringify({ type: "subscribe", channel: "route:DAL44" }),
  );
  socket.emit("close");

  const output = metrics.render({ uptimeSec: 1, channels: [] });
  assert.match(output, /adsbao_ws_connections_current 0/);
  assert.match(output, /adsbao_ws_connections_total 1/);
  assert.match(
    output,
    /adsbao_ws_messages_total\{direction="inbound",result="ok",type="subscribe"\} 2/,
  );
  assert.match(
    output,
    /adsbao_ws_messages_total\{direction="outbound",result="ok",type="connection:ready"\} 1/,
  );
  assert.match(
    output,
    /adsbao_ws_subscribe_total\{channel_type="traffic",result="ok"\} 1/,
  );
  assert.match(
    output,
    /adsbao_ws_subscribe_total\{channel_type="route",result="limit"\} 1/,
  );
}

console.log("ChannelManager.test.ts ok");
