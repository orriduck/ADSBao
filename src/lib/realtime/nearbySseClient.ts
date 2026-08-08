export const NEARBY_SSE_EVENT_TYPES = [
  "nearby:snapshot",
  "nearby:traffic",
  "nearby:status",
] as const;

export type NearbySseEventType = (typeof NEARBY_SSE_EVENT_TYPES)[number];
export type NearbySseState =
  | "disabled"
  | "loading"
  | "live"
  | "stale"
  | "reconnecting";

export type NearbySseEnvelope<TData = Record<string, unknown>> = {
  protocolVersion: "1" | string;
  channel: string;
  eventId: string;
  sequence: number;
  emittedAt: string;
  fetchedAt?: string;
  stale: boolean;
  data: TData;
  statusCode?: string;
  nextRetryAt?: string;
};

export type NearbySseEvent<TData = Record<string, unknown>> =
  NearbySseEnvelope<TData> & {
    type: NearbySseEventType;
  };

export type NearbySseRequest = {
  key: string;
  channel: string;
  url: string;
};

type EventSourceMessage = {
  data?: unknown;
};

type EventSourceLike = {
  close: () => void;
  addEventListener: (
    type: string,
    listener: (event: EventSourceMessage) => void,
  ) => void;
  onopen: (() => void) | null;
  onerror: (() => void) | null;
};

type EventSourceConstructor = new (url: string) => EventSourceLike;

type Listener = (event: NearbySseEvent) => void;
type StateListener = (state: NearbySseState) => void;

type StoredSource = {
  request: NearbySseRequest;
  source: EventSourceLike | null;
  listeners: Set<Listener>;
  stateListeners: Set<StateListener>;
  releaseTimer: number | null;
  state: NearbySseState;
  hasDataFrame: boolean;
};

type TimerHost = Pick<typeof globalThis, "setTimeout" | "clearTimeout">;

export type NearbySseClientOptions = {
  EventSourceCtor?: EventSourceConstructor | null;
  timerHost?: TimerHost;
  releaseGraceMs?: number;
};

declare global {
  interface Window {
    __adsbaoNearbySseDebug?: Record<string, unknown>;
  }
}

function browserEventSource(): EventSourceConstructor | null {
  return typeof EventSource === "undefined"
    ? null
    : (EventSource as unknown as EventSourceConstructor);
}

function browserTimerHost(): TimerHost {
  return globalThis;
}

function parseEvent(type: NearbySseEventType, input: unknown): NearbySseEvent | null {
  if (typeof input !== "string") return null;
  try {
    const value = JSON.parse(input) as Partial<NearbySseEnvelope>;
    if (!value || typeof value !== "object" || typeof value.channel !== "string") {
      return null;
    }
    return {
      protocolVersion: String(value.protocolVersion || ""),
      channel: value.channel,
      eventId: String(value.eventId || ""),
      sequence: Number(value.sequence) || 0,
      emittedAt: String(value.emittedAt || ""),
      fetchedAt: value.fetchedAt ? String(value.fetchedAt) : undefined,
      stale: value.stale === true,
      data:
        value.data && typeof value.data === "object"
          ? (value.data as Record<string, unknown>)
          : {},
      statusCode: value.statusCode ? String(value.statusCode) : undefined,
      nextRetryAt: value.nextRetryAt ? String(value.nextRetryAt) : undefined,
      type,
    };
  } catch {
    return null;
  }
}

/**
 * A tab-local EventSource registry. Keeping the stream name and URL in one
 * place gives Chrome DevTools an inspectable request per logical nearby key,
 * while reference counting prevents duplicate consumers from opening copies.
 */
export class NearbySseClient {
  private readonly EventSourceCtor: EventSourceConstructor | null;
  private readonly timerHost: TimerHost;
  private readonly releaseGraceMs: number;
  private readonly sources = new Map<string, StoredSource>();

  constructor(options: NearbySseClientOptions = {}) {
    this.EventSourceCtor =
      options.EventSourceCtor === undefined
        ? browserEventSource()
        : options.EventSourceCtor;
    this.timerHost = options.timerHost || browserTimerHost();
    this.releaseGraceMs = options.releaseGraceMs ?? 15_000;
  }

