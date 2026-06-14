import type {
  DebugChannel,
  ExternalRequestMetricInput,
  RealtimeChannelType,
} from "../types.js";

type LabelValue = string | number | boolean | null | undefined;
type Labels = Record<string, LabelValue>;

type RenderInput = {
  uptimeSec: number;
  channels: DebugChannel[];
};

type WsMessageInput = {
  direction: "inbound" | "outbound";
  type: string;
  result: "ok" | "error";
  bytes?: number;
};

type WsConnectionCloseInput = {
  code?: number | string | null;
  durationMs?: number;
  result?: "closed" | "error";
};

type WsUpgradeInput = {
  reason: "ok" | "path" | "origin";
  result: "accepted" | "rejected";
};

type WsSubscribeInput = {
  channelType: RealtimeChannelType | "unknown";
  result: "ok" | "duplicate" | "invalid" | "limit" | "error";
};

type PollInput = {
  channelType: RealtimeChannelType;
  source: string;
  result: "success" | "error";
  durationMs: number;
};

type HistogramState = {
  labels: Labels;
  buckets: Map<number, number>;
  count: number;
  name: string;
  sum: number;
};

type CounterState = {
  labels: Labels;
  name: string;
  value: number;
};

const DURATION_BUCKETS = Object.freeze([
  0.05,
  0.1,
  0.25,
  0.5,
  1,
  2.5,
  5,
  10,
  30,
]);

const MESSAGE_BYTE_BUCKETS = Object.freeze([
  128,
  512,
  1024,
  4 * 1024,
  16 * 1024,
  64 * 1024,
  256 * 1024,
  1024 * 1024,
]);

function normalizeLabelValue(value: LabelValue) {
  return String(value ?? "unknown")
    .trim()
    .replace(/[^a-zA-Z0-9_.:+-]+/g, "_")
    .slice(0, 80) || "unknown";
}

function seriesKey(name: string, labels: Labels) {
  const labelsKey = Object.keys(labels)
    .sort()
    .map((key) => `${key}=${normalizeLabelValue(labels[key])}`)
    .join(",");
  return `${name}|${labelsKey}`;
}

function labelText(labels: Labels) {
  const keys = Object.keys(labels).sort();
  if (keys.length === 0) return "";
  return `{${keys
    .map((key) => {
      const value = normalizeLabelValue(labels[key])
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"');
      return `${key}="${value}"`;
    })
    .join(",")}}`;
}

function metricLine(name: string, labels: Labels, value: number) {
  return `${name}${labelText(labels)} ${Number.isFinite(value) ? value : 0}`;
}

function classifyEndpoint(channelType: RealtimeChannelType) {
  if (channelType === "traffic") return "positions";
  if (channelType === "callsign") return "callsign";
  if (channelType === "aircraft") return "aircraft";
  if (channelType === "route") return "route";
  return "unknown";
}

function classifyStatus(status: ExternalRequestMetricInput["status"], result: string) {
  if (typeof status === "number" && Number.isFinite(status)) {
    return `${Math.floor(status / 100)}xx`;
  }
  const normalized = normalizeLabelValue(status).toLowerCase();
  if (normalized !== "unknown") return normalized;
  return result === "success" ? "ok" : "unknown";
}

export class DataServiceMetrics {
  private wsConnectionsCurrent = 0;
  private readonly counters = new Map<string, CounterState>();
  private readonly histograms = new Map<string, HistogramState>();

  recordWsUpgrade({ reason, result }: WsUpgradeInput) {
    this.increment("adsbao_ws_upgrades_total", { reason, result });
  }

  recordWsConnectionOpened() {
    this.wsConnectionsCurrent += 1;
    this.increment("adsbao_ws_connections_total", {});
  }

  recordWsConnectionClosed({
    code = "unknown",
    durationMs = 0,
    result = "closed",
  }: WsConnectionCloseInput = {}) {
    this.wsConnectionsCurrent = Math.max(0, this.wsConnectionsCurrent - 1);
    const labels = {
      close_code: code,
      result,
    };
    this.increment("adsbao_ws_disconnects_total", labels);
    if (durationMs > 0) {
      this.observe(
        "adsbao_ws_connection_duration_seconds",
        labels,
        durationMs / 1000,
      );
    }
  }

