import { createServer, type ServerResponse } from "node:http";
import { ChannelManager } from "./channels/ChannelManager.js";
import { PollingScheduler } from "./polling/PollingScheduler.js";
import { fetchAdsbChannel } from "./sources/adsbClient.js";
import { attachWebSocketServer } from "./ws.js";

const port = Number(process.env.PORT || 8080);
const scheduler = new PollingScheduler({
  fetchChannel: fetchAdsbChannel,
  minIntervalMs: Number(process.env.MIN_POLL_INTERVAL_MS || 1_000),
  maxIntervalMs: Number(process.env.MAX_POLL_INTERVAL_MS || 60_000),
  maxActiveChannels: Number(process.env.MAX_ACTIVE_CHANNELS || 250),
  jitterRatio: Number(process.env.POLL_JITTER_RATIO || 0.1),
});
const channelManager = new ChannelManager({
  scheduler,
  maxSubscriptionsPerSocket: Number(process.env.MAX_SOCKET_SUBSCRIPTIONS || 12),
});

function jsonResponse(response: ServerResponse, status: number, payload: unknown) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

const server = createServer((request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  if (request.method === "GET" && url.pathname === "/health") {
    jsonResponse(response, 200, {
      ok: true,
      service: "adsbao-data-service",
      uptimeSec: Math.round(process.uptime()),
      activeChannels: scheduler.getDebugChannels().length,
    });
    return;
  }
  if (request.method === "GET" && url.pathname === "/debug/channels") {
    jsonResponse(response, 200, {
      channels: scheduler.getDebugChannels(),
    });
    return;
  }
  if (request.method === "GET" && url.pathname === "/metrics") {
    const channels = scheduler.getDebugChannels();
    response.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(
      [
        `adsbao_active_channels ${channels.length}`,
        `adsbao_subscribers ${channels.reduce((sum: number, item) => sum + item.subscriberCount, 0)}`,
        "",
      ].join("\n"),
    );
    return;
  }

  jsonResponse(response, 404, { error: "Not found" });
});

attachWebSocketServer({ server, channelManager });

server.listen(port, "0.0.0.0", () => {
  console.info(`adsbao-data-service listening on :${port}`);
});

process.on("SIGTERM", () => {
  scheduler.dispose();
  server.close(() => process.exit(0));
});