  get enabled() {
    return Boolean(this.EventSourceCtor);
  }

  subscribe({
    request,
    listener,
    onState,
  }: {
    request: NearbySseRequest;
    listener: Listener;
    onState?: StateListener;
  }) {
    if (!request?.key || !request?.url || !this.EventSourceCtor) {
      onState?.("disabled");
      return () => {};
    }

    let stored = this.sources.get(request.key);
    if (!stored) {
      stored = {
        request,
        source: null,
        listeners: new Set(),
        stateListeners: new Set(),
        releaseTimer: null,
        state: "loading",
        hasDataFrame: false,
      };
      this.sources.set(request.key, stored);
      this.open(stored);
    }

    if (stored.releaseTimer != null) {
      this.timerHost.clearTimeout(stored.releaseTimer);
      stored.releaseTimer = null;
    }
    stored.listeners.add(listener);
    if (onState) {
      stored.stateListeners.add(onState);
      onState(stored.state);
    }
    this.syncDebug();

    return () => {
      const current = this.sources.get(request.key);
      if (!current) return;
      current.listeners.delete(listener);
      if (onState) current.stateListeners.delete(onState);
      this.scheduleRelease(current);
      this.syncDebug();
    };
  }

  restart(key: string) {
    const stored = this.sources.get(key);
    if (!stored || !this.EventSourceCtor) return;
    this.close(stored);
    stored.hasDataFrame = false;
    this.setState(stored, "loading");
    this.open(stored);
  }

  private open(stored: StoredSource) {
    if (!this.EventSourceCtor || stored.source) return;
    const source = new this.EventSourceCtor(stored.request.url);
    stored.source = source;
    source.onopen = () => {
      if (this.sources.get(stored.request.key) !== stored) return;
      this.setState(stored, stored.hasDataFrame ? "live" : "loading");
    };
    source.onerror = () => {
      if (this.sources.get(stored.request.key) !== stored) return;
      // Native EventSource owns reconnection and preserves Last-Event-ID.
      // The browser Network panel continues to show this same named stream.
      this.setState(stored, "reconnecting");
    };
    for (const type of NEARBY_SSE_EVENT_TYPES) {
      source.addEventListener(type, (message) => {
        if (this.sources.get(stored.request.key) !== stored) return;
        const event = parseEvent(type, message.data);
        if (!event || event.channel !== stored.request.channel) return;
        if (type !== "nearby:status") {
          stored.hasDataFrame = true;
          this.setState(stored, event.stale ? "stale" : "live");
        } else if (event.stale && stored.hasDataFrame) {
          this.setState(stored, "stale");
        }
        for (const listener of stored.listeners) listener(event);
      });
    }
  }

  private close(stored: StoredSource) {
    const source = stored.source;
    stored.source = null;
    if (!source) return;
    try {
      source.close();
    } catch {
      // There is no remaining consumer when close failures can occur.
    }
  }

  private scheduleRelease(stored: StoredSource) {
    if (stored.listeners.size > 0) return;
    if (stored.releaseTimer != null) return;
    const release = () => {
      stored.releaseTimer = null;
      if (stored.listeners.size > 0) return;
      this.close(stored);
      this.sources.delete(stored.request.key);
      this.syncDebug();
    };
    if (this.releaseGraceMs <= 0) {
      release();
      return;
    }
    stored.releaseTimer = this.timerHost.setTimeout(release, this.releaseGraceMs) as unknown as number;
  }

  private setState(stored: StoredSource, state: NearbySseState) {
    if (stored.state === state) return;
    stored.state = state;
    for (const listener of stored.stateListeners) listener(state);
    this.syncDebug();
  }

  private syncDebug() {
    if (typeof window === "undefined") return;
    window.__adsbaoNearbySseDebug = {
      sources: [...this.sources.values()].map((stored) => ({
        channel: stored.request.channel,
        url: stored.request.url,
        listeners: stored.listeners.size,
        state: stored.state,
        hasDataFrame: stored.hasDataFrame,
      })),
    };
  }
}

let defaultClient: NearbySseClient | null = null;

export function getNearbySseClient() {
  if (!defaultClient) defaultClient = new NearbySseClient();
  return defaultClient;
}
