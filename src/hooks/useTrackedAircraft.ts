"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AIRCRAFT_TRAFFIC_CONFIG } from "../config/aviation";
import { createAircraftCallsignClient } from "../features/aircraft/callsign/aircraftCallsignClient";
import {
  normalizeAdsbAircraft,
  resolveLastSuccessfulPositionDate,
} from "../features/aircraft/positions/aircraftPositionsModel";
import {
  getActiveAdsbMatchesLength,
  getTrackedAircraftSignalState,
} from "../features/aircraft/tracking/lostSignalTrackingModel";
import {
  AIRCRAFT_LOADING_OVERLAY_MIN_VISIBLE_MS,
  scheduleAfterOverlayPaint,
  shouldShowAircraftLoadingOverlay,
} from "../features/aircraft/positions/aircraftLoadingOverlayModel";
import {
  resolveAircraftVisibilityPolling,
} from "../features/aircraft/positions/aircraftVisibilityPollingModel";

const waitUntil = (timestamp) => {
  const delay = Math.max(0, timestamp - Date.now());
  if (delay <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, delay);
  });
};

const aircraftCallsignClient = createAircraftCallsignClient();

// Polls the upstream ADS-B feed for the focal callsign so the flight
// tracking page knows where the aircraft is right now and where to center
// the map. The hook returns the latest normalized snapshot for that
// aircraft AND a `lostSignal` flag: once the feed has missed the aircraft
// for LOST_SIGNAL_THRESHOLD consecutive polls, we keep the most recent
// known snapshot around and set lostSignal so the UI can show a
// confirmation overlay (the aircraft probably landed — we don't want to
// just blank the page out).
export function useTrackedAircraft(callsign) {
  const hasActiveQuery = Boolean(callsign);
  const [aircraft, setAircraft] = useState(null);
  const [feedSource, setFeedSource] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [initialLoading, setInitialLoading] = useState(false);
  const [visibilityRefreshLoading, setVisibilityRefreshLoading] =
    useState(false);
  const [settled, setSettled] = useState(false);
  const [lostSignal, setLostSignal] = useState(false);
  const [pollVersion, setPollVersion] = useState(0);
  const [visibilityRefreshVersion, setVisibilityRefreshVersion] = useState(0);
  const [trackingState, setTrackingState] = useState(null);
  const [flightAwareFallback, setFlightAwareFallback] = useState(null);
  const timerRef = useRef(null);
  const disposedRef = useRef(false);
  const missesRef = useRef(0);
  const hiddenSinceRef = useRef(0);
  // Caller can dispatch a manual retry from the overlay. We bounce the
  // poll cadence by incrementing this counter — the effect listens for
  // changes and triggers an immediate fetch.
  const [retrySignal, setRetrySignal] = useState(0);
  const visibilityRefreshCancelRef = useRef(null);
  const retry = useCallback(() => {
    setRetrySignal((value) => value + 1);
  }, []);

  useEffect(() => {
    disposedRef.current = false;

    if (!callsign) {
      setAircraft(null);
      setInitialLoading(false);
      setVisibilityRefreshLoading(false);
      setSettled(false);
      setLastUpdated(null);
      setError(null);
      setLostSignal(false);
      setPollVersion(0);
      setVisibilityRefreshVersion(0);
      setTrackingState(null);
      setFlightAwareFallback(null);
      missesRef.current = 0;
      return undefined;
    }

    setInitialLoading(true);
    setSettled(false);
    setError(null);

    const stopPolling = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };

    const cancelPendingVisibilityRefresh = () => {
      if (!visibilityRefreshCancelRef.current) return;
      visibilityRefreshCancelRef.current();
      visibilityRefreshCancelRef.current = null;
    };

    const poll = async ({ commitAfter = 0 } = {}) => {
      try {
        const payload = await aircraftCallsignClient.fetchByCallsign({
          callsign,
        });
        if (disposedRef.current) return;
        const matches = Array.isArray(payload?.ac) ? payload.ac : [];
        const receiveTime = Date.now();
        const nextTrackingState = payload?.trackingState || null;
        const signalState = getTrackedAircraftSignalState({
          matchesLength: getActiveAdsbMatchesLength({
            matchesLength: matches.length,
            source: payload?.source,
          }),
          previousMisses: missesRef.current,
          flightAwareFallback: payload?.flightAwareFallback,
          trackingState: nextTrackingState,
        });
        await waitUntil(commitAfter);
        if (disposedRef.current) return;
        setSettled(true);
        setInitialLoading(false);
        setVisibilityRefreshLoading(false);
        setTrackingState(nextTrackingState);
        setFlightAwareFallback(payload?.flightAwareFallback || null);
        if (matches.length === 0) {
          // No matches: don't blank the aircraft snapshot — the user
          // is probably watching a flight that just landed and we want
          // to keep the last position visible while the overlay asks them
          // what to do. Cross-ocean flights can disappear from ADS-B
          // callsign lookup while FlightAware still knows they are enroute,
          // so the state model accounts for that benchmark before warning.
          missesRef.current = signalState.misses;
          setLostSignal(signalState.lostSignal);
        } else {
          // Pick the freshest entry — multiple aircraft can share a
          // callsign across operators; the one currently broadcasting is
          // what we want.
          const best = pickFreshest(matches);
          const normalized = normalizeAdsbAircraft(best, {
            responseNow: payload?.now,
            receiveTime,
          });
          setAircraft({
            ...normalized,
            trackingState: nextTrackingState,
          });
          const positionDate = resolveLastSuccessfulPositionDate(normalized);
          if (positionDate) setLastUpdated(positionDate);
          missesRef.current = signalState.misses;
          setLostSignal(signalState.lostSignal);
        }
        setFeedSource(
          typeof payload?.source === "string" ? payload.source : "",
        );
        setError(null);
      } catch (err) {
        if (disposedRef.current) return;
        console.warn(`[tracked-aircraft] ${callsign} fetch failed`, err);
        setError(err);
      } finally {
        if (!disposedRef.current) {
          await waitUntil(commitAfter);
          if (disposedRef.current) return;
          setSettled(true);
          setInitialLoading(false);
          setVisibilityRefreshLoading(false);
          setPollVersion((value) => value + 1);
        }
      }
    };

    const handleVisibility = () => {
      const visibilityAction = resolveAircraftVisibilityPolling({
        documentHidden: document.hidden,
        hasActiveQuery,
        pollWhenHidden: false,
        hiddenSince: hiddenSinceRef.current,
        minHiddenMs: AIRCRAFT_TRAFFIC_CONFIG.hiddenPollGraceMs,
        maxHiddenPollMs: AIRCRAFT_TRAFFIC_CONFIG.hiddenPollMaxMs,
      });

      if (document.hidden) {
        cancelPendingVisibilityRefresh();
        hiddenSinceRef.current = Date.now();
        if (visibilityAction.shouldStopPolling) stopPolling();
        return;
      }
      cancelPendingVisibilityRefresh();
      hiddenSinceRef.current = 0;
      if (!visibilityAction.shouldRefreshNow) return;
      if (visibilityAction.shouldShowRefreshOverlay) {
        setVisibilityRefreshLoading(true);
      }
      const overlayShownAt = Date.now();
      const commitAfter = visibilityAction.shouldShowRefreshOverlay
        ? overlayShownAt + AIRCRAFT_LOADING_OVERLAY_MIN_VISIBLE_MS
        : 0;

      const refresh = () => {
        visibilityRefreshCancelRef.current = null;
        setVisibilityRefreshVersion((value) => value + 1);
        stopPolling();
        poll({ commitAfter });
        timerRef.current = setInterval(poll, AIRCRAFT_TRAFFIC_CONFIG.pollMs);
      };

      if (visibilityAction.shouldShowRefreshOverlay) {
        visibilityRefreshCancelRef.current = scheduleAfterOverlayPaint(refresh);
      } else {
        refresh();
      }
    };

    poll();
    timerRef.current = setInterval(poll, AIRCRAFT_TRAFFIC_CONFIG.pollMs);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      disposedRef.current = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      cancelPendingVisibilityRefresh();
      stopPolling();
    };
  }, [callsign, hasActiveQuery, retrySignal]);

  return {
    aircraft,
    feedSource,
    lastUpdated,
    initialLoading,
    loadingOverlayActive: shouldShowAircraftLoadingOverlay({
      initialLoading: hasActiveQuery && !settled,
      visibilityRefreshLoading,
    }),
    settled,
    error,
    lostSignal,
    pollVersion,
    visibilityRefreshVersion,
    trackingState,
    flightAwareFallback,
    retry,
  };
}

function pickFreshest(entries) {
  let best = entries[0];
  for (const entry of entries) {
    const a = Number(entry?.seen ?? Number.POSITIVE_INFINITY);
    const b = Number(best?.seen ?? Number.POSITIVE_INFINITY);
    if (a < b) best = entry;
  }
  return best;
}
