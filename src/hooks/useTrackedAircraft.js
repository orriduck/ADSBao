"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { aircraftCallsignClient } from "../features/aviation/aviationData.js";
import { AIRCRAFT_TRAFFIC_CONFIG } from "../config/aviation.js";
import {
  normalizeAdsbAircraft,
} from "../features/aircraft/positions/aircraftPositionsModel.js";

// Number of consecutive empty callsign responses (no aircraft reporting
// for that callsign) before we surface lostSignal=true to callers. With
// the standard 3s poll interval this is ~9s of silence — long enough to
// ride out a single dropped sample but short enough to react when the
// flight actually lands.
const LOST_SIGNAL_THRESHOLD = 3;

// Polls the upstream ADS-B feed for the focal callsign so the flight
// tracking page knows where the aircraft is right now and where to center
// the map. The hook returns the latest normalized snapshot for that
// aircraft AND a `lostSignal` flag: once the feed has missed the aircraft
// for LOST_SIGNAL_THRESHOLD consecutive polls, we keep the most recent
// known snapshot around and set lostSignal so the UI can show a
// confirmation overlay (the aircraft probably landed — we don't want to
// just blank the page out).
export function useTrackedAircraft(callsign) {
  const [aircraft, setAircraft] = useState(null);
  const [feedSource, setFeedSource] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [initialLoading, setInitialLoading] = useState(false);
  const [lostSignal, setLostSignal] = useState(false);
  const [pollVersion, setPollVersion] = useState(0);
  const timerRef = useRef(null);
  const disposedRef = useRef(false);
  const missesRef = useRef(0);
  // Caller can dispatch a manual retry from the overlay. We bounce the
  // poll cadence by incrementing this counter — the effect listens for
  // changes and triggers an immediate fetch.
  const [retrySignal, setRetrySignal] = useState(0);
  const retry = useCallback(() => {
    setRetrySignal((value) => value + 1);
  }, []);

  useEffect(() => {
    disposedRef.current = false;

    if (!callsign) {
      setAircraft(null);
      setInitialLoading(false);
      setLastUpdated(null);
      setError(null);
      setLostSignal(false);
      setPollVersion(0);
      missesRef.current = 0;
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
          // No matches: don't blank the aircraft snapshot — the user
          // is probably watching a flight that just landed and we want
          // to keep the last position visible while the overlay asks
          // them what to do. The threshold avoids flapping on a single
          // dropped sample.
          missesRef.current += 1;
          if (missesRef.current >= LOST_SIGNAL_THRESHOLD) {
            setLostSignal(true);
          }
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
          missesRef.current = 0;
          setLostSignal(false);
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
        if (!disposedRef.current) {
          setPollVersion((value) => value + 1);
          setInitialLoading(false);
        }
      }
    };

    poll();
    timerRef.current = setInterval(poll, AIRCRAFT_TRAFFIC_CONFIG.pollMs);

    return () => {
      disposedRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [callsign, retrySignal]);

  return {
    aircraft,
    feedSource,
    lastUpdated,
    initialLoading,
    error,
    lostSignal,
    pollVersion,
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
