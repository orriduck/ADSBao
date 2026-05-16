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

const HIDDEN_POLL_GRACE_MS = AIRCRAFT_TRAFFIC_CONFIG.hiddenPollGraceMs;

export function useAircraftPositions(icao, lat, lon) {
  const [aircraft, setAircraft] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [feedStatus, setFeedStatus] = useState("live");
  const [feedSource, setFeedSource] = useState("");
  const timerRef = useRef(null);
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

    const poll = async () => {
      if (!lat || !lon) return;
      setLoading(true);
      try {
        const aircraftJson = await aircraftPositionClient.fetchNearbyAircraft({
          lat,
          lon,
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
        setAircraft(traceTrackerRef.current.update(snapshot, receiveTime));
        consecutiveFailuresRef.current = 0;
        setFeedStatus(isStale ? "infer" : "live");
        setFeedSource(
          typeof aircraftJson?.source === "string" ? aircraftJson.source : "",
        );
        setLastUpdated(new Date(receiveTime - Math.max(0, staleAgeMs)));
        setInitialLoading(false);
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
        if (!disposed) setLoading(false);
      }
    };

    const start = () => {
      stop({ clearAircraft: false });
      consecutiveFailuresRef.current = 0;
      setFeedStatus("live");
      setInitialLoading(true);
      setLastUpdated(null);
      poll();
      timerRef.current = setInterval(poll, DEFAULT_AIRCRAFT_POLL_MS);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        hiddenSinceRef.current = Date.now();
        stop({ clearAircraft: false, clearTrace: false });
        return;
      }
      const hiddenDuration = Date.now() - hiddenSinceRef.current;
      hiddenSinceRef.current = 0;
      if (wasActiveRef.current && hiddenDuration > HIDDEN_POLL_GRACE_MS) {
        traceTrackerRef.current.clear();
        start();
      } else if (wasActiveRef.current) {
        poll();
        timerRef.current = setInterval(poll, DEFAULT_AIRCRAFT_POLL_MS);
      }
    };

    if (icao && lat && lon) {
      wasActiveRef.current = true;
      start();
    } else {
      wasActiveRef.current = false;
      stop();
      setInitialLoading(false);
      setLastUpdated(null);
      setFeedStatus("live");
      setFeedSource("");
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      stop();
    };
  }, [icao, lat, lon]);

  return {
    aircraft,
    loading,
    initialLoading,
    lastUpdated,
    feedStatus,
    feedSource,
  };
}
