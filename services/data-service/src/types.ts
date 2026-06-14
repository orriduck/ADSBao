export type RealtimeChannelType =
  | "aircraft"
  | "callsign"
  | "camera"
  | "route"
  | "session"
  | "traffic";

type RealtimeEventType =
  | "aircraft:update"
  | "channel:error"
  | "connection:ready"
  | "route:update";

export type RealtimeEvent<TData = unknown> = {
  type: RealtimeEventType | string;
  channel: string;
  source: string;
  fetchedAt: string;
  stale: boolean;
  data: TData;
  error?: string;
};

export type PollingTarget =
  | {
      kind: "positions";
      lat: number;
      lon: number;
      distNm: number;
    }
  | {
      kind: "callsign";
      callsign: string;
      flightAwareFallback?: boolean;
    }
  | {
      kind: "aircraft";
      hex: string;
    }
  | {
      kind: "route";
      callsign: string;
      provider?: "adsbdb" | "flightaware";
      context?: {
        type: "airport";
        icao: string;
      } | {
        type: "center";
        lat: number;
        lon: number;
      };
    };

export type SubscribeParams = {
  lat?: unknown;
  lon?: unknown;
  distNm?: unknown;
  [key: string]: unknown;
};

export type ExternalRequestEndpoint =
  | "positions"
  | "callsign"
  | "aircraft"
  | "route"
  | "unknown";

export type ExternalRequestMetricInput = {
  provider: string;
  endpoint: ExternalRequestEndpoint;
  result: "success" | "error";
  durationMs: number;
  status?: number | string | null;
};

export type DataServiceMetricsSink = {
  recordExternalRequest(input: ExternalRequestMetricInput): void;
};

export type FetchChannelInput = {
  channel: string;
  channelType: RealtimeChannelType;
  target: PollingTarget;
  params: SubscribeParams;
  metrics?: DataServiceMetricsSink;
};

export type FetchChannel = (
  input: FetchChannelInput,
) => Promise<RealtimeEvent>;

export type ClientMessage =
  | {
      type: "subscribe";
      channel: string;
      params?: SubscribeParams;
    }
  | {
      type: "unsubscribe";
      channel: string;
    }
  | {
      type: "ping";
    };

export type DebugChannel = {
  key: string;
  channel: string;
  type: RealtimeChannelType;
  subscriberCount: number;
  currentIntervalMs: number;
  lastFetchedAt: string | null;
  lastError: string | null;
  source: string | null;
  stale: boolean;
  consecutiveFailures: number;
};
