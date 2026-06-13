import {
  buildChannelPollingTarget,
  getChannelBaseIntervalMs,
  getChannelType,
  normalizeChannelName,
} from "../channels/channelTypes.js";
import { MemoryTtlCache } from "../cache/memoryCache.js";
import type {
  DebugChannel,
  FetchChannel,
  PollingTarget,
  RealtimeChannelType,
  RealtimeEvent,
  SubscribeParams,
} from "../types.js";

type Subscriber = {
  id: number;
  send: (event: RealtimeEvent) => void;
};

type ChannelState = {
  key: string;
  channel: string;
  type: RealtimeChannelType;
  target: PollingTarget;
  params: SubscribeParams;
  subscribers: Map<number, Subscriber>;
  timer: ReturnType<typeof setTimeout> | null;
  inFlight: boolean;
  disposed: boolean;
  baseIntervalMs: number;
  currentIntervalMs: number;
  consecutiveFailures: number;
  lastFetchedAt: string | null;
  lastError: string | null;
  lastEvent: RealtimeEvent | null;
  source: string | null;
  stale: boolean;
};

type PollingSchedulerOptions = {
  fetchChannel: FetchChannel;
  minIntervalMs?: number;
  maxIntervalMs?: number;
  maxActiveChannels?: number;
  jitterRatio?: number;
  cacheTtlMs?: number;
  now?: () => number;
};

function formatTargetNumber(value: number) {
  return String(Number(value.toFixed(4)));
}

function buildChannelStateKey(
  channel: string,
  type: RealtimeChannelType,
  target: PollingTarget,
) {
  if (type !== "airport" || target.kind !== "positions") return channel;
  return [
    channel,
    formatTargetNumber(target.lat),
    formatTargetNumber(target.lon),
    String(target.distNm),
  ].join("|");
}

export class PollingScheduler {
  private readonly fetchChannel: FetchChannel;
  private readonly minIntervalMs: number;
  private readonly maxIntervalMs: number;
  private readonly maxActiveChannels: number;
  private readonly jitterRatio: number;
  private readonly cache: MemoryTtlCache<RealtimeEvent>;
  private readonly channels = new Map<string, ChannelState>();
  private subscriberId = 0;

  constructor({
    fetchChannel,
    minIntervalMs = 1_000,
    maxIntervalMs = 60_000,
    maxActiveChannels = 250,
    jitterRatio = 0.1,
    cacheTtlMs = 15_000,
    now = Date.now,
  }: PollingSchedulerOptions) {
    this.fetchChannel = fetchChannel;
    this.minIntervalMs = minIntervalMs;
    this.maxIntervalMs = maxIntervalMs;
    this.maxActiveChannels = maxActiveChannels;
    this.jitterRatio = jitterRatio;
    this.cache = new MemoryTtlCache<RealtimeEvent>({ ttlMs: cacheTtlMs, now });
  }

  subscribe({
    channel,
    params = {},
    send,
  }: {
    channel: string;
    params?: SubscribeParams;
    send: (event: RealtimeEvent) => void;
  }) {
    const normalized = normalizeChannelName(channel);
    if (normalized.ok !== true) throw new Error(normalized.error);
    const normalizedChannel = normalized.channel;
    const type = getChannelType(normalizedChannel);
    const target = buildChannelPollingTarget(normalizedChannel, params);
    const channelKey = buildChannelStateKey(normalizedChannel, type, target);
    let state = this.channels.get(channelKey);

    if (!state) {
      if (this.channels.size >= this.maxActiveChannels) {
        throw new Error("Active channel limit reached");
      }
      state = this.createChannelState({
        key: channelKey,
        channel: normalizedChannel,
        params,
        target,
        type,
      });
      this.channels.set(channelKey, state);
      this.poll(state);
    }

    const id = (this.subscriberId += 1);
    state.subscribers.set(id, { id, send });

    const cached = this.cache.get(channelKey) || state.lastEvent;
    if (cached) queueMicrotask(() => send(cached));

    return () => {
      const activeState = this.channels.get(channelKey);
      if (!activeState) return;
      activeState.subscribers.delete(id);
      if (activeState.subscribers.size === 0) {
        this.stopChannel(activeState);
      }
    };
  }

