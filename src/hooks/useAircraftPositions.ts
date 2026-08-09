import { useEffect, useMemo, useRef, useState } from "react";
import { AIRCRAFT_TRAFFIC_CONFIG } from "../config/aviation";
import {
  normalizeAircraftSnapshot,
  resolveLastSuccessfulPositionDate,
} from "../features/aircraft/positions/aircraftPositionsModel";
import { shouldShowAircraftLoadingOverlay } from "../features/aircraft/positions/aircraftLoadingOverlayModel";
import { createAircraftTraceTracker } from "../features/aircraft/trace/aircraftTraceModel";
import {
  hasFiniteFlightPosition,
  normalizeLatitude,
  normalizeLongitude,
} from "../features/aircraft/tracking/flightTrackingContextModel";
import { createAircraftPositionClient } from "../features/aircraft/positions/aircraftPositionClient";
import { normalizeRealtimeAircraftPayload } from "../features/aircraft/positions/normalizeRealtimePayload";
import { resolveNextPollDelayMs } from "../features/aircraft/positions/pollBackoffModel";
import { buildNearbyCoordinateRequest } from "../lib/realtime/nearbySseRequests";
import {
  hasAircraftPayload,
  hasNearbyAircraftPayload,
  readNearbyAirportsUpdate,
} from "../lib/realtime/nearbySsePayloadModel";
import { resolveRealtimeStatusLabel } from "../lib/realtime/realtimeStatusModel";
import { useNearbySseChannel } from "./useNearbySseChannel";

const MAX_AIRCRAFT_RANGE_NM = 250;
// SSE subscribes immediately and normally provides the first traffic frame.
// Give it a short head start before the HTTP seed request so a fresh airport
// view does not duplicate the same upstream position query.
const INITIAL_SSE_SNAPSHOT_GRACE_MS = 1_500;

const normalizeAircraftRangeNm = (value: unknown) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return AIRCRAFT_TRAFFIC_CONFIG.rangeNm;
  return Math.max(1, Math.min(MAX_AIRCRAFT_RANGE_NM, number));
};

function sourceFromAircraftPayload(payload: Record<string, any>) {
  if (typeof payload.source === "string" && payload.source.trim()) {
    return payload.source.trim();
  }
  return "";
}

function statusFromAircraftPayload(payload: Record<string, any>) {
  return payload.stale === true ? "infer" : "live";
}