  recordWsMessage({ bytes, direction, type, result }: WsMessageInput) {
    const labels = {
      direction,
      result,
      type,
    };
    this.increment("adsbao_ws_messages_total", labels);
    if (typeof bytes === "number" && bytes >= 0) {
      this.observe(
        "adsbao_ws_message_bytes",
        labels,
        bytes,
        MESSAGE_BYTE_BUCKETS,
      );
    }
  }

  recordWsSubscribe({ channelType, result }: WsSubscribeInput) {
    this.increment("adsbao_ws_subscribe_total", {
      channel_type: channelType,
      result,
    });
  }

  recordWsUnsubscribe({ channelType, result }: WsSubscribeInput) {
    this.increment("adsbao_ws_unsubscribe_total", {
      channel_type: channelType,
      result,
    });
  }

  recordPoll({ channelType, source, result, durationMs }: PollInput) {
    const labels = {
      channel_type: channelType,
      result,
      source,
    };
    this.increment("adsbao_poll_requests_total", labels);
    this.observe("adsbao_poll_duration_seconds", labels, durationMs / 1000);
  }

  recordExternalRequest(input: ExternalRequestMetricInput) {
    const labels = {
      endpoint: input.endpoint,
      provider: input.provider,
      result: input.result,
      status: input.status ?? "unknown",
      status_class: classifyStatus(input.status, input.result),
    };
    this.increment("adsbao_external_requests_total", labels);
    this.observe(
      "adsbao_external_request_duration_seconds",
      labels,
      input.durationMs / 1000,
    );
  }

  recordExternalRequestForPoll({
    channelType,
    provider,
    result,
    durationMs,
  }: {
    channelType: RealtimeChannelType;
    provider: string;
    result: "success" | "error";
    durationMs: number;
  }) {
    this.recordExternalRequest({
      provider,
      endpoint: classifyEndpoint(channelType),
      result,
      durationMs,
    });
  }

  render({ uptimeSec, channels }: RenderInput) {
    const lines: string[] = [];
    this.renderGauge(lines, {
      name: "adsbao_uptime_seconds",
      help: "Process uptime in seconds.",
      values: [{ labels: {}, value: Math.round(uptimeSec) }],
    });
    this.renderGauge(lines, {
      name: "adsbao_ws_connections_current",
      help: "Current open WebSocket connections.",
      values: [{ labels: {}, value: this.wsConnectionsCurrent }],
    });
    this.renderDynamicChannelGauges(lines, channels);
    this.renderCounters(lines);
    this.renderHistograms(lines);
    return `${lines.join("\n")}\n`;
  }

  private increment(name: string, labels: Labels, value = 1) {
    const key = seriesKey(name, labels);
    const existing = this.counters.get(key);
    if (existing) {
      existing.value += value;
      return;
    }
    this.counters.set(key, { labels, name, value });
  }

  private observe(
    name: string,
    labels: Labels,
    value: number,
    buckets: readonly number[] = DURATION_BUCKETS,
  ) {
    const key = seriesKey(name, labels);
    let state = this.histograms.get(key);
    if (!state) {
      state = {
        labels,
        buckets: new Map(buckets.map((bucket) => [bucket, 0])),
        count: 0,
        name,
        sum: 0,
      };
      this.histograms.set(key, state);
    }
    for (const bucket of state.buckets.keys()) {
      if (value <= bucket) {
        state.buckets.set(bucket, (state.buckets.get(bucket) || 0) + 1);
      }
    }
    state.count += 1;
    state.sum += value;
  }

  private renderGauge(
    lines: string[],
    {
      name,
      help,
      values,
    }: {
      name: string;
      help: string;
      values: Array<{ labels: Labels; value: number }>;
    },
  ) {
    lines.push(`# HELP ${name} ${help}`);
    lines.push(`# TYPE ${name} gauge`);
    for (const item of values) {
      lines.push(metricLine(name, item.labels, item.value));
    }
  }

