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

type RealtimeSocket = Pick<
  WebSocket,
  "addEventListener" | "close" | "readyState" | "send"
>;

type RealtimeSocketConstructor = {
  new (url: string): RealtimeSocket;
  CONNECTING: number;
  OPEN: number;
};

type RealtimeTimerHost = {
  setTimeout: (callback: () => void, delay?: number) => number;
  clearTimeout: (id: number) => void;
  setInterval: (callback: () => void, delay?: number) => number;
  clearInterval: (id: number) => void;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
};

type RealtimeDocumentHost = {
  hidden?: boolean;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
};

type AdsbaoRealtimeClientOptions = {
  WebSocketCtor?: RealtimeSocketConstructor;
  timerHost?: RealtimeTimerHost | null;
  documentHost?: RealtimeDocumentHost | null;
  reconnectBaseDelayMs?: number;
  reconnectMaxDelayMs?: number;
  connectTimeoutMs?: number;
  heartbeatIntervalMs?: number;
  heartbeatTimeoutMs?: number;
  authTokenFetcher?: RealtimeAuthTokenFetcher | null;
};

type RealtimeLocationLike = {
  protocol?: string;
  host?: string;
};

declare global {
  interface Window {
    __adsbaoRealtimeDebug?: Record<string, unknown>;
  }
}

type RealtimeAuthTokenFetcher = (provider: string) => Promise<string>;

export function resolveSameOriginRealtimeUrl(locationLike?: RealtimeLocationLike | null) {
  const location = locationLike ||
    (typeof window !== "undefined" ? window.location : null);
  const host = String(location?.host || "").trim();
  if (!host) return "";
  const protocol = String(location?.protocol || "").trim().toLowerCase();
  if (protocol === "https:") return `wss://${host}/ws`;
  if (protocol === "http:") return `ws://${host}/ws`;
  return "";
}

function resolveRealtimeUrl() {
  if (typeof document !== "undefined") {
    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="adsbao-realtime-url"]',
    );
    if (meta?.content?.trim()) return meta.content.trim();
  }
  const envUrl =
    typeof process !== "undefined"
      ? String(process.env.VITE_ADSBAO_REALTIME_URL || "").trim()
      : "";
  return envUrl || resolveSameOriginRealtimeUrl();
}

function resolveWebSocketConstructor(): RealtimeSocketConstructor | null {
  return typeof WebSocket !== "undefined"
    ? (WebSocket as unknown as RealtimeSocketConstructor)
    : null;
}

function resolveTimerHost(): RealtimeTimerHost | null {
  return typeof window !== "undefined"
    ? {
        setTimeout: window.setTimeout.bind(window),
        clearTimeout: window.clearTimeout.bind(window),
        setInterval: window.setInterval.bind(window),
        clearInterval: window.clearInterval.bind(window),
        addEventListener: window.addEventListener.bind(window),
        removeEventListener: window.removeEventListener.bind(window),
      }
    : null;
}

function resolveDocumentHost(): RealtimeDocumentHost | null {
  return typeof document !== "undefined" ? document : null;
}

async function fetchRealtimeAuthToken(provider: string) {
  const response = await fetch(
    `/api/realtime/auth?provider=${encodeURIComponent(provider)}`,
    {
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    },
  );
  if (!response.ok) {
    throw new Error(`Realtime auth failed (${response.status})`);
  }
  const payload = await response.json();
  const token = String(payload?.token || "");
  if (!token) throw new Error("Realtime auth response omitted token");
  return token;
}

function realtimeSubscriptionKey(channel: string, params?: Record<string, unknown>) {
  return `${channel}|${JSON.stringify(params || {})}`;
}

function flightAwareProviderFromParams(params?: Record<string, unknown>) {
  if (!params) return "";
  const routeProvider = String(params.routeProvider || "").trim().toLowerCase();
  if (routeProvider === "flightaware") return "flightaware";
  if (params.flightAware === true || String(params.flightAware || "").toLowerCase() === "true") {
    return "flightaware";
  }
  return "";
}

function routeProviderFromParams(params?: Record<string, unknown>) {
  const provider = String(params?.routeProvider || "").trim().toLowerCase();
  return provider === "flightaware" || provider === "adsbdb" ? provider : "";
}

