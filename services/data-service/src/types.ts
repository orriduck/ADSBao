export type RealtimeChannelType =
  | "airport"
  | "aircraft"
  | "bbox"
  | "callsign"
  | "camera"
  | "route"
  | "session"
  | "viewport";

export type RealtimeEventType =
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
    }
  | {
      kind: "aircraft";
      hex: string;
    }
  | {
      kind: "route";
      callsign: string;
    };

export type SubscribeParams = {
  lat?: unknown;
  lon?: unknown;
  distNm?: unknown;
  [key: string]: unknown;
};

export type FetchChannelInput = {
  channel: string;
  channelType: RealtimeChannelType;
  target: PollingTarget;
  params: SubscribeParams;
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