  private renderDynamicChannelGauges(lines: string[], channels: DebugChannel[]) {
    const activeByType = new Map<string, number>();
    const failureSumByType = new Map<string, number>();
    const maxIntervalByType = new Map<string, number>();
    const staleByType = new Map<string, number>();
    const subscribersByType = new Map<string, number>();
    for (const channel of channels) {
      activeByType.set(channel.type, (activeByType.get(channel.type) || 0) + 1);
      failureSumByType.set(
        channel.type,
        (failureSumByType.get(channel.type) || 0) + channel.consecutiveFailures,
      );
      maxIntervalByType.set(
        channel.type,
        Math.max(maxIntervalByType.get(channel.type) || 0, channel.currentIntervalMs),
      );
      if (channel.stale) {
        staleByType.set(channel.type, (staleByType.get(channel.type) || 0) + 1);
      }
      subscribersByType.set(
        channel.type,
        (subscribersByType.get(channel.type) || 0) + channel.subscriberCount,
      );
    }
    this.renderGauge(lines, {
      name: "adsbao_active_channels_current",
      help: "Current active polling channels by channel type.",
      values: [...activeByType].map(([channelType, value]) => ({
        labels: { channel_type: channelType },
        value,
      })),
    });
    this.renderGauge(lines, {
      name: "adsbao_subscriptions_current",
      help: "Current active subscriptions by channel type.",
      values: [...subscribersByType].map(([channelType, value]) => ({
        labels: { channel_type: channelType },
        value,
      })),
    });
    this.renderGauge(lines, {
      name: "adsbao_channel_consecutive_failures_current",
      help: "Current sum of consecutive polling failures by channel type.",
      values: [...failureSumByType].map(([channelType, value]) => ({
        labels: { channel_type: channelType },
        value,
      })),
    });
    this.renderGauge(lines, {
      name: "adsbao_channel_poll_interval_seconds",
      help: "Current maximum polling interval in seconds by channel type.",
      values: [...maxIntervalByType].map(([channelType, value]) => ({
        labels: { channel_type: channelType },
        value: Number((value / 1000).toFixed(3)),
      })),
    });
    this.renderGauge(lines, {
      name: "adsbao_stale_channels_current",
      help: "Current stale polling channels by channel type.",
      values: [...staleByType].map(([channelType, value]) => ({
        labels: { channel_type: channelType },
        value,
      })),
    });
  }

  private renderCounters(lines: string[]) {
    const grouped = new Map<string, CounterState[]>();
    for (const counter of this.counters.values()) {
      const entries = grouped.get(counter.name) || [];
      entries.push(counter);
      grouped.set(counter.name, entries);
    }
    for (const [name, entries] of [...grouped].sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      lines.push(`# HELP ${name} Counter for ${name}.`);
      lines.push(`# TYPE ${name} counter`);
      for (const entry of entries.sort((a, b) =>
        seriesKey("", a.labels).localeCompare(seriesKey("", b.labels)),
      )) {
        lines.push(metricLine(name, entry.labels, entry.value));
      }
    }
  }

  private renderHistograms(lines: string[]) {
    for (const state of [...this.histograms.values()].sort((a, b) =>
      seriesKey(a.name, a.labels).localeCompare(seriesKey(b.name, b.labels)),
    )) {
      lines.push(`# HELP ${state.name} Histogram for ${state.name}.`);
      lines.push(`# TYPE ${state.name} histogram`);
      for (const bucket of state.buckets.keys()) {
        lines.push(
          metricLine(
            `${state.name}_bucket`,
            { ...state.labels, le: String(bucket) },
            state.buckets.get(bucket) || 0,
          ),
        );
      }
      lines.push(
        metricLine(
          `${state.name}_bucket`,
          { ...state.labels, le: "+Inf" },
          state.count,
        ),
      );
      lines.push(
        metricLine(
          `${state.name}_sum`,
          state.labels,
          Number(state.sum.toFixed(6)),
        ),
      );
      lines.push(metricLine(`${state.name}_count`, state.labels, state.count));
    }
  }
}
