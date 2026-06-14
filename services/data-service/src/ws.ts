import type { Server } from "node:http";
import { WebSocketServer } from "ws";
import { ChannelManager } from "./channels/ChannelManager.js";
import type { DataServiceMetrics } from "./metrics/MetricsRegistry.js";

const DEFAULT_ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://adsbao.dev",
  "https://www.adsbao.dev",
]);

function normalizeOrigin(origin: string) {
  try {
    return new URL(origin).origin;
  } catch {
    return "";
  }
}

function isAdsbaoVercelPreviewOrigin(origin: string) {
  try {
    const url = new URL(origin);
    return (
      url.protocol === "https:" &&
      url.hostname.startsWith("adsbao-") &&
      url.hostname.endsWith("-orriduck.vercel.app")
    );
  } catch {
    return false;
  }
}

export function isAllowedWebSocketOrigin(
  origin: string | undefined,
  extraAllowedOrigins: readonly string[] = [],
) {
  if (!origin) return true;
  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;
  if (DEFAULT_ALLOWED_ORIGINS.has(normalized)) return true;
  if (
    extraAllowedOrigins
      .map((item) => normalizeOrigin(item))
      .filter(Boolean)
      .includes(normalized)
  ) {
    return true;
  }
  return isAdsbaoVercelPreviewOrigin(normalized);
}

export function attachWebSocketServer({
  server,
  channelManager,
  metrics,
  path = "/ws",
  allowedOrigins = [],
}: {
  server: Server;
  channelManager: ChannelManager;
  metrics?: DataServiceMetrics;
  path?: string;
  allowedOrigins?: readonly string[];
}) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "/", "http://localhost");
    if (url.pathname !== path) {
      metrics?.recordWsUpgrade({ reason: "path", result: "rejected" });
      socket.destroy();
      return;
    }
    if (!isAllowedWebSocketOrigin(request.headers.origin, allowedOrigins)) {
      metrics?.recordWsUpgrade({ reason: "origin", result: "rejected" });
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }

    metrics?.recordWsUpgrade({ reason: "ok", result: "accepted" });
    wss.handleUpgrade(request, socket, head, (ws) => {
      channelManager.attach(ws);
    });
  });

  return wss;
}
