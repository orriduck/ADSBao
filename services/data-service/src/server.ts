import { createServer, type ServerResponse } from "node:http";
import { ChannelManager } from "./channels/ChannelManager.js";
import { DataServiceMetrics } from "./metrics/MetricsRegistry.js";
import { PollingScheduler } from "./polling/PollingScheduler.js";
import { fetchAdsbChannel } from "./sources/adsbClient.js";
import { fetchRouteChannel } from "./sources/routeClient.js";
import { attachWebSocketServer } from "./ws.js";

const port = Number(process.env.PORT || 8080);
const metrics = new DataServiceMetrics();
const scheduler = new PollingScheduler({
  fetchChannel: (input) =>
    input.channelType === "route" ? fetchRouteChannel(input) : fetchAdsbChannel(input),
  minIntervalMs: Number(process.env.MIN_POLL_INTERVAL_MS || 1_000),
  maxIntervalMs: Number(process.env.MAX_POLL_INTERVAL_MS || 30 * 60_000),
  maxActiveChannels: Number(process.env.MAX_ACTIVE_CHANNELS || 250),
  jitterRatio: Number(process.env.POLL_JITTER_RATIO || 0.1),
  metrics,
});
const channelManager = new ChannelManager({
  scheduler,
  maxSubscriptionsPerSocket: Number(process.env.MAX_SOCKET_SUBSCRIPTIONS || 96),
  metrics,
});

function parseCsv(value: string | undefined) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

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
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(metrics.render({
      channels,
      uptimeSec: process.uptime(),
    }));
    return;
  }

  jsonResponse(response, 404, { error: "Not found" });
});

attachWebSocketServer({
  server,
  channelManager,
  allowedOrigins: parseCsv(process.env.ALLOWED_WS_ORIGINS),
});

server.listen(port, "0.0.0.0", () => {
  console.info(`adsbao-data-service listening on :${port}`);
});

process.on("SIGTERM", () => {
  scheduler.dispose();
  server.close(() => process.exit(0));
});
