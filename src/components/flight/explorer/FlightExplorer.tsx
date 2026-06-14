"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FlightSidebar from "@/components/sidebar/FlightSidebar";
import ExplorerMapMenu from "@/components/explorer/ExplorerMapMenu";
import {
  MapLoadingFallback,
  useMapLoadingOverlayText,
} from "@/components/map/MapLoadingOverlay";
import LostSignalToast from "@/components/aircraft/tracking/LostSignalToast";
import {
  getOrCreateTrackedFlight,
  getTraceCutoffMs,
} from "@/features/aircraft/tracking/trackedFlightStorage";
import {
  getTrackedFlightTraceRefreshKey,
} from "@/features/aircraft/tracking/lostSignalTrackingModel";
import {
  getFlightAwareFallbackAutoFitKey,
  getFlightAwareFallbackTraceStartAtMs,
} from "@/features/aircraft/tracking/flightAwareFallbackTrackingModel";
import {
  getFlightTrackingContextPosition,
  shouldShowFlightTrackingLoadingOverlay,
} from "@/features/aircraft/tracking/flightTrackingContextModel";
import {
  resolveTrackedAircraftSelectionSync,
  resolveFlightTrackingDisplayContext,
} from "@/features/aircraft/tracking/flightTrackingDisplayModel";
import { resolveFocusedFlightAwareRouteArcPath } from "@/features/aviation/flight-routes/flightRouteArcModel";
import { resolveRouteLookupEnabled } from "@/features/aviation/flight-routes/flightRouteLookupModel";
import { useFlightAwareEnabled } from "@/features/app-shell/auth/useFlightAwareEnabled";
import { resolveRouteProvider } from "@/features/aviation/sourceDisplayModel";
import { mergeTrackedAircraftIntoNearby } from "@/features/airport/explorer/airportExplorerModel";
import { AIRCRAFT_TRAFFIC_CONFIG } from "@/config/aviation";
import {
  mergeTrackedFlightMetadata,
  readTrackedFlightMetadata,
  writeTrackedFlightMetadata,
} from "@/features/aircraft/tracking/trackedFlightMetadataStorage";

// These map helpers import Leaflet, which evaluates `window` at module
// top — SSR-incompatible. Dynamic-import keeps those helpers
// out of the server bundle, same pattern AirportMap uses.
const FlightAwareRouteArc = dynamic(
  () => import("@/components/map/FlightAwareRouteArc"),
  { ssr: false },
);
const MapFitToTraceController = dynamic(
  () => import("@/components/map/MapFitToTraceController"),
  { ssr: false },
);
import {
  ExplorerUiProvider,
  useExplorerUi,
} from "@/components/explorer/ExplorerUiContext";
import { useAircraftPositions } from "@/hooks/useAircraftPositions";
import { useFlightRoutes } from "@/hooks/useFlightRoutes";
import { useNearbyAirports } from "@/hooks/useNearbyAirports";
import { useTrackedAircraft } from "@/hooks/useTrackedAircraft";
import { useWakeLock } from "@/hooks/useWakeLock";
import { getAircraftIdentity } from "@/features/airport/context/airportContextUiModel";
import { normalizeCallsign } from "@/utils/callsign";
import { formatFlightRouteLabel } from "@/utils/flightRouteDisplay";
import { getDistanceNm } from "@/utils/aircraftTrafficIntent";
import {
  beginAircraftMotionState,
  calculateAircraftVisualPosition,
} from "@/utils/aircraftMotion";
import { SelectedAircraftTraceProvider } from "@/components/aircraft/trace/SelectedAircraftTraceContext";
import AircraftPreviewCard from "@/components/aircraft/preview/AircraftPreviewCard";
import { resolveAircraftLoadingOverlayState } from "@/features/aircraft/positions/aircraftLoadingOverlayModel";

const AirportMap = dynamic(() => import("@/components/map/AirportMap"), {
  ssr: false,
  loading: () => <MapLoadingFallback variant="flight" />,
});

const FOCAL_VISUAL_POSITION_TICK_MS = 500;
const TRACE_VIEW_SESSION = "session";
const TRACE_VIEW_ALL = "all";

export default function FlightExplorer({ callsign = "" }) {
  return (
    <ExplorerUiProvider>
      <FlightExplorerContent callsign={callsign} />
    </ExplorerUiProvider>
  );
}

