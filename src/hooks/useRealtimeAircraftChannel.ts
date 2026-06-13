"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type AdsbaoRealtimeEvent,
  getAdsbaoRealtimeClient,
} from "@/lib/realtime/adsbaoRealtimeClient";
import { shouldUseRealtimeFallback } from "@/lib/realtime/realtimeFallbackModel";
import {
  buildAirportAircraftChannel,
  buildCallsignChannel,
  buildViewportAircraftChannel,
} from "@/lib/realtime/realtimeChannels";

const INITIAL_REALTIME_GRACE_MS = 8_000;
const EMPTY_REALTIME_PARAMS: Record<string, unknown> = Object.freeze({});
const REALTIME_ISSUE_TOAST_ID = "adsbao-realtime-issue";

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
    if (!fallbackActive || !available) return;
    toast.error("Realtime data connection is unavailable.", {
      id: REALTIME_ISSUE_TOAST_ID,
      description: "Live ADS-B updates are waiting for the ADSBao data service.",
      duration: 8_000,
    });
  }, [available, fallbackActive]);

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

export function useAirportAircraftRealtime({
  icao,
  lat,
  lon,
  distNm,
  enabled = true,
}: {
  icao?: unknown;
  lat?: unknown;
  lon?: unknown;
  distNm?: unknown;
  enabled?: boolean;
}) {
  const request = useMemo(
    () => buildAirportAircraftChannel(icao, lat, lon, distNm),
    [distNm, icao, lat, lon],
  );
  return useRealtimeAircraftChannel({
    channel: request?.channel || "",
    params: request?.params || {},
    enabled,
  });
}

export function useViewportAircraftRealtime({
  lat,
  lon,
  distNm,
  enabled = true,
}: {
  lat?: unknown;
  lon?: unknown;
  distNm?: unknown;
  enabled?: boolean;
}) {
  const request = useMemo(
    () => buildViewportAircraftChannel({ lat, lon, distNm }),
    [distNm, lat, lon],
  );
  return useRealtimeAircraftChannel({
    channel: request?.channel || "",
    params: request?.params || {},
    enabled,
  });
}

export function useAircraftTrackingRealtime(
  callsign: unknown,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const channel = useMemo(() => buildCallsignChannel(callsign), [callsign]);
  return useRealtimeAircraftChannel({
    channel,
    enabled,
  });
}