export class AdsbaoRealtimeClient {
  private readonly url: string;
  private readonly WebSocketCtor: RealtimeSocketConstructor | null;
  private readonly timerHost: RealtimeTimerHost | null;
  private readonly documentHost: RealtimeDocumentHost | null;
  private readonly reconnectBaseDelayMs: number;
  private readonly reconnectMaxDelayMs: number;
  private readonly connectTimeoutMs: number;
  private readonly heartbeatIntervalMs: number;
  private readonly heartbeatTimeoutMs: number;
  private readonly authTokenFetcher: RealtimeAuthTokenFetcher | null;
  private socket: RealtimeSocket | null = null;
  private connectionState: ConnectionState;
  private reconnectTimer: number | null = null;
  private connectTimeoutTimer: number | null = null;
  private connectStartedAt = 0;
  private heartbeatIntervalTimer: number | null = null;
  private heartbeatTimeoutTimer: number | null = null;
  private intentionalClose = false;
  private reconnectAttempt = 0;
  private readonly subscriptions = new Map<string, StoredRealtimeSubscription>();
  private readonly listeners = new Set<(event: AdsbaoRealtimeEvent) => void>();
  private readonly stateListeners = new Set<(state: ConnectionState) => void>();
  private readonly handleWindowReconnect = () => this.reconnectIfNeeded("window");
  private readonly handleVisibilityReconnect = () => {
    if (this.documentHost?.hidden) return;
    this.reconnectIfNeeded("visibility");
  };

