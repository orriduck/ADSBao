"use client";

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
import { useRealtimeAircraftChannel } from "./useRealtimeAircraftChannel";
import {
  buildAirportAircraftChannel,
  buildViewportAircraftChannel,
} from "../lib/realtime/realtimeChannels";

const MAX_AIRCRAFT_RANGE_NM = 250;

const normalizeAircraftRangeNm = (value: unknown) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return AIRCRAFT_TRAFFIC_CONFIG.rangeNm;
  return Math.max(1, Math.min(MAX_AIRCRAFT_RANGE_NM, number));
};

function normalizeRealtimeAircraftPayload(data: unknown) {
  if (Array.isArray(data)) return { ac: data };
  if (data && typeof data === "object" && Array.isArray((data as any).ac)) {
    return data as Record<string, any>;
  }
  return { ac: [] };
}

export function useAircraftPositions(
  icao: unknown,
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
    return (
      buildAirportAircraftChannel(icao, queryLat, queryLon, distNm) ||
      buildViewportAircraftChannel({ lat: queryLat, lon: queryLon, distNm })
    );
  }, [distNm, hasActiveQuery, icao, queryLat, queryLon]);

  const realtime = useRealtimeAircraftChannel({
    channel: realtimeRequest?.channel || "",
    params: realtimeRequest?.params || {},
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
    const positionDate = resolveLastSuccessfulPositionDate(nextAircraft);
    if (positionDate) {
      setLastUpdated((prev) =>
        prev && prev.getTime() === positionDate.getTime() ? prev : positionDate,
      );
    }
    setSettled(true);
  }, [hasActiveQuery, realtime.event]);

  const waitingForRealtime =
    hasActiveQuery && (!settled || realtime.fallbackActive);

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
  };
}
