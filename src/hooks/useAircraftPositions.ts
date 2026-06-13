"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AIRCRAFT_TRAFFIC_CONFIG } from "../config/aviation";
import { createAircraftPositionClient } from "../features/aircraft/positions/aircraftPositionClient";
import {
  describeAircraftFetchError,
  isHttp4xxOr5xx,
  normalizeAircraftSnapshot,
  resolveLastSuccessfulPositionDate,
} from "../features/aircraft/positions/aircraftPositionsModel";
import { createAircraftTraceTracker } from "../features/aircraft/trace/aircraftTraceModel";
import {
  AIRCRAFT_LOADING_OVERLAY_MIN_VISIBLE_MS,
  scheduleAfterOverlayPaint,
  shouldShowAircraftLoadingOverlay,
} from "../features/aircraft/positions/aircraftLoadingOverlayModel";
import {
  resolveAircraftVisibilityPolling,
} from "../features/aircraft/positions/aircraftVisibilityPollingModel";
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

const HIDDEN_POLL_GRACE_MS = AIRCRAFT_TRAFFIC_CONFIG.hiddenPollGraceMs;
const MAX_AIRCRAFT_RANGE_NM = 250;
const aircraftPositionClient = createAircraftPositionClient();

const normalizeAircraftRangeNm = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return AIRCRAFT_TRAFFIC_CONFIG.rangeNm;
  return Math.max(1, Math.min(MAX_AIRCRAFT_RANGE_NM, number));
};

const waitUntil = (timestamp) => {
  const delay = Math.max(0, timestamp - Date.now());
  if (delay <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, delay);
  });
};

function normalizeRealtimeAircraftPayload(data: unknown) {
  if (Array.isArray(data)) return { ac: data };
  if (data && typeof data === "object" && Array.isArray((data as any).ac)) {
    return data;
  }
  return { ac: [] };
}

