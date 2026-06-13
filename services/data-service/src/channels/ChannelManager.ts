import type { WebSocket } from "ws";
import { normalizeChannelName } from "./channelTypes.js";
import { PollingScheduler } from "../polling/PollingScheduler.js";
import type { ClientMessage, RealtimeEvent, SubscribeParams } from "../types.js";

type ChannelManagerOptions = {
  scheduler: PollingScheduler;
  maxSubscriptionsPerSocket?: number;
};

type SocketState = {
  subscriptions: Map<string, () => void>;
};

function sendJson(socket: WebSocket, payload: unknown) {
  if (socket.readyState !== socket.OPEN) return;
  socket.send(JSON.stringify(payload));
}

function parseClientMessage(raw: unknown): ClientMessage | null {
  if (typeof raw !== "string" && !Buffer.isBuffer(raw)) return null;
  try {
    const parsed = JSON.parse(String(raw));
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as ClientMessage;
  } catch {
    return null;
  }
}

export class ChannelManager {
  private readonly scheduler: PollingScheduler;
  private readonly maxSubscriptionsPerSocket: number;
  private readonly sockets = new WeakMap<WebSocket, SocketState>();

  constructor({
    scheduler,
    maxSubscriptionsPerSocket = 96,
  }: ChannelManagerOptions) {
    this.scheduler = scheduler;
    this.maxSubscriptionsPerSocket = maxSubscriptionsPerSocket;
  }

  attach(socket: WebSocket) {
    const state: SocketState = {
      subscriptions: new Map(),
    };
    this.sockets.set(socket, state);
    sendJson(socket, {
      type: "connection:ready",
      channel: "session",
      source: "adsbao-data-service",
      fetchedAt: new Date().toISOString(),
      stale: false,
      data: {
        maxSubscriptions: this.maxSubscriptionsPerSocket,
      },
    } satisfies RealtimeEvent);

    socket.on("message", (raw) => {
      const message = parseClientMessage(raw);
      if (!message) {
        sendJson(socket, { type: "error", error: "Invalid JSON message" });
        return;
      }
      this.handleMessage(socket, state, message);
    });

    socket.on("close", () => {
      this.detach(socket);
    });
    socket.on("error", () => {
      this.detach(socket);
    });
  }

  detach(socket: WebSocket) {
    const state = this.sockets.get(socket);
    if (!state) return;
    for (const unsubscribe of state.subscriptions.values()) unsubscribe();
    state.subscriptions.clear();
  }

  private handleMessage(socket: WebSocket, state: SocketState, message: ClientMessage) {
    if (message.type === "ping") {
      sendJson(socket, { type: "pong", now: new Date().toISOString() });
      return;
    }

    if (message.type === "unsubscribe") {
      const normalized = normalizeChannelName(message.channel);
      if (!normalized.ok) return;
      const unsubscribe = state.subscriptions.get(normalized.channel);
      if (!unsubscribe) return;
      unsubscribe();
      state.subscriptions.delete(normalized.channel);
      sendJson(socket, {
        type: "subscribed:removed",
        channel: normalized.channel,
      });
      return;
    }

    if (message.type !== "subscribe") {
      sendJson(socket, { type: "error", error: "Unsupported message type" });
      return;
    }

    const normalized = normalizeChannelName(message.channel);
    if (normalized.ok !== true) {
      sendJson(socket, {
        type: "subscribe:error",
        channel: message.channel,
        error: normalized.error,
      });
      return;
    }
    if (state.subscriptions.has(normalized.channel)) {
      sendJson(socket, {
        type: "subscribed:ready",
        channel: normalized.channel,
      });
      return;
    }
    if (state.subscriptions.size >= this.maxSubscriptionsPerSocket) {
      sendJson(socket, {
        type: "subscribe:error",
        channel: normalized.channel,
        error: "Socket subscription limit reached",
      });
      return;
    }

    try {
      const unsubscribe = this.scheduler.subscribe({
        channel: normalized.channel,
        params: message.params || ({} as SubscribeParams),
        send: (event: RealtimeEvent) => sendJson(socket, event),
      });
      state.subscriptions.set(normalized.channel, unsubscribe);
      sendJson(socket, {
        type: "subscribed:ready",
        channel: normalized.channel,
      });
    } catch (error) {
      sendJson(socket, {
        type: "subscribe:error",
        channel: normalized.channel,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