  getDebugChannels(): DebugChannel[] {
    return [...this.channels.values()]
      .map((state) => ({
        key: state.key,
        channel: state.channel,
        type: state.type,
        subscriberCount: state.subscribers.size,
        currentIntervalMs: state.currentIntervalMs,
        lastFetchedAt: state.lastFetchedAt,
        lastError: state.lastError,
        source: state.source,
        stale: state.stale,
        consecutiveFailures: state.consecutiveFailures,
      }))
      .sort((a, b) => a.channel.localeCompare(b.channel));
  }

  dispose() {
    for (const state of this.channels.values()) {
      this.stopChannel(state);
    }
    this.channels.clear();
    this.cache.clear();
  }

  private createChannelState(
    {
      key,
      channel,
      params,
      target,
      type,
    }: {
      key: string;
      channel: string;
      params: SubscribeParams;
      target: PollingTarget;
      type: RealtimeChannelType;
    },
  ): ChannelState {
    const baseIntervalMs = Math.max(
      this.minIntervalMs,
      getChannelBaseIntervalMs(type),
    );
    return {
      key,
      channel,
      type,
      target,
      params,
      subscribers: new Map(),
      timer: null,
      inFlight: false,
      disposed: false,
      baseIntervalMs,
      currentIntervalMs: baseIntervalMs,
      consecutiveFailures: 0,
      lastFetchedAt: null,
      lastError: null,
      lastEvent: null,
      source: null,
      stale: false,
    };
  }

  private stopChannel(state: ChannelState) {
    state.disposed = true;
    if (state.timer) clearTimeout(state.timer);
    state.timer = null;
    state.subscribers.clear();
    this.channels.delete(state.key);
  }

  private scheduleNext(state: ChannelState) {
    if (state.disposed || state.subscribers.size === 0) return;
    const backoffMultiplier = Math.min(16, 2 ** state.consecutiveFailures);
    const baseDelay = Math.min(
      this.maxIntervalMs,
      Math.max(this.minIntervalMs, state.baseIntervalMs * backoffMultiplier),
    );
    const jitter =
      this.jitterRatio > 0
        ? baseDelay * this.jitterRatio * (Math.random() * 2 - 1)
        : 0;
    const delay = Math.max(this.minIntervalMs, Math.round(baseDelay + jitter));
    state.currentIntervalMs = delay;
    state.timer = setTimeout(() => this.poll(state), delay);
  }

  private async poll(state: ChannelState) {
    if (state.inFlight || state.disposed) return;
    state.inFlight = true;
    try {
      const event = await this.fetchChannel({
        channel: state.channel,
        channelType: state.type,
        target: state.target,
        params: state.params,
      });
      state.consecutiveFailures = 0;
      state.lastFetchedAt = event.fetchedAt;
      state.lastError = null;
      state.lastEvent = event;
      state.source = event.source || null;
      state.stale = Boolean(event.stale);
      this.cache.set(state.key, event);
      this.broadcast(state, event);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      state.consecutiveFailures += 1;
      state.lastError = message;
      state.stale = true;
      const staleEvent: RealtimeEvent = {
        type: "channel:error",
        channel: state.channel,
        source: state.source || "failed",
        fetchedAt: new Date().toISOString(),
        stale: true,
        data: state.lastEvent?.data ?? null,
        error: message,
      };
      this.broadcast(state, staleEvent);
    } finally {
      state.inFlight = false;
      this.scheduleNext(state);
    }
  }

  private broadcast(state: ChannelState, event: RealtimeEvent) {
    for (const subscriber of state.subscribers.values()) {
      try {
        subscriber.send(event);
      } catch {
        state.subscribers.delete(subscriber.id);
      }
    }
  }
}