export function useAircraftPositions(icao, lat, lon, options: Record<string, any> = {}) {
  const pollWhenHidden = options?.pollWhenHidden === true;
  const realtimeEnabled = options?.realtime !== false;
  const distNm = normalizeAircraftRangeNm(options?.distNm);
  const queryLat = normalizeLatitude(lat);
  const queryLon = normalizeLongitude(lon);
  // ICAO is used only for log labelling — the actual fetch is by
  // lat/lon. The near-me explorer (no airport ICAO) needs aircraft
  // polling too, so the active-query gate only checks for valid
  // coordinates.
  const hasActiveQuery = hasFiniteFlightPosition({
    lat: queryLat,
    lon: queryLon,
  });
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
  // Tracks the previous active-query coords so we can clear stale
  // aircraft when the center changes (airport switch / search jump)
  // rather than showing old traffic under the new airport briefly.
  const centerKeyRef = useRef("");
  const realtimeRequest = useMemo(() => {
    if (!hasActiveQuery) return null;
    return (
      buildAirportAircraftChannel(icao, queryLat, queryLon, distNm) ||
      buildViewportAircraftChannel({
        lat: queryLat,
        lon: queryLon,
        distNm,
      })
    );
  }, [distNm, hasActiveQuery, icao, queryLat, queryLon]);
  const realtime = useRealtimeAircraftChannel({
    channel: realtimeRequest?.channel || "",
    params: realtimeRequest?.params || {},
    enabled: hasActiveQuery && realtimeEnabled,
  });
  const realtimeChannelKey = realtimeRequest?.channel || "";

  useEffect(() => {
    if (!hasActiveQuery) return;
    const centerChanged =
      centerKeyRef.current !== "" && centerKeyRef.current !== realtimeChannelKey;
    centerKeyRef.current = realtimeChannelKey;
    if (centerChanged) {
      traceTrackerRef.current.clear();
      setAircraft([]);
    }
    consecutiveFailuresRef.current = 0;
    setFeedStatus("live");
    setSettled(false);
    setInitialLoading(true);
    setLastUpdated(null);
  }, [hasActiveQuery, realtimeChannelKey]);

  useEffect(() => {
    const event = realtime.event;
    if (!hasActiveQuery || !event || realtime.fallbackActive) return;

    if (event.type === "channel:error" && !event.data) {
      setFeedStatus("infer");
      setSettled(true);
      setInitialLoading(false);
      setVisibilityRefreshLoading(false);
      setLoading(false);
      return;
    }

    const payload = normalizeRealtimeAircraftPayload(event.data);
    const fetchedAt = Date.parse(event.fetchedAt);
    const receiveTime = Number.isFinite(fetchedAt) ? fetchedAt : Date.now();
    const snapshot = normalizeAircraftSnapshot({
      json: payload,
      receiveTime,
    });
    const nextAircraft = traceTrackerRef.current.update(snapshot, receiveTime);
    setAircraft(nextAircraft);
    consecutiveFailuresRef.current = 0;
    setFeedStatus(event.stale ? "infer" : "live");
    setFeedSource(
      typeof event.source === "string"
        ? event.source
        : typeof (payload as any)?.source === "string"
          ? (payload as any).source
          : "",
    );
    const positionDate = resolveLastSuccessfulPositionDate(nextAircraft);
    if (positionDate) {
      setLastUpdated((prev) =>
        prev && prev.getTime() === positionDate.getTime() ? prev : positionDate,
      );
    }
    setSettled(true);
    setInitialLoading(false);
    setVisibilityRefreshLoading(false);
    setLoading(false);
  }, [hasActiveQuery, realtime.event, realtime.fallbackActive]);

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

    const poll = async ({ commitAfter = 0, showLoading = false } = {}) => {
      if (queryLat == null || queryLon == null) return;
      // Only flag `loading` for the initial fetch — steady-state interval
      // polls must not toggle it, or every tick re-renders consumers (and
      // flickers the traffic loading overlay). The initial/empty state is
      // covered by `initialLoading` + `!settled`, and visibility refreshes
      // use `visibilityRefreshLoading`.
      if (showLoading) setLoading(true);
      try {
        const aircraftJson = await aircraftPositionClient.fetchNearbyAircraft({
          lat: queryLat,
          lon: queryLon,
          distNm,
        });
        if (disposed) return;
        const receiveTime = Date.now();
        const snapshot = normalizeAircraftSnapshot({
          json: aircraftJson,
          receiveTime,
        });
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
        const positionDate = resolveLastSuccessfulPositionDate(nextAircraft);
        if (positionDate) {
          // Keep the previous Date instance when the timestamp is
          // unchanged so a stale (identical) poll doesn't re-render via a
          // fresh Date object of the same time.
          setLastUpdated((prev) =>
            prev && prev.getTime() === positionDate.getTime() ? prev : positionDate,
          );
        }
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
      const nextCenterKey = `${queryLat},${queryLon}`;
      const centerChanged = centerKeyRef.current !== "" && centerKeyRef.current !== nextCenterKey;
      centerKeyRef.current = nextCenterKey;
      stop({
        clearAircraft: centerChanged,
        clearTrace: centerChanged,
      });
      consecutiveFailuresRef.current = 0;
      setFeedStatus("live");
      setSettled(false);
      setInitialLoading(true);
      setLastUpdated(null);
      poll({ commitAfter, showLoading: true });
      timerRef.current = setInterval(poll, AIRCRAFT_TRAFFIC_CONFIG.pollMs);
    };

    const handleVisibility = () => {
      if (!realtime.fallbackActive) return;
      const visibilityAction = resolveAircraftVisibilityPolling({
        documentHidden: document.hidden,
        hasActiveQuery,
        wasActive: wasActiveRef.current,
        pollWhenHidden,
        hiddenSince: hiddenSinceRef.current,
        minHiddenMs: HIDDEN_POLL_GRACE_MS,
        maxHiddenPollMs: AIRCRAFT_TRAFFIC_CONFIG.hiddenPollMaxMs,
      });

      if (document.hidden) {
        cancelPendingVisibilityRefresh();
        hiddenSinceRef.current = Date.now();
        if (visibilityAction.shouldStopPolling) {
          stop({ clearAircraft: false, clearTrace: false });
        }
        return;
      }
      cancelPendingVisibilityRefresh();
      const hiddenDuration =
        hiddenSinceRef.current > 0 ? Date.now() - hiddenSinceRef.current : 0;
      hiddenSinceRef.current = 0;
      const overlayShownAt = Date.now();
      if (visibilityAction.shouldShowRefreshOverlay) {
        setVisibilityRefreshLoading(true);
      }
      if (!visibilityAction.shouldRefreshNow) return;
      const commitAfter = visibilityAction.shouldShowRefreshOverlay
        ? overlayShownAt + AIRCRAFT_LOADING_OVERLAY_MIN_VISIBLE_MS
        : 0;

      const refresh = () => {
        visibilityRefreshCancelRef.current = null;
        if (!pollWhenHidden && hiddenDuration > HIDDEN_POLL_GRACE_MS) {
          traceTrackerRef.current.clear();
          start({ commitAfter });
          return;
        }
        stop({ clearAircraft: false, clearTrace: false });
        poll({ commitAfter });
          timerRef.current = setInterval(poll, AIRCRAFT_TRAFFIC_CONFIG.pollMs);
      };

      if (visibilityAction.shouldShowRefreshOverlay) {
        visibilityRefreshCancelRef.current = scheduleAfterOverlayPaint(refresh);
      } else {
        refresh();
      }
    };

    if (hasActiveQuery) {
      wasActiveRef.current = true;
      if (realtime.fallbackActive) start();
      else stop({ clearAircraft: false, clearTrace: false });
    } else {
      wasActiveRef.current = false;
      centerKeyRef.current = "";
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
  }, [
    distNm,
    hasActiveQuery,
    icao,
    pollWhenHidden,
    queryLat,
    queryLon,
    realtime.fallbackActive,
  ]);

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
    realtimeActive: realtime.connected && !realtime.fallbackActive,
  };
}
