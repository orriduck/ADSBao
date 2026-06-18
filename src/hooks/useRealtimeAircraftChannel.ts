import { useEffect, useMemo, useState } from "react";
import {
  type AdsbaoRealtimeEvent,
  getAdsbaoRealtimeClient,
} from "@/lib/realtime/adsbaoRealtimeClient";
import { shouldUseRealtimeFallback } from "@/lib/realtime/realtimeFallbackModel";
import {
  buildCallsignChannel,
} from "@/lib/realtime/realtimeChannels";

const INITIAL_REALTIME_GRACE_MS = 8_000;
const EMPTY_REALTIME_PARAMS: Record<string, unknown> = Object.freeze({});

type RealtimeHookOptions = {
  channel?: string;
  params?: Record<string, unknown>;
  enabled?: boolean;
};

declare global {
  interface Window {
    __adsbaoRealtimeHookDebug?: Record<string, unknown>;
  }
}

export function useRealtimeAircraftChannel({
  channel = "",
  params = EMPTY_REALTIME_PARAMS,
  enabled = true,
}: RealtimeHookOptions) {
  const client = useMemo(() => getAdsbaoRealtimeClient(), []);
  const [connectionState, setConnectionState] = useState(client.state);
  const [event, setEvent] = useState<AdsbaoRealtimeEvent | null>(null);
  const [graceExpired, setGraceExpired] = useState(false);
  const available = enabled && client.enabled && Boolean(channel);

  useEffect(() => {
    const unsubscribe = client.onConnectionState(setConnectionState);
    return () => {
      unsubscribe();
    };
  }, [client]);

  useEffect(() => {
    setEvent(null);
    setGraceExpired(false);
    if (!available) return undefined;

    const timer = window.setTimeout(
      () => setGraceExpired(true),
      INITIAL_REALTIME_GRACE_MS,
    );
    const unsubscribe = client.subscribe({
      channel,
      params,
      listener: (nextEvent) => {
        if (nextEvent.type === "aircraft:update" || nextEvent.type === "channel:error") {
          setEvent(nextEvent);
          setGraceExpired(false);
        }
      },
    });

    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [available, channel, client, params]);

  const fallbackActive = shouldUseRealtimeFallback({
    available,
    connectionState,
    eventType: event?.type || "",
    graceExpired,
    hasEvent: Boolean(event),
    hasEventData: Boolean(event?.data),
  });

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    window.__adsbaoRealtimeHookDebug = {
      available,
      channel,
      clientEnabled: client.enabled,
      connected: connectionState === "open",
      connectionState,
      enabled,
      fallbackActive,
      graceExpired,
      hasEvent: Boolean(event),
      params,
    };
  }, [
    available,
    channel,
    client,
    connectionState,
    enabled,
    event,
    fallbackActive,
    graceExpired,
    params,
  ]);

  return {
    available,
    connectionState,
    event,
    fallbackActive,
    connected: connectionState === "open",
  };
}

export function useAircraftTrackingRealtime(
  callsign: unknown,
  {
    enabled = true,
    flightAware = false,
  }: { enabled?: boolean; flightAware?: boolean } = {},
) {
  const channel = useMemo(() => buildCallsignChannel(callsign), [callsign]);
  const params = useMemo(
    () => (flightAware ? { flightAware: true } : EMPTY_REALTIME_PARAMS),
    [flightAware],
  );
  return useRealtimeAircraftChannel({
    channel,
    params,
    enabled,
  });
}
