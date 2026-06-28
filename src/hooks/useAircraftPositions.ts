import { useEffect, useMemo, useRef, useState } from "react";
import { AIRCRAFT_TRAFFIC_CONFIG } from "../config/aviation";
import {
  normalizeAircraftSnapshot,
  resolveLastSuccessfulPositionDate,
} from "../features/aircraft/positions/aircraftPositionsModel";
import { shouldShowAircraftLoadingOverlay } from "../features/aircraft/positions/aircraftLoadingOverlayModel";
import { createAircraftTraceTracker } from "../features/aircraft/trace/aircraftTraceModel";
import {
  hasFiniteFlightPosition,
  normalizeLatitude,
  normalizeLongitude,
} from "../features/aircraft/tracking/flightTrackingContextModel";
import { createAircraftPositionClient } from "../features/aircraft/positions/aircraftPositionClient";
import { normalizeRealtimeAircraftPayload } from "../features/aircraft/positions/normalizeRealtimePayload";
import {
  EMPTY_REALTIME_PARAMS,
  useRealtimeAircraftChannel,
} from "./useRealtimeAircraftChannel";
import { buildAircraftTrafficChannel } from "../lib/realtime/realtimeChannels";
import { resolveRealtimeStatusLabel } from "../lib/realtime/realtimeStatusModel";

const MAX_AIRCRAFT_RANGE_NM = 250;

const normalizeAircraftRangeNm = (value: unknown) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return AIRCRAFT_TRAFFIC_CONFIG.rangeNm;
  return Math.max(1, Math.min(MAX_AIRCRAFT_RANGE_NM, number));
};

function sourceFromAircraftPayload(payload: Record<string, any>) {
  if (typeof payload.source === "string" && payload.source.trim()) {
    return payload.source.trim();
  }
  return "adsb.lol";
}

export function useAircraftPositions(
  _icao: unknown,
  lat: unknown,
  lon: unknown,
  options: Record<string, any> = {},
) {
  const realtimeEnabled = options?.realtime !== false;
  const distNm = normalizeAircraftRangeNm(options?.distNm);
  const queryLat = normalizeLatitude(lat);
  const queryLon = normalizeLongitude(lon);
  const hasActiveQuery = hasFiniteFlightPosition({ lat: queryLat, lon: queryLon });
  const [aircraft, setAircraft] = useState<any[]>([]);
  const [settled, setSettled] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [feedStatus, setFeedStatus] = useState("live");
  const [feedSource, setFeedSource] = useState("");
  const traceTrackerRef = useRef(createAircraftTraceTracker());
  const channelKeyRef = useRef("");

  const realtimeRequest = useMemo(() => {
    if (!hasActiveQuery) return null;
    return buildAircraftTrafficChannel({
      lat: queryLat,
      lon: queryLon,
      distNm,
    });
  }, [distNm, hasActiveQuery, queryLat, queryLon]);

  const realtime = useRealtimeAircraftChannel({
    channel: realtimeRequest?.channel || "",
    // 关键:用稳定的 frozen 常量兜底,避免 `|| {}` 每次 render 都 mint 新对象。
    // params 是 useRealtimeAircraftChannel 里订阅 effect 的依赖,引用一变就会
    // 触发 unsubscribe+resubscribe(订阅抖动)。realtimeRequest 非空时其 params
    // 已在 useMemo 内稳定。
    params: realtimeRequest?.params ?? EMPTY_REALTIME_PARAMS,
    enabled: hasActiveQuery && realtimeEnabled,
  });
  const channelKey = realtimeRequest?.channel || "";

  useEffect(() => {
    if (!hasActiveQuery) {
      channelKeyRef.current = "";
      traceTrackerRef.current.clear();
      setAircraft([]);
      setSettled(false);
      setLastUpdated(null);
      setFeedStatus("live");
      setFeedSource("");
      return;
    }

    if (channelKeyRef.current !== channelKey) {
      channelKeyRef.current = channelKey;
      traceTrackerRef.current.clear();
      setAircraft([]);
      setSettled(false);
      setLastUpdated(null);
      setFeedStatus("live");
      setFeedSource("");
    }
  }, [channelKey, hasActiveQuery]);

  useEffect(() => {
    const event = realtime.event;
    if (!hasActiveQuery || !event || event.type !== "aircraft:update") return;

    const payload = normalizeRealtimeAircraftPayload(event.data);
    const fetchedAt = Date.parse(event.fetchedAt);
    const receiveTime = Number.isFinite(fetchedAt) ? fetchedAt : Date.now();
    const snapshot = normalizeAircraftSnapshot({ json: payload, receiveTime });
    const nextAircraft = traceTrackerRef.current.update(snapshot, receiveTime);
    setAircraft(nextAircraft);
    setFeedStatus(event.stale ? "infer" : "live");
    setFeedSource(
      typeof event.source === "string"
        ? event.source
        : typeof payload.source === "string"
          ? payload.source
          : "",
    );
    const statusUpdatedDate = resolveLastSuccessfulPositionDate(snapshot);
    if (statusUpdatedDate) {
      setLastUpdated((prev) =>
        prev && prev.getTime() === statusUpdatedDate.getTime()
          ? prev
          : statusUpdatedDate,
      );
    }
    setSettled(true);
  }, [hasActiveQuery, realtime.event]);

  useEffect(() => {
    if (!hasActiveQuery || !realtime.fallbackActive) return undefined;

    let cancelled = false;
    let timer: number | null = null;
    const client = createAircraftPositionClient();

    const load = async () => {
      try {
        const payload = normalizeRealtimeAircraftPayload(
          await client.fetchNearbyAircraft({
            lat: queryLat,
            lon: queryLon,
            distNm,
          }),
        );
        if (cancelled) return;
        const receiveTime = Date.now();
        const snapshot = normalizeAircraftSnapshot({ json: payload, receiveTime });
        const nextAircraft = traceTrackerRef.current.update(snapshot, receiveTime);
        setAircraft(nextAircraft);
        setFeedStatus("live");
        setFeedSource(sourceFromAircraftPayload(payload));
        const statusUpdatedDate = resolveLastSuccessfulPositionDate(snapshot);
        if (statusUpdatedDate) {
          setLastUpdated((prev) =>
            prev && prev.getTime() === statusUpdatedDate.getTime()
              ? prev
              : statusUpdatedDate,
          );
        }
        setSettled(true);
      } catch (error) {
        if (!cancelled) {
          setFeedStatus("error");
          setSettled(true);
          console.warn("[aircraft-positions] realtime fallback failed", error);
        }
      } finally {
        if (!cancelled) {
          timer = window.setTimeout(load, AIRCRAFT_TRAFFIC_CONFIG.pollMs);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
    };
  }, [
    distNm,
    hasActiveQuery,
    queryLat,
    queryLon,
    realtime.fallbackActive,
  ]);

  const waitingForRealtime =
    hasActiveQuery && (!settled || realtime.fallbackActive);
  const realtimeStatus = resolveRealtimeStatusLabel({
    available: realtime.available,
    connectionState: realtime.connectionState,
    settled,
  });

  return {
    aircraft,
    loading: waitingForRealtime,
    initialLoading: waitingForRealtime,
    loadingOverlayActive: shouldShowAircraftLoadingOverlay({
      initialLoading: waitingForRealtime,
    }),
    settled,
    lastUpdated,
    feedStatus,
    feedSource,
    realtimeActive: realtime.connected && !realtime.fallbackActive,
    realtimeStatus,
  };
}
