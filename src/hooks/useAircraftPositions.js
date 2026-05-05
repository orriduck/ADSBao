"use client";

import { useEffect, useRef, useState } from "react";
import {
  aircraftPositionClient,
  DEFAULT_AIRCRAFT_POLL_MS,
  DEFAULT_CLOSE_RANGE_NM,
  DEFAULT_WIDE_RANGE_NM,
} from "../services/aviationData.js";
import { AIRCRAFT_TRAFFIC_CONFIG } from "../config/aviation.js";
import { parseAdsbPositionTime } from "../utils/aircraftMotion.js";

const HIDDEN_POLL_GRACE_MS = AIRCRAFT_TRAFFIC_CONFIG.hiddenPollGraceMs;

export function useAircraftPositions(icao, lat, lon) {
  const [aircraft, setAircraft] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [feedStatus, setFeedStatus] = useState("live");
  const timerRef = useRef(null);
  const wasActiveRef = useRef(false);
  const hiddenSinceRef = useRef(0);
  const consecutiveFailuresRef = useRef(0);

  useEffect(() => {
    let disposed = false;

    const stop = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (!disposed) setAircraft([]);
    };

    const poll = async () => {
      if (!lat || !lon) return;
      setLoading(true);
      try {
        const [wideJson, closeJson] = await Promise.all([
          aircraftPositionClient.fetchNearbyAircraft({
            lat,
            lon,
            distNm: DEFAULT_WIDE_RANGE_NM,
          }),
          aircraftPositionClient.fetchNearbyAircraft({
            lat,
            lon,
            distNm: DEFAULT_CLOSE_RANGE_NM,
          }),
        ]);
        if (disposed) return;
        const receiveTime = Date.now();
        const seen = new Map();
        const parseAircraft = (a) => {
          const parsed = {
            icao24: a.hex || "",
            callsign: (a.flight || a.r || "").trim(),
            lat: a.lat,
            lon: a.lon,
            altitude: a.alt_baro ?? a.alt_geom ?? null,
            baroRate: a.baro_rate ?? null,
            geomRate: a.geom_rate ?? null,
            navAltitudeMcp: a.nav_altitude_mcp ?? null,
            onGround: a.gnd ?? false,
            velocity: a.gs ?? null,
            track: a.track ?? 0,
            positionTime: parseAdsbPositionTime(a, wideJson.now, receiveTime),
            receiveTime,
          };
          return parsed;
        };
        const addSnapshots = (list) => {
          for (const a of list || []) {
            if (a.lat == null || a.lon == null) continue;
            const key = a.hex || "";
            if (key) seen.set(key, parseAircraft(a));
          }
        };
        addSnapshots(closeJson.ac);
        addSnapshots(wideJson.ac);
        setAircraft([...seen.values()]);
        consecutiveFailuresRef.current = 0;
        setFeedStatus("live");
        setLastUpdated(new Date());
        setInitialLoading(false);
      } catch (e) {
        consecutiveFailuresRef.current++;
        if (isHttp4xxOr5xx(e)) {
          setFeedStatus("infer");
        }
        const isTimeout =
          e.name === "TimeoutError" ||
          /timed out|signal timed out/i.test(e.message);
        const kind = isTimeout ? "timeout" : e.message || "unknown";
        console.warn(
          `[${icao}] ADS-B fetch failed (${kind}, consecutive: ${consecutiveFailuresRef.current})`,
        );
      } finally {
        if (!disposed) setLoading(false);
      }
    };

    const start = () => {
      stop();
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
        stop();
        return;
      }
      const hiddenDuration = Date.now() - hiddenSinceRef.current;
      hiddenSinceRef.current = 0;
      if (wasActiveRef.current && hiddenDuration > HIDDEN_POLL_GRACE_MS) {
        setAircraft([]);
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
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      stop();
    };
  }, [icao, lat, lon]);

  return { aircraft, loading, initialLoading, lastUpdated, feedStatus };
}

function isHttp4xxOr5xx(error) {
  const status = Number(error?.status ?? error?.statusCode);
  if (status >= 400 && status < 600) return true;
  const match = String(error?.message || "").match(/\bHTTP\s+(\d{3})\b/i);
  if (!match) return false;
  const parsed = Number(match[1]);
  return parsed >= 400 && parsed < 600;
}
