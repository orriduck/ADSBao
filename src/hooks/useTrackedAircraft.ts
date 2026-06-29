import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  normalizeAdsbAircraft,
} from "../features/aircraft/positions/aircraftPositionsModel";
import { resolveTrackedPositionMerge } from "../features/aircraft/tracking/trackedPositionMergeModel";
import { buildAircraftChannel } from "../lib/realtime/realtimeChannels";
import { shouldShowAircraftLoadingOverlay } from "../features/aircraft/positions/aircraftLoadingOverlayModel";
import { resolveTrackedAircraftStatusUpdatedDate } from "../features/aircraft/tracking/trackedAircraftStatusModel";
import {
  getActiveAdsbMatchesLength,
  getTrackedAircraftSignalState,
  shouldRetainActiveTrackingState,
} from "../features/aircraft/tracking/lostSignalTrackingModel";
import {
  getAdsbaoRealtimeClient,
} from "../lib/realtime/adsbaoRealtimeClient";
import { normalizeRealtimeAircraftPayload } from "../features/aircraft/positions/normalizeRealtimePayload";
import { resolveRealtimeStatusLabel } from "../lib/realtime/realtimeStatusModel";
import {
  useAircraftTrackingRealtime,
  useRealtimeAircraftChannel,
} from "./useRealtimeAircraftChannel";

// 与 useAircraftPositions 共用同一份规整逻辑(Part D 去重)。
const normalizeTrackedPayload = normalizeRealtimeAircraftPayload;

