import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  normalizeAdsbAircraft,
} from "../features/aircraft/positions/aircraftPositionsModel";
import { shouldShowAircraftLoadingOverlay } from "../features/aircraft/positions/aircraftLoadingOverlayModel";
import { resolveTrackedAircraftStatusUpdatedDate } from "../features/aircraft/tracking/trackedAircraftStatusModel";
import { shouldAcceptTrackedPositionFrame } from "../features/aircraft/tracking/freshTrackedFrameModel";
import { fetchFreshTrackedAircraftPayload } from "../features/aircraft/tracking/freshTrackedAircraftRequest";
import { normalizeRealtimeAircraftPayload } from "../features/aircraft/positions/normalizeRealtimePayload";
import { resolveRealtimeStatusLabel } from "../lib/realtime/realtimeStatusModel";
import {
  buildNearbyCallsignRequest,
  buildNearbyCoordinateRequest,
} from "../lib/realtime/nearbySseRequests";
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
    bootstrapAircraft = null,
    bootstrapNearbyAircraft = null,
  }: {
    runStatus?: string;
    bootstrapAircraft?: Record<string, any> | null;
    bootstrapNearbyAircraft?: any[] | null;
  } = {},
) {
  const hasActiveQuery = Boolean(callsign);
  const normalizedCallsign = String(callsign || "").trim().toUpperCase();
  const nearbyRequest = useMemo(
    () => buildNearbyCallsignRequest(normalizedCallsign),
    [normalizedCallsign],
  );
  const bootstrapRequest = useMemo(
    () => buildNearbyCoordinateRequest({
      lat: bootstrapAircraft?.lat,
      lon: bootstrapAircraft?.lon,
    }),
    [bootstrapAircraft?.lat, bootstrapAircraft?.lon],
  );
  const realtime = useNearbySseChannel({
    request: nearbyRequest,
    enabled: hasActiveQuery,
  });
  const [aircraft, setAircraft] = useState<any>(null);
  const [feedSource, setFeedSource] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<any>(null);
  const [settled, setSettled] = useState(false);
  const [freshStartSettled, setFreshStartSettled] = useState(false);
  const [freshPositionBoundaryMs, setFreshPositionBoundaryMs] = useState<number | null>(null);
  const [pollVersion, setPollVersion] = useState(0);
  const [nearbyAircraft, setNearbyAircraft] = useState<any[]>(
    () => bootstrapNearbyAircraft || [],
  );
  const [nearbyAirports, setNearbyAirports] = useState<any[]>([]);
  const [nearbyContextSettled, setNearbyContextSettled] = useState(
    () => Boolean(bootstrapNearbyAircraft?.length),
  );
  const bootstrapRealtime = useNearbySseChannel({
    request: bootstrapRequest,
    enabled: hasActiveQuery && !nearbyContextSettled,
  });
  const activeCallsignRef = useRef(normalizedCallsign);
  const acceptedPositionTimeRef = useRef<number | null>(null);
  const freshPositionBoundaryRef = useRef<number | null>(null);
  const retry = realtime.retry;
  const applyTrackedPayload = useCallback(
    (
      payloadInput: unknown,
      {
        source = "",
        fetchedAt = "",
        stale = false,
      }: {
        source?: string;
        fetchedAt?: string;
        stale?: boolean;
      } = {},
    ) => {
      if (stale) return false;
      const payload = normalizeTrackedPayload(payloadInput);
      const matches = Array.isArray(payload.ac) ? payload.ac : [];
      const nextSource =
        typeof source === "string" && source
          ? source
          : typeof payload.source === "string"
            ? payload.source
            : "";
      if (matches.length === 0) {
        setFeedSource(nextSource);
        setError(null);
        setSettled(true);
        setPollVersion((value) => value + 1);
        return true;
      }

      const parsedFetchedAt = Date.parse(fetchedAt);
      const receiveTime = Number.isFinite(parsedFetchedAt)
        ? parsedFetchedAt
        : Date.now();
      const normalized = normalizeAdsbAircraft(pickFreshest(matches), {
        responseNow: payload.now,
        receiveTime,
      });
      if (
        !shouldAcceptTrackedPositionFrame({
          previousPositionTime: acceptedPositionTimeRef.current,
          incomingPositionTime: normalized.positionTime,
        })
      ) {
        return false;
      }
      const positionTime = Number(normalized.positionTime);
      acceptedPositionTimeRef.current = Number.isFinite(positionTime)
        ? positionTime
        : acceptedPositionTimeRef.current;
      if (freshPositionBoundaryRef.current == null) {
        freshPositionBoundaryRef.current = receiveTime;
        setFreshPositionBoundaryMs(receiveTime);
      }
      setFeedSource(nextSource);
      setError(null);
      setSettled(true);
      setPollVersion((value) => value + 1);
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
      return true;
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
      setNearbyAircraft(bootstrapNearbyAircraft || []);
      setNearbyAirports([]);
      setNearbyContextSettled(Boolean(bootstrapNearbyAircraft?.length));
      setFreshStartSettled(false);
      acceptedPositionTimeRef.current = null;
      freshPositionBoundaryRef.current = null;
      setFreshPositionBoundaryMs(null);
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
      setFreshStartSettled(false);
      acceptedPositionTimeRef.current = null;
      freshPositionBoundaryRef.current = null;
      setFreshPositionBoundaryMs(null);
    }
  }, [bootstrapNearbyAircraft, callsign, normalizedCallsign]);

  // A tracked flight never adopts the airport list item's coordinate as its
  // current position. It begins with one no-store, paid-first callsign query;
  // only then may the ongoing SSE stream supply later fresh fixes.
  useEffect(() => {
    if (!normalizedCallsign) return undefined;
    let active = true;
    setFreshStartSettled(false);
    void fetchFreshTrackedAircraftPayload(normalizedCallsign)
      .then((payload) => {
        if (!active) return;
        applyTrackedPayload(payload, {
          source: typeof payload?.source === "string" ? payload.source : "live",
          fetchedAt: typeof payload?.fetchedAt === "string" ? payload.fetchedAt : "",
          stale: payload?.stale === true,
        });
      })
      .catch((nextError) => {
        if (active) setError(nextError);
      })
      .finally(() => {
        if (active) setFreshStartSettled(true);
      });
    return () => {
      active = false;
    };
  }, [applyTrackedPayload, normalizedCallsign]);

  useEffect(() => {
    const event = bootstrapRealtime.event;
    if (!callsign || !event || !hasNearbyAircraftPayload(event.data)) return;
    const fetchedAt = Date.parse(event.fetchedAt);
    const receiveTime = Number.isFinite(fetchedAt) ? fetchedAt : Date.now();
    setNearbyAircraft(normalizeNearbyAircraft(
      (event.data as Record<string, any>)?.aircraft,
      receiveTime,
    ));
    setNearbyContextSettled(true);
  }, [bootstrapRealtime.event, callsign]);

  useEffect(() => {
    const event = realtime.event;
    if (
      !callsign ||
      !event ||
      (event.type !== "nearby:snapshot" &&
        event.type !== "nearby:traffic" &&
        event.type !== "nearby:status")
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
    if (!freshStartSettled || !hasNearbyFocusPayload(context)) return;

    applyTrackedPayload(context?.focus, {
      source:
        typeof context?.focus?.source === "string"
          ? context.focus.source
          : typeof nearbyPayload.source === "string"
            ? nearbyPayload.source
            : "",
      fetchedAt: event.fetchedAt,
      stale: event.stale === true,
    });
  }, [
    applyTrackedPayload,
    callsign,
    freshStartSettled,
    realtime.event,
  ]);


  const waitingForRealtime =
    hasActiveQuery && (!settled || (!freshStartSettled && realtime.fallbackActive));
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
    freshPositionBoundaryMs,
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
