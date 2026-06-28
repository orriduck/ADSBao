import { useCallback, useEffect, useRef, useState } from "react";
import {
  normalizeAdsbAircraft,
} from "../features/aircraft/positions/aircraftPositionsModel";
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
import { useAircraftTrackingRealtime } from "./useRealtimeAircraftChannel";

// 与 useAircraftPositions 共用同一份规整逻辑(Part D 去重)。
const normalizeTrackedPayload = normalizeRealtimeAircraftPayload;

export function useTrackedAircraft(
  callsign: unknown,
  {
    flightAwareEnabled = false,
    flightAwareResolved = true,
  }: {
    flightAwareEnabled?: boolean;
    flightAwareResolved?: boolean;
  } = {},
) {
  const hasActiveQuery = Boolean(callsign);
  const realtime = useAircraftTrackingRealtime(callsign, {
    enabled: hasActiveQuery,
    flightAware: flightAwareEnabled && flightAwareResolved,
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

    applyTrackedPayload(event.data, {
      source: event.source,
      fetchedAt: event.fetchedAt,
    });
  }, [
    applyTrackedPayload,
    callsign,
    realtime.event,
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