export function useAircraftPositions(
  _icao: unknown,
  lat: unknown,
  lon: unknown,
  options: Record<string, any> = {},
) {
  const realtimeEnabled = options?.realtime !== false;
  const distNm = normalizeAircraftRangeNm(options?.distNm);
  const queryLat = normalizeLatitude(lat);
  const queryLon = normalizeLongitude(lon);
  const hasActiveQuery = hasFiniteFlightPosition({ lat: queryLat, lon: queryLon });
  const [aircraft, setAircraft] = useState<any[]>([]);
  const [settled, setSettled] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [feedStatus, setFeedStatus] = useState("live");
  const [feedSource, setFeedSource] = useState("");
  const [nearbyAirports, setNearbyAirports] = useState<any[]>([]);
  const traceTrackerRef = useRef(createAircraftTraceTracker());
  const channelKeyRef = useRef("");
  const realtimeFrameRef = useRef({
    channel: "",
    sequence: 0,
    revision: 0,
  });

  const nearbyRequest = useMemo(() => {
    if (!hasActiveQuery) return null;
    return buildNearbyCoordinateRequest({
      lat: queryLat,
      lon: queryLon,
    });
  }, [hasActiveQuery, queryLat, queryLon]);

  const realtime = useNearbySseChannel({
    request: nearbyRequest,
    enabled: hasActiveQuery && realtimeEnabled,
  });
  const channelKey = nearbyRequest?.key || "";

  useEffect(() => {
    if (!hasActiveQuery) {
      channelKeyRef.current = "";
      realtimeFrameRef.current = {
        channel: "",
        sequence: 0,
        revision: realtimeFrameRef.current.revision + 1,
      };
      traceTrackerRef.current.clear();
      setAircraft([]);
      setSettled(false);
      setLastUpdated(null);
      setFeedStatus("live");
      setFeedSource("");
      setNearbyAirports([]);
      return;
    }

    if (channelKeyRef.current !== channelKey) {
      channelKeyRef.current = channelKey;
      realtimeFrameRef.current = {
        channel: nearbyRequest?.channel || "",
        sequence: 0,
        revision: realtimeFrameRef.current.revision + 1,
      };
      traceTrackerRef.current.clear();
      setAircraft([]);
      setSettled(false);
      setLastUpdated(null);
      setFeedStatus("live");
      setFeedSource("");
      setNearbyAirports([]);
    }
  }, [channelKey, hasActiveQuery]);

  useEffect(() => {
    const event = realtime.event;
    if (
      !hasActiveQuery ||
      !event ||
      (event.type !== "nearby:snapshot" && event.type !== "nearby:traffic")
    ) {
      return;
    }

    const expectedChannel = nearbyRequest?.channel || "";
    if (!expectedChannel || event.channel !== expectedChannel) return;

    const previousFrame = realtimeFrameRef.current;
    const sequence = Number(event.sequence) || 0;
    if (
      previousFrame.channel === expectedChannel &&
      sequence > 0 &&
      previousFrame.sequence > 0 &&
      sequence <= previousFrame.sequence
    ) {
      return;
    }
    realtimeFrameRef.current = {
      channel: expectedChannel,
      sequence: sequence > 0 ? sequence : previousFrame.sequence,
      revision: previousFrame.revision,
    };

    const context = event.data as Record<string, any>;
    const airportUpdate = readNearbyAirportsUpdate(context);
    if (airportUpdate) setNearbyAirports(airportUpdate);
    if (!hasNearbyAircraftPayload(context)) return;
    realtimeFrameRef.current = {
      ...realtimeFrameRef.current,
      revision: realtimeFrameRef.current.revision + 1,
    };
    const payload = normalizeRealtimeAircraftPayload(context?.aircraft);
    const fetchedAt = Date.parse(event.fetchedAt);
    const receiveTime = Number.isFinite(fetchedAt) ? fetchedAt : Date.now();
    const snapshot = normalizeAircraftSnapshot({ json: payload, receiveTime });
    const nextAircraft = traceTrackerRef.current.update(snapshot, receiveTime);
    setAircraft(nextAircraft);
    setFeedStatus(event.stale ? "infer" : "live");
    setFeedSource(typeof payload.source === "string" ? payload.source : "");
    const statusUpdatedDate = resolveLastSuccessfulPositionDate(snapshot);
    if (statusUpdatedDate) {
      setLastUpdated((prev) =>
        prev && prev.getTime() === statusUpdatedDate.getTime()
          ? prev
          : statusUpdatedDate,
      );
    }
    setSettled(true);
  }, [hasActiveQuery, nearbyRequest?.channel, realtime.event]);

  // A new airport view falls back to the ordinary private-service endpoint if
  // SSE has not supplied its first frame shortly after subscription. SSE gets
  // priority so the two paths do not hit the same upstream position source at
  // once during startup.
  useEffect(() => {
    if (!hasActiveQuery || settled) return undefined;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const requestChannel = channelKey;
        const realtimeRevisionAtStart = realtimeFrameRef.current.revision;
        const client = createAircraftPositionClient();
        const rawPayload = await client.fetchNearbyAircraft({
          lat: queryLat,
          lon: queryLon,
          distNm,
        });
        if (
          cancelled ||
          channelKeyRef.current !== requestChannel ||
          realtimeFrameRef.current.revision !== realtimeRevisionAtStart
        ) {
          return;
        }
        if (!hasAircraftPayload(rawPayload)) return;
        const payload = normalizeRealtimeAircraftPayload(rawPayload);
        const receiveTime = Date.now();
        const snapshot = normalizeAircraftSnapshot({ json: payload, receiveTime });
        const nextAircraft = traceTrackerRef.current.update(snapshot, receiveTime);
        setAircraft(nextAircraft);
        setFeedStatus(statusFromAircraftPayload(payload));
        setFeedSource(sourceFromAircraftPayload(payload));
        const statusUpdatedDate = resolveLastSuccessfulPositionDate(snapshot);
        if (statusUpdatedDate) setLastUpdated(statusUpdatedDate);
        setSettled(true);
      } catch (error) {
        if (!cancelled) console.warn("[aircraft-positions] initial snapshot failed", error);
      }
    }, INITIAL_SSE_SNAPSHOT_GRACE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [channelKey, distNm, hasActiveQuery, queryLat, queryLon, settled]);

  useEffect(() => {
    if (!hasActiveQuery || !realtime.fallbackActive) return undefined;

    let cancelled = false;
    let timer: number | null = null;
    let consecutiveFailures = 0;
    const client = createAircraftPositionClient();

    const load = async () => {
      try {
        const requestChannel = channelKey;
        const realtimeRevisionAtStart = realtimeFrameRef.current.revision;
        const rawPayload = await client.fetchNearbyAircraft({
          lat: queryLat,
          lon: queryLon,
          distNm,
        });
        if (
          cancelled ||
          channelKeyRef.current !== requestChannel ||
          realtimeFrameRef.current.revision !== realtimeRevisionAtStart
        ) {
          return;
        }
        if (!hasAircraftPayload(rawPayload)) return;
        const payload = normalizeRealtimeAircraftPayload(rawPayload);
        const receiveTime = Date.now();
        const snapshot = normalizeAircraftSnapshot({ json: payload, receiveTime });
        const nextAircraft = traceTrackerRef.current.update(snapshot, receiveTime);
        setAircraft(nextAircraft);
        setFeedStatus(statusFromAircraftPayload(payload));
        setFeedSource(sourceFromAircraftPayload(payload));
        const statusUpdatedDate = resolveLastSuccessfulPositionDate(snapshot);
        if (statusUpdatedDate) {
          setLastUpdated((prev) =>
            prev && prev.getTime() === statusUpdatedDate.getTime()
              ? prev
              : statusUpdatedDate,
          );
        }
        setSettled(true);
        consecutiveFailures = 0;
      } catch (error) {
        if (!cancelled) {
          consecutiveFailures += 1;
          setFeedStatus("error");
          setSettled(true);
          console.warn("[aircraft-positions] realtime fallback failed", error);
        }
      } finally {
        if (!cancelled) {
          // Exponential backoff on repeated failures so an unavailable or
          // rate-limited upstream is not hammered at the live cadence.
          timer = window.setTimeout(
            load,
            resolveNextPollDelayMs({
              baseMs: AIRCRAFT_TRAFFIC_CONFIG.pollMs,
              maxMs: AIRCRAFT_TRAFFIC_CONFIG.pollBackoffMaxMs,
              consecutiveFailures,
            }),
          );
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
    };
  }, [
    channelKey,
    distNm,
    hasActiveQuery,
    queryLat,
    queryLon,
    realtime.fallbackActive,
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
    loading: waitingForRealtime,
    initialLoading: waitingForRealtime,
    loadingOverlayActive: shouldShowAircraftLoadingOverlay({
      initialLoading: waitingForRealtime,
    }),
    settled,
    lastUpdated,
    feedStatus,
    feedSource,
    realtimeActive: realtime.connected && !realtime.fallbackActive,
    realtimeStatus,
    nearbyAirports,
    nearbyChannel: nearbyRequest?.channel || "",
  };
}
