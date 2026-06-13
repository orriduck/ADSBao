import type { DebugChannel, RealtimeChannelType } from "../types.js";

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

type ExternalRequestInput = {
  provider: string;
  endpoint: "positions" | "callsign" | "aircraft" | "route" | "unknown";
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
  if (
    channelType === "airport" ||
    channelType === "bbox" ||
    channelType === "viewport"
  ) {
    return "positions";
  }
  if (channelType === "callsign") return "callsign";
  if (channelType === "aircraft") return "aircraft";
  if (channelType === "route") return "route";
  return "unknown";
}

export class DataServiceMetrics {
  private wsConnectionsCurrent = 0;
  private readonly counters = new Map<string, CounterState>();
  private readonly histograms = new Map<string, HistogramState>();

  recordWsConnectionOpened() {
    this.wsConnectionsCurrent += 1;
    this.increment("adsbao_ws_connections_total", {});
  }

  recordWsConnectionClosed() {
    this.wsConnectionsCurrent = Math.max(0, this.wsConnectionsCurrent - 1);
  }

  recordWsMessage({ direction, type, result }: WsMessageInput) {
    this.increment("adsbao_ws_messages_total", {
      direction,
      result,
      type,
    });
  }

  recordWsSubscribe({ channelType, result }: WsSubscribeInput) {
    this.increment("adsbao_ws_subscribe_total", {
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

  recordExternalRequest(input: ExternalRequestInput) {
    const labels = {
      endpoint: input.endpoint,
      provider: input.provider,
      result: input.result,
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

  private observe(name: string, labels: Labels, value: number) {
    const key = seriesKey(name, labels);
    let state = this.histograms.get(key);
    if (!state) {
      state = {
        labels,
        buckets: new Map(DURATION_BUCKETS.map((bucket) => [bucket, 0])),
        count: 0,
        name,
        sum: 0,
      };
      this.histograms.set(key, state);
    }
    for (const bucket of DURATION_BUCKETS) {
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
    const subscribersByType = new Map<string, number>();
    for (const channel of channels) {
      activeByType.set(channel.type, (activeByType.get(channel.type) || 0) + 1);
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
      for (const bucket of DURATION_BUCKETS) {
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
