import type { Server } from "node:http";
import { WebSocketServer } from "ws";
import { ChannelManager } from "./channels/ChannelManager.js";

export function attachWebSocketServer({
  server,
  channelManager,
  path = "/ws",
}: {
  server: Server;
  channelManager: ChannelManager;
  path?: string;
}) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "/", "http://localhost");
    if (url.pathname !== path) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      channelManager.attach(ws);
    });
  });

  return wss;
}
