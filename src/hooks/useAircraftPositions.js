"use client";

import { useEffect, useRef, useState } from "react";
import {
  aircraftPositionClient,
  DEFAULT_AIRCRAFT_RANGE_NM,
  DEFAULT_AIRCRAFT_POLL_MS,
} from "../features/aviation/aviationData.js";
import { AIRCRAFT_TRAFFIC_CONFIG } from "../config/aviation.js";
import {
  describeAircraftFetchError,
  isHttp4xxOr5xx,
  normalizeAircraftSnapshot,
} from "../features/aircraft/positions/aircraftPositionsModel.js";
import { createAircraftTraceTracker } from "../features/aircraft/trace/aircraftTraceModel.js";
import {
  AIRCRAFT_LOADING_OVERLAY_MIN_VISIBLE_MS,
  scheduleAfterOverlayPaint,
  shouldShowAircraftLoadingOverlay,
  shouldTriggerVisibilityRefreshOverlay,
} from "../features/aircraft/positions/aircraftLoadingOverlayModel.js";
import {
  hasFiniteFlightPosition,
  normalizeLatitude,
  normalizeLongitude,
} from "../features/aircraft/tracking/flightTrackingContextModel.js";

const HIDDEN_POLL_GRACE_MS = AIRCRAFT_TRAFFIC_CONFIG.hiddenPollGraceMs;

const waitUntil = (timestamp) => {
  const delay = Math.max(0, timestamp - Date.now());
  if (delay <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, delay);
  });
};

export function useAircraftPositions(icao, lat, lon) {
  const queryLat = normalizeLatitude(lat);
  const queryLon = normalizeLongitude(lon);
  const hasActiveQuery = Boolean(
    icao && hasFiniteFlightPosition({ lat: queryLat, lon: queryLon }),
  );
  const [aircraft, setAircraft] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [visibilityRefreshLoading, setVisibilityRefreshLoading] =
    useState(false);
  const [settled, setSettled] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [feedStatus, setFeedStatus] = useState("live");
  const [feedSource, setFeedSource] = useState("");
  const timerRef = useRef(null);
  const visibilityRefreshCancelRef = useRef(null);
  const wasActiveRef = useRef(false);
  const hiddenSinceRef = useRef(0);
  const consecutiveFailuresRef = useRef(0);
  const traceTrackerRef = useRef(createAircraftTraceTracker());

  useEffect(() => {
    let disposed = false;

    const stop = ({ clearAircraft = true, clearTrace = true } = {}) => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (clearTrace) traceTrackerRef.current.clear();
      if (!disposed && clearAircraft) setAircraft([]);
    };

    const cancelPendingVisibilityRefresh = () => {
      if (!visibilityRefreshCancelRef.current) return;
      visibilityRefreshCancelRef.current();
      visibilityRefreshCancelRef.current = null;
    };

    const poll = async ({ commitAfter = 0 } = {}) => {
      if (queryLat == null || queryLon == null) return;
      setLoading(true);
      try {
        const aircraftJson = await aircraftPositionClient.fetchNearbyAircraft({
          lat: queryLat,
          lon: queryLon,
          distNm: DEFAULT_AIRCRAFT_RANGE_NM,
        });
        if (disposed) return;
        const receiveTime = Date.now();
        const snapshot = normalizeAircraftSnapshot({
          json: aircraftJson,
          receiveTime,
        });
        const staleAgeMs = Number(aircraftJson?.staleAgeMs ?? 0);
        const isStale = aircraftJson?.stale === true;
        const nextAircraft = traceTrackerRef.current.update(
          snapshot,
          receiveTime,
        );
        await waitUntil(commitAfter);
        if (disposed) return;
        setAircraft(nextAircraft);
        consecutiveFailuresRef.current = 0;
        setFeedStatus(isStale ? "infer" : "live");
        setFeedSource(
          typeof aircraftJson?.source === "string" ? aircraftJson.source : "",
        );
        setLastUpdated(new Date(receiveTime - Math.max(0, staleAgeMs)));
        setSettled(true);
        setInitialLoading(false);
        setVisibilityRefreshLoading(false);
      } catch (e) {
        consecutiveFailuresRef.current++;
        if (isHttp4xxOr5xx(e)) {
          setFeedStatus("infer");
        }
        const kind = describeAircraftFetchError(e);
        console.warn(
          `[${icao}] ADS-B fetch failed (${kind}, consecutive: ${consecutiveFailuresRef.current})`,
        );
      } finally {
        if (!disposed) {
          await waitUntil(commitAfter);
          if (disposed) return;
          setSettled(true);
          setInitialLoading(false);
          setVisibilityRefreshLoading(false);
          setLoading(false);
        }
      }
    };

    const start = ({ commitAfter = 0 } = {}) => {
      stop({ clearAircraft: false });
      consecutiveFailuresRef.current = 0;
      setFeedStatus("live");
      setSettled(false);
      setInitialLoading(true);
      setLastUpdated(null);
      poll({ commitAfter });
      timerRef.current = setInterval(poll, DEFAULT_AIRCRAFT_POLL_MS);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        cancelPendingVisibilityRefresh();
        hiddenSinceRef.current = Date.now();
        stop({ clearAircraft: false, clearTrace: false });
        return;
      }
      cancelPendingVisibilityRefresh();
      const hiddenDuration =
        hiddenSinceRef.current > 0 ? Date.now() - hiddenSinceRef.current : 0;
      const showRefreshOverlay = shouldTriggerVisibilityRefreshOverlay({
        wasActive: wasActiveRef.current,
        hiddenSince: hiddenSinceRef.current,
        minHiddenMs: HIDDEN_POLL_GRACE_MS,
      });
      hiddenSinceRef.current = 0;
      const overlayShownAt = Date.now();
      if (showRefreshOverlay) setVisibilityRefreshLoading(true);
      if (!wasActiveRef.current) return;
      const commitAfter = showRefreshOverlay
        ? overlayShownAt + AIRCRAFT_LOADING_OVERLAY_MIN_VISIBLE_MS
        : 0;

      const refresh = () => {
        visibilityRefreshCancelRef.current = null;
        if (hiddenDuration > HIDDEN_POLL_GRACE_MS) {
          traceTrackerRef.current.clear();
          start({ commitAfter });
          return;
        }
        stop({ clearAircraft: false, clearTrace: false });
        poll({ commitAfter });
        timerRef.current = setInterval(poll, DEFAULT_AIRCRAFT_POLL_MS);
      };

      if (showRefreshOverlay) {
        visibilityRefreshCancelRef.current = scheduleAfterOverlayPaint(refresh);
      } else {
        refresh();
      }
    };

    if (hasActiveQuery) {
      wasActiveRef.current = true;
      start();
    } else {
      wasActiveRef.current = false;
      stop();
      setSettled(false);
      setInitialLoading(false);
      setVisibilityRefreshLoading(false);
      setLastUpdated(null);
      setFeedStatus("live");
      setFeedSource("");
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      cancelPendingVisibilityRefresh();
      stop();
    };
  }, [hasActiveQuery, icao, queryLat, queryLon]);

  return {
    aircraft,
    loading,
    initialLoading,
    loadingOverlayActive: shouldShowAircraftLoadingOverlay({
      initialLoading: hasActiveQuery && !settled,
      visibilityRefreshLoading,
    }),
    settled,
    lastUpdated,
    feedStatus,
    feedSource,
  };
}
