import { useCallback, useEffect, useRef, useState } from "react";
import {
  normalizeAdsbAircraft,
} from "../features/aircraft/positions/aircraftPositionsModel";
import { shouldShowAircraftLoadingOverlay } from "../features/aircraft/positions/aircraftLoadingOverlayModel";
import { resolveTrackedAircraftStatusUpdatedDate } from "../features/aircraft/tracking/trackedAircraftStatusModel";
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
    runStatus = "",
  }: {
    runStatus?: string;
  } = {},
) {
  const hasActiveQuery = Boolean(callsign);
  const realtime = useAircraftTrackingRealtime(callsign, {
    enabled: hasActiveQuery,
  });
  const [aircraft, setAircraft] = useState<any>(null);
  const [feedSource, setFeedSource] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<any>(null);
  const [settled, setSettled] = useState(false);
  const [pollVersion, setPollVersion] = useState(0);
  const activeCallsignRef = useRef("");
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
      const nextSource =
        typeof source === "string" && source
          ? source
          : typeof payload.source === "string"
            ? payload.source
            : "";
      setFeedSource(nextSource);
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
      });
      const statusUpdatedDate = resolveTrackedAircraftStatusUpdatedDate({
        aircraft: normalized,
        fetchedAt,
        feedSource: nextSource,
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
      setPollVersion(0);
      activeCallsignRef.current = "";
      return;
    }

    const normalized = String(callsign || "").trim().toUpperCase();
    if (activeCallsignRef.current !== normalized) {
      activeCallsignRef.current = normalized;
      setAircraft(null);
      setFeedSource("");
      setLastUpdated(null);
      setError(null);
      setSettled(false);
      setPollVersion(0);
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
    lostSignal: runStatus === "lost_signal",
    pollVersion,
    visibilityRefreshVersion: 0,
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
