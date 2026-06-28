import { useEffect, useMemo, useRef, useState } from "react";
import {
  type AdsbaoRealtimeEvent,
  getAdsbaoRealtimeClient,
} from "@/lib/realtime/adsbaoRealtimeClient";
import { shouldUseRealtimeFallback } from "@/lib/realtime/realtimeFallbackModel";
import {
  buildCallsignChannel,
} from "@/lib/realtime/realtimeChannels";

const INITIAL_REALTIME_GRACE_MS = 8_000;
// 频道切换后,最多保留上一架的数据多久(无新数据则清空)。切换实时航空器详情时
// 不立即 setEvent(null),先沿用上一架直到新频道送来首个事件,消除切换闪烁;
// 若新频道在该窗口内始终无数据,再清掉残留的旧机。WS warm socket + 后端 idle
// grace 让重订阅几乎立刻拿到缓存快照,所以正常切换根本到不了这个兜底。
const CHANNEL_SWITCH_STALE_MS = 2_500;
// 共享的稳定空 params 引用。任何不带参数的频道都应复用它,而不是写内联 `{}`,
// 否则订阅 effect 的 params 依赖每次 render 都变 → 订阅抖动。
export const EMPTY_REALTIME_PARAMS: Record<string, unknown> = Object.freeze({});

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
  const prevChannelRef = useRef("");

  useEffect(() => {
    const unsubscribe = client.onConnectionState(setConnectionState);
    return () => {
      unsubscribe();
    };
  }, [client]);

  useEffect(() => {
    setGraceExpired(false);
    const switchedChannel = prevChannelRef.current !== channel;
    prevChannelRef.current = channel;

    // 频道关闭/不可用时才真正清空——此时没有可继续显示的有效频道。
    if (!available) {
      setEvent(null);
      return undefined;
    }

    let receivedForThisChannel = false;

    // 切换频道时不立即清空上一架 event(消除详情切换闪烁);仅当本频道在
    // CHANNEL_SWITCH_STALE_MS 内仍无数据,再清掉残留的旧机。首次挂载(无上一个
    // 频道)不需要这个兜底——本来就没有可显示的数据。
    const staleTimer =
      switchedChannel
        ? window.setTimeout(() => {
            if (!receivedForThisChannel) setEvent(null);
          }, CHANNEL_SWITCH_STALE_MS)
        : null;

    const graceTimer = window.setTimeout(
      () => setGraceExpired(true),
      INITIAL_REALTIME_GRACE_MS,
    );
    const unsubscribe = client.subscribe({
      channel,
      params,
      listener: (nextEvent) => {
        if (nextEvent.type === "aircraft:update" || nextEvent.type === "channel:error") {
          receivedForThisChannel = true;
          setEvent(nextEvent);
          setGraceExpired(false);
        }
      },
    });

    return () => {
      if (staleTimer != null) window.clearTimeout(staleTimer);
      window.clearTimeout(graceTimer);
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
