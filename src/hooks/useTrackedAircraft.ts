import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  normalizeAdsbAircraft,
} from "../features/aircraft/positions/aircraftPositionsModel";
import { shouldShowAircraftLoadingOverlay } from "../features/aircraft/positions/aircraftLoadingOverlayModel";
import { resolveTrackedAircraftStatusUpdatedDate } from "../features/aircraft/tracking/trackedAircraftStatusModel";
import { normalizeRealtimeAircraftPayload } from "../features/aircraft/positions/normalizeRealtimePayload";
import { resolveRealtimeStatusLabel } from "../lib/realtime/realtimeStatusModel";
import { buildNearbyCallsignRequest } from "../lib/realtime/nearbySseRequests";
import {
  hasNearbyAircraftPayload,
  hasNearbyFocusPayload,
  readNearbyAirportsUpdate,
} from "../lib/realtime/nearbySsePayloadModel";
import { useNearbySseChannel } from "./useNearbySseChannel";

// Callsign streams use a dedicated focus payload but the service may return
// either the legacy `{ ac: [] }` shape or one aircraft record. Keep the UI
// adapter deliberately tolerant while making the SSE envelope strict.
function normalizeTrackedPayload(payload: unknown) {
  const normalized = normalizeRealtimeAircraftPayload(payload);
  if (
    normalized.ac.length > 0 ||
    (payload &&
      typeof payload === "object" &&
      Array.isArray((payload as Record<string, unknown>).ac))
  ) {
    return normalized;
  }
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return { ac: [payload] };
  }
  return normalized;
}

function normalizeNearbyAircraft(payload: unknown, receiveTime: number) {
  const normalized = normalizeRealtimeAircraftPayload(payload);
  return normalized.ac.map((entry: any) =>
    normalizeAdsbAircraft(entry, {
      responseNow: normalized.now,
      receiveTime,
    }),
  );
}

export function useTrackedAircraft(
  callsign: unknown,
  {
    runStatus = "",
    initialAircraft = null,
  }: {
    runStatus?: string;
    initialAircraft?: any;
  } = {},
) {
  const hasActiveQuery = Boolean(callsign);
  const normalizedCallsign = String(callsign || "").trim().toUpperCase();
  const initialSeed =
    String(initialAircraft?.callsign || "").trim().toUpperCase() === normalizedCallsign
      ? initialAircraft
      : null;
  const nearbyRequest = useMemo(
    () => buildNearbyCallsignRequest(normalizedCallsign),
    [normalizedCallsign],
  );
  const realtime = useNearbySseChannel({
    request: nearbyRequest,
    enabled: hasActiveQuery,
  });
  const [aircraft, setAircraft] = useState<any>(() => initialSeed);
  const [feedSource, setFeedSource] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<any>(null);
  const [settled, setSettled] = useState(Boolean(initialSeed));
  const [pollVersion, setPollVersion] = useState(0);
  const [nearbyAircraft, setNearbyAircraft] = useState<any[]>([]);
  const [nearbyAirports, setNearbyAirports] = useState<any[]>([]);
  const [nearbyContextSettled, setNearbyContextSettled] = useState(false);
  const activeCallsignRef = useRef(normalizedCallsign);
  const retry = realtime.retry;
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
      setNearbyAircraft([]);
      setNearbyAirports([]);
      setNearbyContextSettled(false);
      activeCallsignRef.current = "";
      return;
    }

    if (activeCallsignRef.current !== normalizedCallsign) {
      activeCallsignRef.current = normalizedCallsign;
      setAircraft(null);
      setFeedSource("");
      setLastUpdated(null);
      setError(null);
      setSettled(false);
      setPollVersion(0);
      setNearbyAircraft([]);
      setNearbyAirports([]);
      setNearbyContextSettled(false);
    }
  }, [callsign, normalizedCallsign]);

  useEffect(() => {
    const event = realtime.event;
    if (
      !callsign ||
      !event ||
      (event.type !== "nearby:snapshot" && event.type !== "nearby:traffic")
    ) {
      return;
    }

    const context = event.data as Record<string, any>;
    const fetchedAt = Date.parse(event.fetchedAt);
    const receiveTime = Number.isFinite(fetchedAt) ? fetchedAt : Date.now();
    const airportUpdate = readNearbyAirportsUpdate(context);
    if (airportUpdate) setNearbyAirports(airportUpdate);
    const hasAircraft = hasNearbyAircraftPayload(context);
    const nearbyPayload = normalizeRealtimeAircraftPayload(context?.aircraft);
    if (hasAircraft) {
      setNearbyAircraft(normalizeNearbyAircraft(context?.aircraft, receiveTime));
      setNearbyContextSettled(true);
    }
    if (!hasNearbyFocusPayload(context)) return;

    applyTrackedPayload(context?.focus, {
      source:
        typeof context?.focus?.source === "string"
          ? context.focus.source
          : typeof nearbyPayload.source === "string"
            ? nearbyPayload.source
            : "",
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
    connectionState: realtime.state,
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
    nearbyAircraft,
    nearbyAirports,
    nearbyContextSettled,
    nearbyChannel: nearbyRequest?.channel || "",
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
