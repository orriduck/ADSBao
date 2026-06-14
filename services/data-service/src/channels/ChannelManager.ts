import type { WebSocket } from "ws";
import { normalizeChannelName } from "./channelTypes.js";
import type { DataServiceMetrics } from "../metrics/MetricsRegistry.js";
import { PollingScheduler } from "../polling/PollingScheduler.js";
import type { ClientMessage, RealtimeEvent, SubscribeParams } from "../types.js";

type ChannelManagerOptions = {
  scheduler: PollingScheduler;
  maxSubscriptionsPerSocket?: number;
  metrics?: DataServiceMetrics;
};

type SocketState = {
  openedAtMs: number;
  subscriptions: Map<string, () => void>;
};

function rawMessageBytes(raw: unknown) {
  if (Buffer.isBuffer(raw)) return raw.byteLength;
  if (typeof raw === "string") return Buffer.byteLength(raw, "utf8");
  return 0;
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
  private readonly metrics: DataServiceMetrics | null;
  private readonly sockets = new WeakMap<WebSocket, SocketState>();

  constructor({
    scheduler,
    maxSubscriptionsPerSocket = 96,
    metrics = undefined,
  }: ChannelManagerOptions) {
    this.scheduler = scheduler;
    this.maxSubscriptionsPerSocket = maxSubscriptionsPerSocket;
    this.metrics = metrics || null;
  }

  attach(socket: WebSocket) {
    const state: SocketState = {
      openedAtMs: Date.now(),
      subscriptions: new Map(),
    };
    this.sockets.set(socket, state);
    this.metrics?.recordWsConnectionOpened();
    this.sendJson(socket, {
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
        this.metrics?.recordWsMessage({
          bytes: rawMessageBytes(raw),
          direction: "inbound",
          type: "invalid",
          result: "error",
        });
        this.sendJson(socket, { type: "error", error: "Invalid JSON message" });
        return;
      }
      this.metrics?.recordWsMessage({
        bytes: rawMessageBytes(raw),
        direction: "inbound",
        type: message.type,
        result: "ok",
      });
      this.handleMessage(socket, state, message);
    });

    socket.on("close", (code) => {
      this.detach(socket, {
        code,
        result: "closed",
      });
    });
    socket.on("error", () => {
      this.detach(socket, {
        code: "error",
        result: "error",
      });
    });
  }

  detach(
    socket: WebSocket,
    {
      code = "unknown",
      result = "closed",
    }: {
      code?: number | string | null;
      result?: "closed" | "error";
    } = {},
  ) {
    const state = this.sockets.get(socket);
    if (!state) return;
    for (const unsubscribe of state.subscriptions.values()) unsubscribe();
    state.subscriptions.clear();
    this.sockets.delete(socket);
    this.metrics?.recordWsConnectionClosed({
      code,
      durationMs: Date.now() - state.openedAtMs,
      result,
    });
  }

  private handleMessage(socket: WebSocket, state: SocketState, message: ClientMessage) {
    if (message.type === "ping") {
      this.sendJson(socket, { type: "pong", now: new Date().toISOString() });
      return;
    }

    if (message.type === "unsubscribe") {
      const normalized = normalizeChannelName(message.channel);
      if (!normalized.ok) {
        this.metrics?.recordWsUnsubscribe({
          channelType: "unknown",
          result: "invalid",
        });
        return;
      }
      const unsubscribe = state.subscriptions.get(normalized.channel);
      if (!unsubscribe) {
        this.metrics?.recordWsUnsubscribe({
          channelType: normalized.type,
          result: "invalid",
        });
        return;
      }
      unsubscribe();
      state.subscriptions.delete(normalized.channel);
      this.metrics?.recordWsUnsubscribe({
        channelType: normalized.type,
        result: "ok",
      });
      this.sendJson(socket, {
        type: "subscribed:removed",
        channel: normalized.channel,
      });
      return;
    }

    if (message.type !== "subscribe") {
      this.sendJson(socket, { type: "error", error: "Unsupported message type" });
      return;
    }

    const normalized = normalizeChannelName(message.channel);
    if (normalized.ok !== true) {
      this.metrics?.recordWsSubscribe({
        channelType: "unknown",
        result: "invalid",
      });
      this.sendJson(socket, {
        type: "subscribe:error",
        channel: message.channel,
        error: normalized.error,
      });
      return;
    }
    if (state.subscriptions.has(normalized.channel)) {
      this.metrics?.recordWsSubscribe({
        channelType: normalized.type,
        result: "duplicate",
      });
      this.sendJson(socket, {
        type: "subscribed:ready",
        channel: normalized.channel,
      });
      return;
    }
    if (state.subscriptions.size >= this.maxSubscriptionsPerSocket) {
      this.metrics?.recordWsSubscribe({
        channelType: normalized.type,
        result: "limit",
      });
      this.sendJson(socket, {
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
        send: (event: RealtimeEvent) => this.sendJson(socket, event),
      });
      state.subscriptions.set(normalized.channel, unsubscribe);
      this.metrics?.recordWsSubscribe({
        channelType: normalized.type,
        result: "ok",
      });
      this.sendJson(socket, {
        type: "subscribed:ready",
        channel: normalized.channel,
      });
    } catch (error) {
      this.metrics?.recordWsSubscribe({
        channelType: normalized.type,
        result: "error",
      });
      this.sendJson(socket, {
        type: "subscribe:error",
        channel: normalized.channel,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private sendJson(socket: WebSocket, payload: unknown) {
    const serialized = JSON.stringify(payload);
    const type =
      payload && typeof payload === "object" && "type" in payload
        ? String((payload as { type?: unknown }).type || "unknown")
        : "unknown";
    this.metrics?.recordWsMessage({
      bytes: Buffer.byteLength(serialized, "utf8"),
      direction: "outbound",
      type,
      result: socket.readyState === socket.OPEN ? "ok" : "error",
    });
    if (socket.readyState !== socket.OPEN) return;
    socket.send(serialized);
  }
}
