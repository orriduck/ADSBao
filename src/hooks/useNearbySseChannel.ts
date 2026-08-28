import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getNearbySseClient,
  type NearbySseEvent,
  type NearbySseRequest,
  type NearbySseState,
} from "@/lib/realtime/nearbySseClient";
import {
  hasNearbyDeliverablePayload,
  hasNearbyStreamPayload,
} from "@/lib/realtime/nearbySsePayloadModel";
import { shouldUseRealtimeFallback } from "@/lib/realtime/realtimeFallbackModel";

const INITIAL_NEARBY_SSE_GRACE_MS = 8_000;
const CHANNEL_SWITCH_STALE_MS = 2_500;

declare global {
  interface Window {
    __adsbaoNearbySseHookDebug?: Record<string, unknown>;
  }
}

export function useNearbySseChannel({
  request,
  enabled = true,
}: {
  request: NearbySseRequest | null;
  enabled?: boolean;
}) {
  const client = useMemo(() => getNearbySseClient(), []);
  const [state, setState] = useState<NearbySseState>(
    client.enabled ? "loading" : "disabled",
  );
  const [event, setEvent] = useState<NearbySseEvent | null>(null);
  const [statusEvent, setStatusEvent] = useState<NearbySseEvent | null>(null);
  const [graceExpired, setGraceExpired] = useState(false);
  const previousKeyRef = useRef("");
  const available = enabled && client.enabled && Boolean(request?.key);

  useEffect(() => {
    setGraceExpired(false);
    const key = request?.key || "";
    const switched = previousKeyRef.current !== key;
    previousKeyRef.current = key;

    if (!available || !request) {
      setEvent(null);
      setStatusEvent(null);
      setState("disabled");
      return undefined;
    }

    let receivedForThisChannel = false;
    const staleTimer = switched
      ? window.setTimeout(() => {
          if (!receivedForThisChannel) setEvent(null);
        }, CHANNEL_SWITCH_STALE_MS)
      : null;
    const graceTimer = window.setTimeout(
      () => setGraceExpired(true),
      INITIAL_NEARBY_SSE_GRACE_MS,
    );
    const unsubscribe = client.subscribe({
      request,
      listener: (nextEvent) => {
        if (nextEvent.type === "nearby:status") {
          setStatusEvent(nextEvent);
        }
        if (!hasNearbyDeliverablePayload(nextEvent.data)) return;
        // A retry-status frame may include a usable cached traffic snapshot.
        // Surface it through the data path while retaining status metadata for
        // the cached-feed indicator and next-retry UI.
        receivedForThisChannel = true;
        setEvent(nextEvent);
        if (hasNearbyStreamPayload(nextEvent.data)) {
          setGraceExpired(false);
        }
      },
      onState: setState,
    });

    return () => {
      if (staleTimer != null) window.clearTimeout(staleTimer);
      window.clearTimeout(graceTimer);
      unsubscribe();
    };
  }, [available, client, request]);

  const hasEventData = Boolean(event && hasNearbyStreamPayload(event.data));
  const fallbackActive = shouldUseRealtimeFallback({
    available,
    connectionState: state,
    eventType: statusEvent?.type || event?.type || "",
    graceExpired,
    // A static snapshot may contain useful nearby-airport context before
    // traffic arrives. It is delivered above, but must not end the initial
    // data grace window or count as a live traffic result for HTTP fallback.
    hasEvent: hasEventData,
    hasEventData,
  });
  const retry = useCallback(() => {
    if (request?.key) client.restart(request.key);
  }, [client, request]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" || typeof window === "undefined") {
      return;
    }
    window.__adsbaoNearbySseHookDebug = {
      available,
      channel: request?.channel || "",
      url: request?.url || "",
      state,
      fallbackActive,
      graceExpired,
      eventType: event?.type || "",
      statusCode: statusEvent?.statusCode || "",
      nextRetryAt: statusEvent?.nextRetryAt || "",
    };
  }, [available, event, fallbackActive, graceExpired, request, state, statusEvent]);

  return {
    available,
    state,
    event,
    statusEvent,
    fallbackActive,
    connected: state === "live" || state === "stale",
    retry,
  };
}