function FlightExplorerContent({ callsign }) {
  const router = useRouter();
  const {
    enabled: flightAwareEnabled,
    resolved: flightAwareResolved,
  } = useFlightAwareEnabled();
  const routeProvider = resolveRouteProvider({ flightAwareEnabled });
  const {
    desktopSidebarWidth,
    sidebarOpen,
    isMobile,
    mapZoom,
    showMapLabels,
    showNavaidMarkers,
    showAirspaces,
    mapSettings,
    trafficFilter,
    typeFilter,
    altitudeLevel,
    selectedAircraftId,
    selectedAirportIcao,
    selectedNavaidKey,
    selectedAirspaceId,
    closeSidebar,
    selectAircraft,
    setSelectedAircraftId,
    selectAirport,
    selectNavaid,
    selectAirspace,
    clearAllPreviewSelections,
    toggleMapLabels,
    fitToTrace,
    suspendMapFollow,
    mapFollowsAircraft,
  } = useExplorerUi();
  const [wakeLockState, toggleWakeLock] = useWakeLock();
  const [traceViewMode, setTraceViewMode] = useState(TRACE_VIEW_SESSION);
  const pendingTraceFitRef = useRef(false);

  // Default-on location labels for the flight page: when tracking a
  // specific aircraft cross-country the place names give the moving map
  // useful context, so the labels start visible (user can still toggle
  // off via the map control). Effect fires once via the ref guard so
  // subsequent toggles aren't clobbered.
  const labelsInitializedRef = useRef(false);
  useEffect(() => {
    if (labelsInitializedRef.current) return;
    labelsInitializedRef.current = true;
    if (!showMapLabels) toggleMapLabels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    aircraft: trackedAircraft,
    feedSource,
    lastUpdated,
    loadingOverlayActive: trackedLoadingOverlayActive,
    settled: trackedAircraftSettled,
    lostSignal,
    pollVersion: trackedPollVersion,
    visibilityRefreshVersion: trackedVisibilityRefreshVersion,
    trackingState,
    realtimeStatus,
  } = useTrackedAircraft(callsign, {
    flightAwareEnabled,
    flightAwareResolved,
  });
  const [cachedTrackedMetadata, setCachedTrackedMetadata] = useState(null);
  const [contextTiles, setContextTiles] = useState({
    airspaces: [],
    navaids: [],
    navaidCounts: [],
    loading: false,
    error: null,
  });
  useEffect(() => {
    setCachedTrackedMetadata(readTrackedFlightMetadata(callsign));
  }, [callsign]);
  const trackedAircraftForDisplay = useMemo(
    () =>
      mergeTrackedFlightMetadata({
        aircraft: trackedAircraft,
        metadata: cachedTrackedMetadata,
      }),
    [cachedTrackedMetadata, trackedAircraft],
  );

  // Anchor the tracking session as soon as we have a callsign so the
  // 12h TTL starts ticking on first load — the hex is recorded once it
  // becomes available so the cache captures the icao24 we anchored on.
  // The cutoff (firstTrackedAt - 30 min) drives trace clipping for the
  // focal aircraft below.
  const [trackingSession, setTrackingSession] = useState(null);
  useEffect(() => {
    if (!callsign) {
      setTrackingSession(null);
      return;
    }
    const session = getOrCreateTrackedFlight(callsign, {
      hex: trackedAircraftForDisplay?.icao24 || null,
    });
    if (session) setTrackingSession(session);
  }, [callsign, trackedAircraftForDisplay?.icao24]);
  const sessionTraceStartAtMs = useMemo(
    () =>
      getFlightAwareFallbackTraceStartAtMs({
        trackingState,
        defaultTraceStartAtMs: getTraceCutoffMs(trackingSession),
      }),
    [trackingSession, trackingState],
  );
  const focalTraceStartAtMs =
    traceViewMode === TRACE_VIEW_ALL ? null : sessionTraceStartAtMs;
  const requestTraceView = useCallback(
    (mode) => {
      if (traceViewMode === mode) {
        fitToTrace();
        return;
      }
      pendingTraceFitRef.current = true;
      setTraceViewMode(mode);
    },
    [fitToTrace, traceViewMode],
  );
  useEffect(() => {
    if (!pendingTraceFitRef.current) return undefined;
    pendingTraceFitRef.current = false;
    const frame = window.requestAnimationFrame(() => fitToTrace());
    return () => window.cancelAnimationFrame(frame);
  }, [fitToTrace, traceViewMode]);
  const traceViewItems = useMemo(
    () => [
      {
        id: "trace:full",
        labelKey: "map.fullTrace",
        iconKey: "route",
        active: !mapFollowsAircraft && traceViewMode === TRACE_VIEW_SESSION,
        onSelect: () => requestTraceView(TRACE_VIEW_SESSION),
      },
      {
        id: "trace:all",
        labelKey: "map.allRecordedPoints",
        iconKey: "chartScatter",
        active: !mapFollowsAircraft && traceViewMode === TRACE_VIEW_ALL,
        onSelect: () => requestTraceView(TRACE_VIEW_ALL),
      },
    ],
    [mapFollowsAircraft, requestTraceView, traceViewMode],
  );
  const flightAwareAutoFitKey = useMemo(
    () =>
      getFlightAwareFallbackAutoFitKey({
        trackingState,
        callsign,
        aircraftHex: trackedAircraftForDisplay?.icao24,
      }),
    [callsign, trackedAircraftForDisplay?.icao24, trackingState],
  );
  const routeAutoFitKey = useMemo(() => {
    if (flightAwareAutoFitKey) return flightAwareAutoFitKey;
    if (trackingState?.status !== "oceanic_adsc") return "";
    const normalizedCallsign = String(callsign || "").trim().toUpperCase();
    const normalizedHex = String(trackedAircraftForDisplay?.icao24 || "")
      .trim()
      .toUpperCase();
    if (!normalizedCallsign) return "";
    return ["oceanic-adsc", normalizedCallsign, normalizedHex]
      .filter(Boolean)
      .join(":");
  }, [
    callsign,
    flightAwareAutoFitKey,
    trackedAircraftForDisplay?.icao24,
    trackingState,
  ]);
  const focalTraceRefreshKey = useMemo(
    () =>
      getTrackedFlightTraceRefreshKey({
        lostSignal,
        pollVersion: trackedPollVersion,
        visibilityRefreshVersion: trackedVisibilityRefreshVersion,
        trackingState,
        pollMs: AIRCRAFT_TRAFFIC_CONFIG.pollMs,
        flightAwareTraceRefreshMs:
          AIRCRAFT_TRAFFIC_CONFIG.flightAwareTraceRefreshMs,
      }),
    [
      lostSignal,
      trackedPollVersion,
      trackedVisibilityRefreshVersion,
      trackingState,
    ],
  );

  // User can dismiss the lost-signal toast to keep watching the last
  // known trace. The dismissal resets whenever the feed comes back so a
  // later disappearance still prompts.
  const [lostSignalDismissed, setLostSignalDismissed] = useState(false);
  useEffect(() => {
    if (!lostSignal) setLostSignalDismissed(false);
  }, [lostSignal]);

  // Keep the last known position around so the map doesn't snap back when
  // the tracked aircraft is briefly absent from the feed.
  const lastKnownRef = useRef({ lat: null, lon: null });
  const focalMotionRef = useRef(null);
  const visualFocalPositionRef = useRef({ lat: null, lon: null });
  const [visualFocalPosition, setVisualFocalPosition] = useState({
    lat: null,
    lon: null,
  });
  const trackedLat = toFiniteCoordinate(trackedAircraftForDisplay?.lat);
  const trackedLon = toFiniteCoordinate(trackedAircraftForDisplay?.lon);
  if (trackedLat != null && trackedLon != null) {
    lastKnownRef.current = {
      lat: trackedLat,
      lon: trackedLon,
    };
  }
  useEffect(() => {
    visualFocalPositionRef.current = { lat: null, lon: null };
    focalMotionRef.current = null;
    setVisualFocalPosition({ lat: null, lon: null });
  }, [callsign]);
  useEffect(() => {
    if (!trackedAircraftForDisplay || trackedLat == null || trackedLon == null) {
      return;
    }
    const now = Date.now();
    const currentVisual =
      visualFocalPositionRef.current.lat != null &&
      visualFocalPositionRef.current.lon != null
        ? visualFocalPositionRef.current
        : null;
    focalMotionRef.current = beginAircraftMotionState(
      trackedAircraftForDisplay,
      now,
      currentVisual,
    );
    const nextPosition = calculateAircraftVisualPosition(
      focalMotionRef.current,
      now,
    );
    updateVisualFocalPosition({
      nextPosition,
      positionRef: visualFocalPositionRef,
      setPosition: setVisualFocalPosition,
    });
  }, [trackedAircraftForDisplay, trackedLat, trackedLon]);
  useEffect(() => {
    const tick = () => {
      const motion = focalMotionRef.current;
      if (!motion) return;
      updateVisualFocalPosition({
        nextPosition: calculateAircraftVisualPosition(motion),
        positionRef: visualFocalPositionRef,
        setPosition: setVisualFocalPosition,
      });
    };
    tick();
    const timer = window.setInterval(tick, FOCAL_VISUAL_POSITION_TICK_MS);
    return () => window.clearInterval(timer);
  }, []);
  const visualFocalLat = toFiniteCoordinate(visualFocalPosition.lat);
  const visualFocalLon = toFiniteCoordinate(visualFocalPosition.lon);
  const focalLat = visualFocalLat ?? lastKnownRef.current.lat;
  const focalLon = visualFocalLon ?? lastKnownRef.current.lon;
  const contextPosition = useMemo(
    () =>
      getFlightTrackingContextPosition({
        lat: focalLat,
        lon: focalLon,
      }),
    [focalLat, focalLon],
  );
  const contextLat = contextPosition?.lat ?? null;
  const contextLon = contextPosition?.lon ?? null;
  const flightDisplayContext: Record<string, any> = useMemo(
    () =>
      resolveFlightTrackingDisplayContext({
        trackingState,
        isMobile,
      }),
    [isMobile, trackingState],
  );
  const showNearbyContext = Boolean(flightDisplayContext.showNearbyContext !== false);
  const showNearbyTrafficContext =
    showNearbyContext &&
    flightDisplayContext.showNearbyTrafficContext !== false;
  const showNearbyAirportContext =
    showNearbyContext &&
    flightDisplayContext.showNearbyAirportContext !== false;
  const routeEndpointAirportsOnly = Boolean(
    flightDisplayContext.routeEndpointAirportsOnly,
  );
  const showNearbyMapContext =
    flightDisplayContext.showNearbyMapContext !== false;
  const nearbyAircraftQueryLat = showNearbyTrafficContext ? contextLat : null;
  const nearbyAircraftQueryLon = showNearbyTrafficContext ? contextLon : null;
  const nearbyAirportQueryLat = showNearbyAirportContext ? contextLat : null;
  const nearbyAirportQueryLon = showNearbyAirportContext ? contextLon : null;

  const {
    aircraft: fetchedNearbyAircraft,
    loading: fetchedNearbyAircraftLoading,
    settled: fetchedNearbyAircraftSettled,
  } = useAircraftPositions(
    callsign || "",
    nearbyAircraftQueryLat,
    nearbyAircraftQueryLon,
    {
      pollWhenHidden: false,
      distNm: flightDisplayContext.aircraftRangeNm,
    },
  );

  // Pull airports around the focal so the sidebar list and the map's
  // airport layer both show context relative to the moving flight.
  const {
    airports: fetchedNearbyAirports,
    loading: fetchedNearbyAirportsLoading,
    settled: fetchedNearbyAirportsSettled,
  } = useNearbyAirports({
    lat: nearbyAirportQueryLat,
    lon: nearbyAirportQueryLon,
    radiusNm: flightDisplayContext.airportRadiusNm,
    limit: flightDisplayContext.airportLimit,
  });
  const nearbyAircraft = useMemo(
    () => (showNearbyTrafficContext ? fetchedNearbyAircraft : []),
    [fetchedNearbyAircraft, showNearbyTrafficContext],
  );
  const nearbyAirports = useMemo(
    () => (showNearbyAirportContext ? fetchedNearbyAirports : []),
    [fetchedNearbyAirports, showNearbyAirportContext],
  );
  const selectedNavaid = useMemo(
    () =>
      contextTiles.navaids.find((navaid) => {
        const key = navaid?.key || (
          navaid?.ident ? `${navaid?.id ?? navaid.ident}-${navaid.ident}` : ""
        );
        return key === selectedNavaidKey;
      }) || null,
    [contextTiles.navaids, selectedNavaidKey],
  );
  const selectedAirspace = useMemo(
    () =>
      contextTiles.airspaces.find(
        (airspace) => airspace?.id === selectedAirspaceId,
      ) || null,
    [contextTiles.airspaces, selectedAirspaceId],
  );

  // Merge tracked aircraft into the nearby list so the map always renders
  // it (the radius poll can lag a beat behind the callsign poll).
  const rawAircraft = useMemo(() => {
    if (!showNearbyTrafficContext) {
      return trackedAircraftForDisplay ? [trackedAircraftForDisplay] : [];
    }
    return mergeTrackedAircraftIntoNearby({
      trackedAircraft: trackedAircraftForDisplay,
      nearbyAircraft,
    });
  }, [showNearbyTrafficContext, trackedAircraftForDisplay, nearbyAircraft]);

  // Look up routes for the tracked aircraft and any nearby traffic the user
  // might preview. No airport context on this page — the cache key is just
  // the callsign — and the same hook gives us the applyTemporaryRoute
  // callback so the preview-card feedback form can splice an override into
  // the in-memory cache without a refetch.
  const {
    routesByCallsign,
    loadingCount: routeLoadingCount,
    applyTemporaryRoute,
  } = useFlightRoutes(rawAircraft, {
    enabled: resolveRouteLookupEnabled({
      featureFlagsResolved: flightAwareResolved,
    }),
    lat: contextLat,
    lon: contextLon,
    routeProvider,
  });

  const aircraft = useMemo(
    () =>
      rawAircraft.map((item) => {
        const key = normalizeCallsign(item.callsign);
        const route = key ? routesByCallsign[key] || null : null;
        return {
          ...item,
          flightRoute: route,
          flightRouteLabel: formatFlightRouteLabel(route),
        };
      }),
    [rawAircraft, routesByCallsign],
  );

  // Backfill the focal position from the merged (nearby-favored) array so
  // the map center uses the freshest position across all data sources,
  // not just the dedicated callsign API result.
  const focalFromMerged = useMemo(() => {
    if (!trackedAircraftForDisplay) return null;
    const key = getAircraftIdentity(trackedAircraftForDisplay);
    return aircraft.find((item) => getAircraftIdentity(item) === key) || null;
  }, [aircraft, trackedAircraftForDisplay]);

  useEffect(() => {
    if (!focalFromMerged) return;
    const lat = toFiniteCoordinate(focalFromMerged.lat);
    const lon = toFiniteCoordinate(focalFromMerged.lon);
    if (lat != null && lon != null) {
      lastKnownRef.current = { lat, lon };
    }
  }, [focalFromMerged]);

  // Default the selection to the focal aircraft so its trace appears on
  // load. Once the user clicks around it's their choice.
  const focalKey = trackedAircraftForDisplay
    ? getAircraftIdentity(trackedAircraftForDisplay)
    : "";
  const focalCallsignKey = String(
    trackedAircraftForDisplay?.callsign || callsign || "",
  ).trim();
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || !focalKey) return;
    seededRef.current = true;
    setSelectedAircraftId(focalKey);
  }, [focalKey, setSelectedAircraftId]);
  const previousFocalKeyRef = useRef("");
  useEffect(() => {
    if (!focalKey) return;
    const previousFocalKey = previousFocalKeyRef.current;
    previousFocalKeyRef.current = focalKey;
    const nextSelectedAircraftId = resolveTrackedAircraftSelectionSync({
      focalKey,
      previousFocalKey,
      focalCallsignKey,
      selectedAircraftId,
    });
    if (nextSelectedAircraftId) {
      setSelectedAircraftId(nextSelectedAircraftId);
    }
  }, [
    focalCallsignKey,
    focalKey,
    selectedAircraftId,
    setSelectedAircraftId,
  ]);

  const selectedAircraft = useMemo(
    () =>
      aircraft.find(
        (item) => getAircraftIdentity(item) === selectedAircraftId,
      ) || null,
    [aircraft, selectedAircraftId],
  );

  // The sidebar reads `aircraft.flightRoute` / `flightRouteLabel` to paint
  // the route header. `trackedAircraft` straight out of useTrackedAircraft
  // has no route fields — we hand it the enriched entry from the same
  // array we already fed routes into, so the sidebar shows the route
  // (community-feedback override or adsbdb) for the focal callsign.
  const enrichedTrackedAircraft = useMemo(() => {
    if (!trackedAircraftForDisplay) return null;
    const trackedKey = getAircraftIdentity(trackedAircraftForDisplay);
    return (
      aircraft.find((item) => getAircraftIdentity(item) === trackedKey) ||
      trackedAircraftForDisplay
    );
  }, [aircraft, trackedAircraftForDisplay]);
  const routeEndpointCandidates = useMemo(
    () =>
      buildRouteEndpointCandidates({
        route: enrichedTrackedAircraft?.flightRoute,
        aircraft: enrichedTrackedAircraft,
      }),
    [enrichedTrackedAircraft],
  );
  const [routeAirportDetailsByCode, setRouteAirportDetailsByCode] = useState({});
  useEffect(() => {
    if (!routeEndpointAirportsOnly || routeEndpointCandidates.length === 0) {
      return undefined;
    }
    const missingCodes = [
      ...new Set(
        routeEndpointCandidates
          .filter(
            (candidate) =>
              candidate.code &&
              !hasAirportCoordinates(candidate.point) &&
              routeAirportDetailsByCode[candidate.code] === undefined,
          )
          .map((candidate) => candidate.code),
      ),
    ];
    if (missingCodes.length === 0) return undefined;

    const controller = new AbortController();
    Promise.all(
      missingCodes.map(async (code) => {
        try {
          const response = await fetch(`/api/airport/${encodeURIComponent(code)}`, {
            signal: controller.signal,
          });
          if (!response.ok) return [code, null];
          const payload = await response.json();
          return [code, payload?.airport || null];
        } catch {
          return [code, null];
        }
      }),
    ).then((entries) => {
      if (controller.signal.aborted) return;
      setRouteAirportDetailsByCode((current) => {
        const next = { ...current };
        for (const [code, airport] of entries) next[code] = airport;
        return next;
      });
    });

    return () => controller.abort();
  }, [
    routeAirportDetailsByCode,
    routeEndpointAirportsOnly,
    routeEndpointCandidates,
  ]);
  // Full-trace mode declutters the zoomed-out viewport: only the focal
  // aircraft and parsed route endpoints (if any) stay on the map/list.
  const routeEndpointAirports = useMemo(() => {
    if (routeEndpointCandidates.length === 0) return [];
    const endpoints = [];
    for (const candidate of routeEndpointCandidates) {
      const point = hasAirportCoordinates(candidate.point)
        ? candidate.point
        : routeAirportDetailsByCode[candidate.code];
      if (!point) continue;
      const pointLat = Number(point.lat);
      const pointLon = Number(point.lon);
      if (!Number.isFinite(pointLat) || !Number.isFinite(pointLon)) continue;
      endpoints.push({
        icao: point.icao || "",
        iata: point.iata || "",
        name: point.name || "",
        municipality: point.municipality || point.city || "",
        country: point.country || "",
        lat: pointLat,
        lon: pointLon,
        routeEndpointRole: candidate.role,
        distanceNm:
          focalLat != null && focalLon != null
            ? getDistanceNm(focalLat, focalLon, pointLat, pointLon)
            : null,
      });
    }
    return endpoints;
  }, [
    focalLat,
    focalLon,
    routeAirportDetailsByCode,
    routeEndpointCandidates,
  ]);
  const sidebarNearbyAirports = useMemo(
    () => (routeEndpointAirportsOnly ? routeEndpointAirports : nearbyAirports),
    [nearbyAirports, routeEndpointAirports, routeEndpointAirportsOnly],
  );

  const selectedAirport = useMemo(
    () =>
      sidebarNearbyAirports.find(
        (airport) => airport?.icao === selectedAirportIcao,
      ) || null,
    [sidebarNearbyAirports, selectedAirportIcao],
  );

  const mapAircraft = useMemo(() => {
    if (!mapFollowsAircraft) {
      return enrichedTrackedAircraft ? [enrichedTrackedAircraft] : [];
    }
    return showNearbyMapContext
      ? aircraft
      : enrichedTrackedAircraft
        ? [enrichedTrackedAircraft]
        : [];
  }, [
    aircraft,
    enrichedTrackedAircraft,
    showNearbyMapContext,
    mapFollowsAircraft,
  ]);
  const mapNearbyAirports = useMemo(() => {
    if (!mapFollowsAircraft) return routeEndpointAirports;
    return showNearbyMapContext ? nearbyAirports : [];
  }, [
    mapFollowsAircraft,
    nearbyAirports,
    routeEndpointAirports,
    showNearbyMapContext,
  ]);
  const trackedMetadataSignature = useMemo(
    () =>
      JSON.stringify({
        type: enrichedTrackedAircraft?.type || "",
        desc: enrichedTrackedAircraft?.desc || "",
        category: enrichedTrackedAircraft?.category || "",
        origin: enrichedTrackedAircraft?.origin || "",
        destination: enrichedTrackedAircraft?.destination || "",
        route: enrichedTrackedAircraft?.route || "",
        flightRoute: enrichedTrackedAircraft?.flightRoute || null,
      }),
    [
      enrichedTrackedAircraft?.type,
      enrichedTrackedAircraft?.desc,
      enrichedTrackedAircraft?.category,
      enrichedTrackedAircraft?.origin,
      enrichedTrackedAircraft?.destination,
      enrichedTrackedAircraft?.route,
      enrichedTrackedAircraft?.flightRoute,
    ],
  );
  const lastWrittenMetadataSignatureRef = useRef("");
  useEffect(() => {
    if (!callsign || !enrichedTrackedAircraft) return;
    if (
      !trackedMetadataSignature ||
      trackedMetadataSignature === lastWrittenMetadataSignatureRef.current
    ) {
      return;
    }
    const written = writeTrackedFlightMetadata(callsign, {
      aircraft: enrichedTrackedAircraft,
    });
    if (written) {
      lastWrittenMetadataSignatureRef.current = trackedMetadataSignature;
      setCachedTrackedMetadata(written);
    }
  }, [callsign, enrichedTrackedAircraft, trackedMetadataSignature]);

  useEffect(() => {
    if (showNearbyContext || !focalKey || selectedAircraftId === focalKey) {
      return;
    }
    setSelectedAircraftId(focalKey);
  }, [focalKey, selectedAircraftId, setSelectedAircraftId, showNearbyContext]);

  const focalRoutePath = useMemo(() => {
    return resolveFocusedFlightAwareRouteArcPath({
      selectedAircraft,
      focalAircraft: enrichedTrackedAircraft,
      routeProvider,
      routeEndpointAirportsOnly,
      from: { lat: focalLat, lon: focalLon },
    });
  }, [
    enrichedTrackedAircraft,
    focalLat,
    focalLon,
    routeProvider,
    routeEndpointAirportsOnly,
    selectedAircraft,
  ]);

  const handleBack = () => router.push("/");

  const flightTrackingLoadingActive = shouldShowFlightTrackingLoadingOverlay({
    hasActiveFlight: Boolean(callsign),
    trackedAircraftSettled,
    trackedLoadingOverlayActive,
  });
  const loadingOverlaySources = {
    trackedAircraftLoading: flightTrackingLoadingActive,
    trafficLoading:
      showNearbyTrafficContext &&
      (fetchedNearbyAircraftLoading || !fetchedNearbyAircraftSettled),
    nearbyAirportsLoading:
      showNearbyAirportContext &&
      (fetchedNearbyAirportsLoading || !fetchedNearbyAirportsSettled),
    routeLoadingCount,
  };
  const sourceLoadingState = resolveAircraftLoadingOverlayState({
    mapReady: true,
    variant: "flight",
    feedLoading: false,
    ...loadingOverlaySources,
  });
  const sourceLoadingCopy = useMapLoadingOverlayText({
    mode: sourceLoadingState.mode,
    reason: sourceLoadingState.reason,
    variant: "flight",
    callsign,
  });
  const sourceLoadingStatus = sourceLoadingState.active
    ? sourceLoadingCopy.status
    : "";
  const toolbarContextProps = {
    traceViewItems,
    wakeLockState,
    onToggleWakeLock: toggleWakeLock,
    zoomDisabled: flightDisplayContext.zoomDisabled,
  };
  const mobileSidebarToolbar = (
    <ExplorerMapMenu
      surface="sidebar"
      onMap={closeSidebar}
      {...toolbarContextProps}
    />
  );

  const sidebarProps = {
    callsign,
    aircraft: enrichedTrackedAircraft,
    nearbyAircraft: aircraft,
    nearbyAirports: sidebarNearbyAirports,
    focusLat: focalLat,
    focusLon: focalLon,
    selectedAircraftId,
    suppressedAircraftDistanceId: focalKey,
    selectedAirportIcao,
    onSelectAircraft: selectAircraft,
    onSelectAirport: selectAirport,
    showNearbyList: showNearbyContext,
    feedSource,
    lastUpdated,
    loadingStatus: sourceLoadingStatus,
    onBack: handleBack,
    onMap: closeSidebar,
    mobileToolbar: mobileSidebarToolbar,
  };

  return (
    <SelectedAircraftTraceProvider
      selectedAircraft={selectedAircraft}
      focalAircraft={enrichedTrackedAircraft}
      fullTraceForFocal={flightDisplayContext.fullTraceForFocal}
      showSelectedTrace={showNearbyMapContext}
      focalTraceStartAtMs={focalTraceStartAtMs}
      focalPersistKey={
        traceViewMode === TRACE_VIEW_ALL ? null : callsign || null
      }
      focalTraceRefreshKey={focalTraceRefreshKey}
    >
      <AircraftPreviewCard
        aircraft={selectedAircraft}
        airport={selectedAirport}
        navaid={selectedNavaid}
        airspace={selectedAirspace}
        isMobile={isMobile}
        sidebarOpen={sidebarOpen}
        onApplyTemporaryRoute={applyTemporaryRoute}
        onDismiss={clearAllPreviewSelections}
      />
      <div
        className={`font-sans text-atc-text ${
          isMobile
            ? "app-detail-shell fixed inset-0 z-0 flex overflow-hidden overscroll-y-none"
            : `airport-map-kit ${
                sidebarOpen ? "airport-map-kit--sidebar-open" : ""
              } flex h-dvh overflow-hidden`
        }`}
      >
        {!isMobile && (
          <div
            className="airport-desktop-sidebar shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out"
            data-open={sidebarOpen ? "true" : "false"}
            style={{ width: sidebarOpen ? desktopSidebarWidth : "0" }}
          >
            <div className="app-panel-transition h-full" style={{ width: desktopSidebarWidth }}>
              <FlightSidebar {...sidebarProps} />
            </div>
          </div>
        )}

        <div className="airport-map-stage relative min-w-0 flex-1 overflow-hidden bg-atc-bg">
          {!(isMobile && sidebarOpen) && (
            <ExplorerMapMenu
              feedSource=""
              feedStatus="live"
              lastUpdated={lastUpdated}
              routeProvider={routeProvider}
              loadingStatus={sourceLoadingStatus}
              realtimeStatus={realtimeStatus}
              {...toolbarContextProps}
            />
          )}
          <AirportMap
            icao=""
            lat={focalLat}
            lon={focalLon}
            zoom={mapZoom}
            aircraft={mapAircraft}
            nearbyAirports={mapNearbyAirports}
            nearbyNavaids={contextTiles.navaids}
            airspaces={contextTiles.airspaces}
            airport={null}
            showMapLabels={showMapLabels}
            showRunwayBeams={false}
            showNavaidMarkers={showNavaidMarkers}
            showAirspaces={showAirspaces}
            baseLayer={mapSettings?.baseLayer}
            trafficFilter={trafficFilter}
            typeFilter={typeFilter}
            altitudeLevel={altitudeLevel}
            selectedAircraftId={selectedAircraftId}
            selectedAirportIcao={selectedAirportIcao}
            selectedNavaidKey={selectedNavaidKey}
            selectedAirspaceId={selectedAirspaceId}
            focalAircraftId={focalKey}
            followsCenter={mapFollowsAircraft}
            floatingSidebarAware={!isMobile && sidebarOpen}
            onSelectAircraft={selectAircraft}
            onSelectAirport={selectAirport}
            onSelectNavaid={selectNavaid}
            onSelectAirspace={selectAirspace}
            runwayMap={null}
            focalRangeRings={false}
            contextTileOverlays
            contextTileRefreshKey={`${callsign}:${mapFollowsAircraft}:${mapZoom}`}
            fullTraceContext={!mapFollowsAircraft}
            onContextTilesChange={setContextTiles}
            deferUntilFocal
            loadingOverlayActive={flightTrackingLoadingActive}
            loadingOverlayVariant="flight"
            loadingOverlayCallsign={callsign}
            loadingOverlaySources={loadingOverlaySources}
          >
            <FlightAwareRouteArc path={focalRoutePath} />
            <MapFitToTraceController
              routePath={focalRoutePath}
              centerAnchor={{ lat: focalLat, lon: focalLon }}
              centerAnchorFollowKey={
                !mapFollowsAircraft && focalLat != null && focalLon != null
                  ? routeAutoFitKey
                  : ""
              }
              autoFitKey={routeAutoFitKey}
              fitOptions={flightDisplayContext.mapFitOptions}
              onAutoFit={
                flightDisplayContext.autoFitSuspendsFollow
                  ? suspendMapFollow
                  : undefined
              }
            />
          </AirportMap>

          {isMobile && sidebarOpen && (
            <div className="absolute inset-0 z-map-panel overscroll-none overflow-y-auto">
              <FlightSidebar {...sidebarProps} onClose={closeSidebar} />
            </div>
          )}

          <LostSignalToast
            active={lostSignal && !lostSignalDismissed && !realtimeStatus}
            callsign={callsign}
            onStay={() => setLostSignalDismissed(true)}
            onBackHome={handleBack}
          />
        </div>
      </div>
    </SelectedAircraftTraceProvider>
  );
}

