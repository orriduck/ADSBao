"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  normalizeAdsbAircraft,
  resolveLastSuccessfulPositionDate,
} from "../features/aircraft/positions/aircraftPositionsModel";
import { shouldShowAircraftLoadingOverlay } from "../features/aircraft/positions/aircraftLoadingOverlayModel";
import {
  getActiveAdsbMatchesLength,
  getTrackedAircraftSignalState,
  shouldRetainActiveTrackingState,
} from "../features/aircraft/tracking/lostSignalTrackingModel";
import {
  getAdsbaoRealtimeClient,
} from "../lib/realtime/adsbaoRealtimeClient";
import { resolveRealtimeStatusLabel } from "../lib/realtime/realtimeStatusModel";
import { useAircraftTrackingRealtime } from "./useRealtimeAircraftChannel";

function normalizeRealtimeTrackedPayload(data: unknown) {
  if (data && typeof data === "object" && Array.isArray((data as any).ac)) {
    return data as Record<string, any>;
  }
  if (Array.isArray(data)) return { ac: data };
  return { ac: [] };
}

export function useTrackedAircraft(callsign: unknown) {
  const hasActiveQuery = Boolean(callsign);
  const realtime = useAircraftTrackingRealtime(callsign, {
    enabled: hasActiveQuery,
  });
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
  const retry = useCallback(() => {
    getAdsbaoRealtimeClient().connect();
  }, []);

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
    }
  }, [callsign]);

  useEffect(() => {
    const event = realtime.event;
    if (!callsign || !event || event.type !== "aircraft:update") return;

    const payload = normalizeRealtimeTrackedPayload(event.data);
    const matches = Array.isArray(payload.ac) ? payload.ac : [];
    const nextTrackingState = payload.trackingState || null;
    const signalState = getTrackedAircraftSignalState({
      matchesLength: getActiveAdsbMatchesLength({
        matchesLength: matches.length,
        source: payload.source || event.source,
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
    const nextFeedSource =
      typeof event.source === "string"
        ? event.source
        : typeof payload.source === "string"
          ? payload.source
          : "";
    const committedFeedSource =
      retainActiveTrackingState && !nextFeedSource
        ? feedSourceRef.current
        : nextFeedSource;

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

    const fetchedAt = Date.parse(event.fetchedAt);
    const receiveTime = Number.isFinite(fetchedAt) ? fetchedAt : Date.now();
    const normalized = normalizeAdsbAircraft(pickFreshest(matches), {
      responseNow: payload.now,
      receiveTime,
    });
    setAircraft({
      ...normalized,
      trackingState: committedTrackingState,
    });
    const positionDate = resolveLastSuccessfulPositionDate(normalized);
    if (positionDate) setLastUpdated(positionDate);
  }, [callsign, realtime.event]);

  const waitingForRealtime =
    hasActiveQuery && (!settled || realtime.fallbackActive);
  const realtimeStatus = resolveRealtimeStatusLabel({
    available: realtime.available,
    connectionState: realtime.connectionState,
    settled,
  });

  return {
    aircraft,
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
