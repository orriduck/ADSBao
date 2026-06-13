"use client";

type ConnectionState = "closed" | "connecting" | "disabled" | "open";

export type AdsbaoRealtimeEvent<TData = unknown> = {
  type: string;
  channel: string;
  source: string;
  fetchedAt: string;
  stale: boolean;
  data: TData;
  error?: string;
};

type RealtimeSubscription = {
  channel: string;
  params?: Record<string, unknown>;
  listener: (event: AdsbaoRealtimeEvent) => void;
};

type StoredRealtimeSubscription = {
  channel: string;
  params?: Record<string, unknown>;
  listeners: Set<(event: AdsbaoRealtimeEvent) => void>;
};

declare global {
  interface Window {
    __adsbaoRealtimeDebug?: Record<string, unknown>;
  }
}

function resolveRealtimeUrl() {
  if (typeof document !== "undefined") {
    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="adsbao-realtime-url"]',
    );
    if (meta?.content) return meta.content;
  }
  return typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_ADSBAO_REALTIME_URL || ""
    : "";
}

export class AdsbaoRealtimeClient {
  private readonly url: string;
  private socket: WebSocket | null = null;
  private connectionState: ConnectionState;
  private reconnectTimer: number | null = null;
  private reconnectAttempt = 0;
  private readonly subscriptions = new Map<string, StoredRealtimeSubscription>();
  private readonly listeners = new Set<(event: AdsbaoRealtimeEvent) => void>();
  private readonly stateListeners = new Set<(state: ConnectionState) => void>();

  constructor(url = resolveRealtimeUrl()) {
    this.url = url;
    this.connectionState = url ? "closed" : "disabled";
    this.syncDebug({
      enabled: this.enabled,
      state: this.connectionState,
      subscriptionCount: this.subscriptions.size,
      url: this.url,
    });
  }

  get enabled() {
    return Boolean(this.url);
  }

  get state() {
    return this.connectionState;
  }

  connect() {
    this.syncDebug({ lastConnectAttemptAt: new Date().toISOString() });
    if (!this.url || typeof WebSocket === "undefined") {
      this.setState("disabled");
      this.syncDebug({ lastConnectSkippedReason: "missing-url-or-websocket" });
      return;
    }
    if (this.socket && this.socket.readyState <= WebSocket.OPEN) return;

    this.setState("connecting");
    const socket = new WebSocket(this.url);
    this.socket = socket;
    this.syncDebug({ lastSocketUrl: this.url });

    socket.addEventListener("open", () => {
      this.reconnectAttempt = 0;
      this.setState("open");
      this.resubscribeAll();
    });
    socket.addEventListener("message", (event) => {
      this.handleMessage(event.data);
    });
    socket.addEventListener("close", () => {
      if (this.socket === socket) this.socket = null;
      this.setState(this.url ? "closed" : "disabled");
      this.scheduleReconnect();
    });
    socket.addEventListener("error", () => {
      this.syncDebug({ lastSocketErrorAt: new Date().toISOString() });
      socket.close();
    });
  }

  disconnect() {
    if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.socket?.close();
    this.socket = null;
    this.setState(this.url ? "closed" : "disabled");
  }

  subscribe({
    channel,
    params,
    listener,
  }: RealtimeSubscription): () => void {
    if (!channel) return () => {};
    const key = channel;
    const existing = this.subscriptions.get(key);
    if (existing) {
      existing.listeners.add(listener);
    } else {
      this.subscriptions.set(key, {
        channel,
        params,
        listeners: new Set([listener]),
      });
    }
    this.syncDebug({
      lastSubscribeAt: new Date().toISOString(),
      lastSubscribeChannel: channel,
      lastSubscribeParams: params,
      subscriptionCount: this.subscriptions.size,
    });
    this.connect();
    if (!existing) {
      this.send({
        type: "subscribe",
        channel,
        params,
      });
    }
    return () => {
      const current = this.subscriptions.get(key);
      if (!current) return;
      current.listeners.delete(listener);
      if (current.listeners.size === 0) {
        this.subscriptions.delete(key);
        this.syncDebug({
          lastUnsubscribeAt: new Date().toISOString(),
          lastUnsubscribeChannel: channel,
          subscriptionCount: this.subscriptions.size,
        });
        this.send({ type: "unsubscribe", channel });
      }
    };
  }

  onMessage(listener: (event: AdsbaoRealtimeEvent) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onConnectionState(listener: (state: ConnectionState) => void) {
    this.stateListeners.add(listener);
    listener(this.connectionState);
    return () => this.stateListeners.delete(listener);
  }

  private setState(state: ConnectionState) {
    if (this.connectionState === state) return;
    this.connectionState = state;
    this.syncDebug({ state });
    for (const listener of this.stateListeners) listener(state);
  }

  private send(payload: unknown) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(payload));
  }

  private resubscribeAll() {
    for (const subscription of this.subscriptions.values()) {
      this.send({
        type: "subscribe",
        channel: subscription.channel,
        params: subscription.params,
      });
    }
  }

  private scheduleReconnect() {
    if (!this.url || this.reconnectTimer) return;
    const delay = Math.min(30_000, 500 * 2 ** this.reconnectAttempt);
    this.reconnectAttempt += 1;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private handleMessage(raw: unknown) {
    let event: AdsbaoRealtimeEvent | null = null;
    try {
      const parsed = JSON.parse(String(raw));
      if (parsed && typeof parsed === "object" && "type" in parsed) {
        event = parsed as AdsbaoRealtimeEvent;
      }
    } catch {
      event = null;
    }
    if (!event) return;
    this.syncDebug({
      lastEventAt: new Date().toISOString(),
      lastEventChannel: event.channel,
      lastEventType: event.type,
    });

    for (const listener of this.listeners) listener(event);
    const subscription = this.subscriptions.get(event.channel);
    for (const listener of subscription?.listeners || []) listener(event);
  }

  private syncDebug(next: Record<string, unknown>) {
    if (process.env.NODE_ENV === "production" || typeof window === "undefined") {
      return;
    }
    window.__adsbaoRealtimeDebug = {
      ...(window.__adsbaoRealtimeDebug || {}),
      ...next,
    };
  }
}

let singleton: AdsbaoRealtimeClient | null = null;

export function getAdsbaoRealtimeClient() {
  if (!singleton) singleton = new AdsbaoRealtimeClient();
  return singleton;
}