export function useTrackedAircraft(
  callsign: unknown,
  {
    flightAwareEnabled = false,
    flightAwareResolved = true,
    icaoHint = "",
  }: {
    flightAwareEnabled?: boolean;
    flightAwareResolved?: boolean;
    icaoHint?: string;
  } = {},
) {
  const hasActiveQuery = Boolean(callsign);
  const realtime = useAircraftTrackingRealtime(callsign, {
    enabled: hasActiveQuery,
    flightAware: flightAwareEnabled && flightAwareResolved,
  });
  // 次级 hex 源的频道(仅在带 ?icao= 提示时非空,提示通常从地图/侧栏点进来)。
  const hexChannel = useMemo(() => buildAircraftChannel(icaoHint), [icaoHint]);
  const [hexFallbackAircraft, setHexFallbackAircraft] = useState<any>(null);
  const [aircraft, setAircraft] = useState<any>(null);
  const [feedSource, setFeedSource] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<any>(null);
  const [settled, setSettled] = useState(false);
  const [lostSignal, setLostSignal] = useState(false);
  const [pollVersion, setPollVersion] = useState(0);
  const [trackingState, setTrackingState] = useState<any>(null);
  const [flightAwareFallback, setFlightAwareFallback] = useState<any>(null);
  const activeCallsignRef = useRef("");
  const missesRef = useRef(0);
  const trackingStateRef = useRef<any>(null);
  const feedSourceRef = useRef("");

  const callsignHasPosition =
    aircraft != null &&
    Number.isFinite(Number(aircraft.lat)) &&
    Number.isFinite(Number(aircraft.lon));
  // 次级 hex 源:读上游 /hex/ 索引(比 /callsign/ 稳),给主源缺位置的飞机
  // 兜底位置。懒订阅——仅在主源已 settle 却仍无位置时才开,避免常见路径下与
  // 后端 hex 兜底重复打 /hex/。
  const hexRealtime = useRealtimeAircraftChannel({
    channel: hexChannel,
    enabled:
      hasActiveQuery && Boolean(hexChannel) && settled && !callsignHasPosition,
  });
  const retry = useCallback(() => {
    getAdsbaoRealtimeClient().connect();
  }, []);
  const applyTrackedPayload = useCallback(
    (
      payloadInput: unknown,
      {
        source = "",
        fetchedAt = "",
      }: {
        source?: string;
        fetchedAt?: string;
      } = {},
    ) => {
      const payload = normalizeTrackedPayload(payloadInput);
      const matches = Array.isArray(payload.ac) ? payload.ac : [];
      const nextTrackingState = payload.trackingState || null;
      const nextSource =
        typeof source === "string" && source
          ? source
          : typeof payload.source === "string"
            ? payload.source
            : "";
      const signalState = getTrackedAircraftSignalState({
        matchesLength: getActiveAdsbMatchesLength({
          matchesLength: matches.length,
          source: nextSource,
        }),
        previousMisses: missesRef.current,
        flightAwareFallback: payload.flightAwareFallback,
        trackingState: nextTrackingState,
      });
      const retainActiveTrackingState = shouldRetainActiveTrackingState({
        previousTrackingState: trackingStateRef.current,
        nextTrackingState,
        matchesLength: matches.length,
        lostSignal: signalState.lostSignal,
      });
      const committedTrackingState = retainActiveTrackingState
        ? trackingStateRef.current
        : nextTrackingState;
      const committedFeedSource =
        retainActiveTrackingState && !nextSource
          ? feedSourceRef.current
          : nextSource;

      trackingStateRef.current = committedTrackingState;
      feedSourceRef.current = committedFeedSource;
      missesRef.current = signalState.misses;
      setTrackingState(committedTrackingState);
      setFlightAwareFallback(payload.flightAwareFallback || null);
      setLostSignal(signalState.lostSignal);
      setFeedSource(committedFeedSource);
      setError(null);
      setSettled(true);
      setPollVersion((value) => value + 1);

      if (matches.length === 0) return;

      const parsedFetchedAt = Date.parse(fetchedAt);
      const receiveTime = Number.isFinite(parsedFetchedAt)
        ? parsedFetchedAt
        : Date.now();
      const normalized = normalizeAdsbAircraft(pickFreshest(matches), {
        responseNow: payload.now,
        receiveTime,
      });
      setAircraft({
        ...normalized,
        trackingState: committedTrackingState,
      });
      const statusUpdatedDate = resolveTrackedAircraftStatusUpdatedDate({
        aircraft: normalized,
        fetchedAt,
        feedSource: committedFeedSource,
        trackingState: committedTrackingState,
      });
      if (statusUpdatedDate) {
        setLastUpdated((prev) =>
          prev && prev.getTime() === statusUpdatedDate.getTime()
            ? prev
            : statusUpdatedDate,
        );
      }
    },
    [],
  );

  useEffect(() => {
    if (!callsign) {
      setAircraft(null);
      setFeedSource("");
      setLastUpdated(null);
      setError(null);
      setSettled(false);
      setLostSignal(false);
      setPollVersion(0);
      setTrackingState(null);
      setFlightAwareFallback(null);
      setHexFallbackAircraft(null);
      activeCallsignRef.current = "";
      missesRef.current = 0;
      trackingStateRef.current = null;
      feedSourceRef.current = "";
      return;
    }

    const normalized = String(callsign || "").trim().toUpperCase();
    if (activeCallsignRef.current !== normalized) {
      activeCallsignRef.current = normalized;
      missesRef.current = 0;
      trackingStateRef.current = null;
      feedSourceRef.current = "";
      setAircraft(null);
      setFeedSource("");
      setLastUpdated(null);
      setError(null);
      setSettled(false);
      setLostSignal(false);
      setPollVersion(0);
      setTrackingState(null);
      setFlightAwareFallback(null);
      setHexFallbackAircraft(null);
    }
  }, [callsign]);

  useEffect(() => {
    const event = realtime.event;
    if (!callsign || !event || event.type !== "aircraft:update") return;

    applyTrackedPayload(event.data, {
      source: event.source,
      fetchedAt: event.fetchedAt,
    });
  }, [
    applyTrackedPayload,
    callsign,
    realtime.event,
  ]);

  // 次级 hex 源:只采位置,不碰 trackingState/feedSource/lostSignal/航迹/路由。
  // 飞机离线时 /hex/ 返回空 → 清空兜底(staleness 直接绑定 feed 的空事件,
  // 不靠墙钟),避免把旧位置当实时。
  useEffect(() => {
    if (!hasActiveQuery || !hexChannel) {
      setHexFallbackAircraft(null);
      return;
    }
    const event = hexRealtime.event;
    if (!event || event.type !== "aircraft:update") return;
    const payload = normalizeTrackedPayload(event.data);
    const matches = Array.isArray(payload.ac) ? payload.ac : [];
    if (matches.length === 0) {
      setHexFallbackAircraft(null);
      return;
    }
    const parsedFetchedAt = Date.parse(event.fetchedAt);
    const receiveTime = Number.isFinite(parsedFetchedAt)
      ? parsedFetchedAt
      : Date.now();
    setHexFallbackAircraft(
      normalizeAdsbAircraft(pickFreshest(matches), {
        responseNow: payload.now,
        receiveTime,
      }),
    );
  }, [hasActiveQuery, hexChannel, hexRealtime.event]);

  // 合并:callsign 源有位置就用它(身份/航迹/路由均以它为准);否则用 hex
  // 源的位置兜底,并把当前 trackingState 附上,让终态判定看到 lat/lon → 不再终态。
  const mergedAircraft = useMemo(() => {
    const { aircraft: picked, positionVia } = resolveTrackedPositionMerge({
      callsignAircraft: aircraft,
      hexFallbackAircraft,
    });
    if (positionVia === "hex" && picked) {
      return { ...picked, trackingState };
    }
    return picked;
  }, [aircraft, hexFallbackAircraft, trackingState]);

  const waitingForRealtime =
    hasActiveQuery && (!settled || realtime.fallbackActive);
  const realtimeStatus = resolveRealtimeStatusLabel({
    available: realtime.available,
    connectionState: realtime.connectionState,
    settled,
  });

  return {
    aircraft: mergedAircraft,
    feedSource,
    lastUpdated,
    initialLoading: waitingForRealtime,
    loadingOverlayActive: shouldShowAircraftLoadingOverlay({
      initialLoading: waitingForRealtime,
    }),
    settled,
    error,
    lostSignal,
    pollVersion,
    visibilityRefreshVersion: 0,
    trackingState,
    flightAwareFallback,
    realtimeStatus,
    retry,
  };
}

function pickFreshest(entries: any[]) {
  let best = entries[0];
  for (const entry of entries) {
    const a = Number(entry?.seen ?? Number.POSITIVE_INFINITY);
    const b = Number(best?.seen ?? Number.POSITIVE_INFINITY);
    if (a < b) best = entry;
  }
  return best;
}