  constructor(url = resolveRealtimeUrl(), options: AdsbaoRealtimeClientOptions = {}) {
    this.url = url;
    this.WebSocketCtor = options.WebSocketCtor || resolveWebSocketConstructor();
    this.timerHost =
      options.timerHost === undefined ? resolveTimerHost() : options.timerHost;
    this.documentHost =
      options.documentHost === undefined
        ? resolveDocumentHost()
        : options.documentHost;
    this.reconnectBaseDelayMs = options.reconnectBaseDelayMs ?? 500;
    this.reconnectMaxDelayMs = options.reconnectMaxDelayMs ?? 30_000;
    this.connectTimeoutMs = options.connectTimeoutMs ?? 8_000;
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 25_000;
    this.heartbeatTimeoutMs = options.heartbeatTimeoutMs ?? 10_000;
    this.authTokenFetcher =
      options.authTokenFetcher === undefined
        ? fetchRealtimeAuthToken
        : options.authTokenFetcher;
    this.connectionState = url ? "closed" : "disabled";
    this.installLifecycleReconnectHandlers();
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
    if (!this.url || !this.WebSocketCtor) {
      this.setState("disabled");
      this.syncDebug({ lastConnectSkippedReason: "missing-url-or-websocket" });
      return;
    }
    if (
      this.socket &&
      this.socket.readyState === this.WebSocketCtor.CONNECTING &&
      !this.closeStaleConnectingSocket("connect")
    ) {
      return;
    }
    if (this.socket && this.socket.readyState <= this.WebSocketCtor.OPEN) {
      return;
    }

    this.setState("connecting");
    this.intentionalClose = false;
    const socket = new this.WebSocketCtor(this.url);
    this.socket = socket;
    this.startConnectTimeout(socket);
    this.syncDebug({ lastSocketUrl: this.url });

    socket.addEventListener("open", () => {
      if (this.socket !== socket) return;
      this.clearConnectTimeout();
      this.reconnectAttempt = 0;
      this.setState("open");
      this.startHeartbeat();
      this.resubscribeAll();
    });
    socket.addEventListener("message", (event) => {
      if (this.socket !== socket) return;
      this.handleMessage(event.data);
    });
    socket.addEventListener("close", () => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.clearConnectTimeout();
      this.stopHeartbeat();
      this.setState(this.url ? "closed" : "disabled");
      if (this.intentionalClose) {
        this.intentionalClose = false;
        return;
      }
      this.scheduleReconnect();
    });
    socket.addEventListener("error", () => {
      if (this.socket !== socket) return;
      this.syncDebug({ lastSocketErrorAt: new Date().toISOString() });
      socket.close();
    });
  }

  disconnect() {
    if (this.reconnectTimer && this.timerHost) {
      this.timerHost.clearTimeout(this.reconnectTimer);
    }
    this.reconnectTimer = null;
    this.clearConnectTimeout();
    this.stopHeartbeat();
    const socket = this.socket;
    this.socket = null;
    this.intentionalClose = true;
    if (socket) {
      try {
        socket.close();
      } catch {
        // Ignore close errors from half-open sockets; there is no active
        // subscription left and the client is already detached from it.
      }
    }
    this.intentionalClose = false;
    this.setState(this.url ? "closed" : "disabled");
  }

  subscribe({
    channel,
    params,
    listener,
  }: RealtimeSubscription): () => void {
    if (!channel) return () => {};
    const key = realtimeSubscriptionKey(channel, params);
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
      this.sendSubscribe({ channel, params });
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
        this.send({ type: "unsubscribe", channel, params: current.params });
        if (this.subscriptions.size === 0) {
          this.disconnect();
        }
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
    if (!this.canSend()) {
      return;
    }
    this.socket.send(JSON.stringify(payload));
  }

  private resubscribeAll() {
    for (const subscription of this.subscriptions.values()) {
      this.sendSubscribe(subscription);
    }
  }

  private sendSubscribe(subscription: Pick<StoredRealtimeSubscription, "channel" | "params">) {
    if (!this.canSend()) return;
    const provider = flightAwareProviderFromParams(subscription.params);
    if (!provider) {
      this.send({
        type: "subscribe",
        channel: subscription.channel,
        params: subscription.params,
      });
      return;
    }
    void this.sendAuthenticatedSubscribe(subscription, provider);
  }

  private async sendAuthenticatedSubscribe(
    subscription: Pick<StoredRealtimeSubscription, "channel" | "params">,
    provider: string,
  ) {
    const params = await this.withAuthParams(subscription.params, provider);
    if (!this.hasActiveSubscription(subscription.channel, subscription.params)) return;
    this.send({
      type: "subscribe",
      channel: subscription.channel,
      params,
    });
  }

  private async withAuthParams(params: Record<string, unknown> | undefined, provider: string) {
    try {
      if (!this.authTokenFetcher) {
        throw new Error("Realtime auth token fetcher is not configured");
      }
      const token = await this.authTokenFetcher(provider);
      return {
        ...(params || {}),
        realtimeAuthToken: token,
      };
    } catch (error) {
      this.syncDebug({
        lastAuthErrorAt: new Date().toISOString(),
        lastAuthProvider: provider,
        lastAuthError:
          error instanceof Error ? error.message : String(error || "unknown"),
      });
      return params;
    }
  }

  private hasActiveSubscription(channel: string, params?: Record<string, unknown>) {
    return this.subscriptions.has(realtimeSubscriptionKey(channel, params));
  }

  private canSend() {
    return Boolean(
      this.socket &&
        this.WebSocketCtor &&
        this.socket.readyState === this.WebSocketCtor.OPEN,
    );
  }

  private scheduleReconnect() {
    if (
      !this.shouldMaintainConnection() ||
      this.reconnectTimer ||
      !this.timerHost
    ) {
      return;
    }
    const delay = Math.min(
      this.reconnectMaxDelayMs,
      this.reconnectBaseDelayMs * 2 ** this.reconnectAttempt,
    );
    this.reconnectAttempt += 1;
    this.reconnectTimer = this.timerHost.setTimeout(() => {
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
    if (event.type === "pong") {
      this.clearHeartbeatTimeout();
      this.syncDebug({ lastPongAt: new Date().toISOString() });
      return;
    }
    this.syncDebug({
      lastEventAt: new Date().toISOString(),
      lastEventChannel: event.channel,
      lastEventType: event.type,
    });

    for (const listener of this.listeners) listener(event);
    for (const subscription of this.subscriptions.values()) {
      if (!this.subscriptionMatchesEvent(subscription, event)) continue;
      for (const listener of subscription.listeners) listener(event);
    }
  }

  private subscriptionMatchesEvent(
    subscription: StoredRealtimeSubscription,
    event: AdsbaoRealtimeEvent,
  ) {
    if (subscription.channel !== event.channel) return false;
    if (event.type !== "route:update") return true;
    const provider = routeProviderFromParams(subscription.params);
    if (!provider || !event.source) return true;
    return provider === String(event.source).trim().toLowerCase();
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

  private shouldMaintainConnection() {
    return Boolean(this.url && this.subscriptions.size > 0);
  }

  private reconnectIfNeeded(reason: string) {
    if (!this.shouldMaintainConnection()) return;
    if (
      this.socket &&
      this.WebSocketCtor &&
      this.socket.readyState === this.WebSocketCtor.OPEN
    ) {
      this.sendHeartbeat();
      return;
    }
    if (
      this.socket &&
      this.WebSocketCtor &&
      this.socket.readyState === this.WebSocketCtor.CONNECTING
    ) {
      this.closeStaleConnectingSocket(reason);
      return;
    }
    this.syncDebug({
      lastReconnectReason: reason,
      lastReconnectAt: new Date().toISOString(),
    });
    this.connect();
  }

  private installLifecycleReconnectHandlers() {
    this.timerHost?.addEventListener?.("online", this.handleWindowReconnect);
    this.timerHost?.addEventListener?.("focus", this.handleWindowReconnect);
    this.documentHost?.addEventListener?.(
      "visibilitychange",
      this.handleVisibilityReconnect,
    );
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    if (
      !this.timerHost ||
      this.heartbeatIntervalMs <= 0 ||
      this.heartbeatTimeoutMs <= 0
    ) {
      return;
    }
    this.heartbeatIntervalTimer = this.timerHost.setInterval(() => {
      this.sendHeartbeat();
    }, this.heartbeatIntervalMs);
  }

  private stopHeartbeat() {
    if (this.heartbeatIntervalTimer && this.timerHost) {
      this.timerHost.clearInterval(this.heartbeatIntervalTimer);
    }
    this.heartbeatIntervalTimer = null;
    this.clearHeartbeatTimeout();
  }

  private startConnectTimeout(socket: RealtimeSocket) {
    this.clearConnectTimeout();
    this.connectStartedAt = Date.now();
    if (!this.timerHost || this.connectTimeoutMs <= 0 || !this.WebSocketCtor) {
      return;
    }
    this.connectTimeoutTimer = this.timerHost.setTimeout(() => {
      this.connectTimeoutTimer = null;
      if (
        this.socket !== socket ||
        !this.WebSocketCtor ||
        socket.readyState !== this.WebSocketCtor.CONNECTING
      ) {
        return;
      }
      this.syncDebug({ lastConnectTimeoutAt: new Date().toISOString() });
      socket.close();
    }, this.connectTimeoutMs);
  }

  private clearConnectTimeout() {
    if (this.connectTimeoutTimer && this.timerHost) {
      this.timerHost.clearTimeout(this.connectTimeoutTimer);
    }
    this.connectTimeoutTimer = null;
    this.connectStartedAt = 0;
  }

  private closeStaleConnectingSocket(reason: string) {
    if (
      !this.socket ||
      !this.WebSocketCtor ||
      this.socket.readyState !== this.WebSocketCtor.CONNECTING ||
      this.connectTimeoutMs <= 0
    ) {
      return false;
    }
    const startedAt = this.connectStartedAt;
    if (!startedAt || Date.now() - startedAt < this.connectTimeoutMs) {
      return false;
    }
    this.syncDebug({
      lastConnectTimeoutAt: new Date().toISOString(),
      lastReconnectReason: reason,
    });
    this.socket.close();
    return true;
  }

  private clearHeartbeatTimeout() {
    if (this.heartbeatTimeoutTimer && this.timerHost) {
      this.timerHost.clearTimeout(this.heartbeatTimeoutTimer);
    }
    this.heartbeatTimeoutTimer = null;
  }

  private sendHeartbeat() {
    if (
      !this.timerHost ||
      !this.socket ||
      !this.WebSocketCtor ||
      this.socket.readyState !== this.WebSocketCtor.OPEN ||
      this.heartbeatTimeoutTimer
    ) {
      return;
    }
    const socket = this.socket;
    this.send({ type: "ping" });
    this.syncDebug({ lastPingAt: new Date().toISOString() });
    this.heartbeatTimeoutTimer = this.timerHost.setTimeout(() => {
      this.heartbeatTimeoutTimer = null;
      if (this.socket !== socket) return;
      this.syncDebug({ lastPongTimeoutAt: new Date().toISOString() });
      socket.close();
    }, this.heartbeatTimeoutMs);
  }
}

let singleton: AdsbaoRealtimeClient | null = null;

export function getAdsbaoRealtimeClient() {
  if (!singleton) singleton = new AdsbaoRealtimeClient();
  return singleton;
}