function toFiniteCoordinate(value) {
  if (value == null || value === "") return null;
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
}

function normalizeAirportCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function splitRouteCodePair(value) {
  const code = String(value || "").trim().toUpperCase();
  if (!code) return [];
  return code
    .split(/\s*(?:->|→|-)\s*/)
    .map(normalizeAirportCode)
    .filter(Boolean)
    .slice(0, 2);
}

function airportCodeFromRoutePoint(point) {
  if (!point) return "";
  return normalizeAirportCode(point.icao) || normalizeAirportCode(point.iata);
}

function hasAirportCoordinates(point) {
  return (
    point &&
    toFiniteCoordinate(point.lat) != null &&
    toFiniteCoordinate(point.lon) != null
  );
}

function buildRouteEndpointCandidates({ route, aircraft }) {
  const icaoCodes = splitRouteCodePair(route?.route?.icao);
  const iataCodes = splitRouteCodePair(route?.route?.iata || aircraft?.route);
  const originCode =
    airportCodeFromRoutePoint(route?.origin) ||
    icaoCodes[0] ||
    iataCodes[0] ||
    normalizeAirportCode(aircraft?.origin);
  const destinationCode =
    airportCodeFromRoutePoint(route?.destination) ||
    icaoCodes[1] ||
    iataCodes[1] ||
    normalizeAirportCode(aircraft?.destination);

  return [
    { code: originCode, point: route?.origin || null, role: "origin" },
    { code: destinationCode, point: route?.destination || null, role: "destination" },
  ].filter((candidate) => candidate.code || candidate.point);
}

function positionsNear(a, b) {
  if (!a || !b) return false;
  return (
    Math.abs(Number(a.lat) - Number(b.lat)) < 0.000001 &&
    Math.abs(Number(a.lon) - Number(b.lon)) < 0.000001
  );
}

function updateVisualFocalPosition({ nextPosition, positionRef, setPosition }) {
  const nextLat = toFiniteCoordinate(nextPosition?.lat);
  const nextLon = toFiniteCoordinate(nextPosition?.lon);
  if (nextLat == null || nextLon == null) return;
  const next = { lat: nextLat, lon: nextLon };
  if (positionsNear(positionRef.current, next)) return;
  positionRef.current = next;
  setPosition(next);
}
