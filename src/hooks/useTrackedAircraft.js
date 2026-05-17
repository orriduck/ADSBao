"use client";

import { useEffect, useRef, useState } from "react";
import { aircraftCallsignClient } from "../features/aviation/aviationData.js";
import { AIRCRAFT_TRAFFIC_CONFIG } from "../config/aviation.js";
import {
  normalizeAdsbAircraft,
} from "../features/aircraft/positions/aircraftPositionsModel.js";

// Polls the upstream ADS-B feed for the focal callsign so the flight
// tracking page knows where the aircraft is right now and where to center
// the map. The hook returns the latest normalized snapshot for that
// aircraft (or null while we wait / when it's no longer reporting).
export function useTrackedAircraft(callsign) {
  const [aircraft, setAircraft] = useState(null);
  const [feedSource, setFeedSource] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [initialLoading, setInitialLoading] = useState(false);
  const timerRef = useRef(null);
  const disposedRef = useRef(false);

  useEffect(() => {
    disposedRef.current = false;

    if (!callsign) {
      setAircraft(null);
      setInitialLoading(false);
      setLastUpdated(null);
      setError(null);
      return undefined;
    }

    setInitialLoading(true);
    setError(null);

    const poll = async () => {
      try {
        const payload = await aircraftCallsignClient.fetchByCallsign({
          callsign,
        });
        if (disposedRef.current) return;
        const matches = Array.isArray(payload?.ac) ? payload.ac : [];
        const receiveTime = Date.now();
        if (matches.length === 0) {
          setAircraft(null);
        } else {
          // Pick the freshest entry — multiple aircraft can share a
          // callsign across operators; the one currently broadcasting is
          // what we want.
          const best = pickFreshest(matches);
          const normalized = normalizeAdsbAircraft(best, {
            responseNow: payload?.now,
            receiveTime,
          });
          setAircraft(normalized);
        }
        setFeedSource(
          typeof payload?.source === "string" ? payload.source : "",
        );
        setLastUpdated(new Date(receiveTime));
        setError(null);
      } catch (err) {
        if (disposedRef.current) return;
        console.warn(`[tracked-aircraft] ${callsign} fetch failed`, err);
        setError(err);
      } finally {
        if (!disposedRef.current) setInitialLoading(false);
      }
    };

    poll();
    timerRef.current = setInterval(poll, AIRCRAFT_TRAFFIC_CONFIG.pollMs);

    return () => {
      disposedRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [callsign]);

  return { aircraft, feedSource, lastUpdated, initialLoading, error };
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
