import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import FlightSidebar from "@/components/sidebar/FlightSidebar";
import ExplorerMapMenu from "@/components/explorer/ExplorerMapMenu";
import {
  MapLoadingFallback,
  useMapLoadingOverlayText,
} from "@/components/map/MapLoadingOverlay";
import LostSignalToast from "@/components/aircraft/tracking/LostSignalToast";
import {
  getFlightTrackingContextPosition,
  resolveFlightFocalLifecycle,
  resolveFlightTerminalReason,
} from "@/features/aircraft/tracking/flightTrackingContextModel";
import { logFlightMapLifecycle } from "@/features/aircraft/tracking/flightMapLifecycleLog";
import {
  resolveFlightRouteCandidateCallsigns,
  resolveTrackedAircraftSelectionSync,
  resolveFlightTrackingDisplayContext,
} from "@/features/aircraft/tracking/flightTrackingDisplayModel";
import {
  resolveFocusedFlightFullRoutePath,
  resolveFocusedFlightRouteArcPath,
} from "@/features/aviation/flight-routes/flightRouteArcModel";
import { mergeTrackedAircraftIntoNearby } from "@/features/airport/explorer/airportExplorerModel";
import { AirportMapInteractionMode } from "@/features/airport/map/mapInteractionMode";
import {
  mergeTrackedFlightMetadata,
  readTrackedFlightMetadata,
  writeTrackedFlightMetadata,
} from "@/features/aircraft/tracking/trackedFlightMetadataStorage";

import {
  ExplorerUiProvider,
  useExplorerUi,
} from "@/components/explorer/ExplorerUiContext";
import { useFlightRoutes } from "@/hooks/useFlightRoutes";
import { useTrackedAircraft } from "@/hooks/useTrackedAircraft";
import { useTrackingRun } from "@/hooks/useTrackingRun";
import { useWakeLock } from "@/hooks/useWakeLock";
import { getAircraftIdentity } from "@/features/airport/context/airportContextUiModel";
import { normalizeCallsign } from "@/utils/callsign";
import { formatFlightRouteLabel } from "@/utils/flightRouteDisplay";
import { getDistanceNm } from "@/utils/aircraftTrafficIntent";
import {
  beginAircraftMotionState,
  calculateAircraftVisualPosition,
  shouldAnimateAircraftVisualPosition,
} from "@/utils/aircraftMotion";
import { subscribeAircraftMotionFrame } from "@/components/map/aircraftMotionFrameLoop";
import { SelectedAircraftTraceProvider } from "@/components/aircraft/trace/SelectedAircraftTraceContext";
import AircraftPreviewCard from "@/components/aircraft/preview/AircraftPreviewCard";
import { resolveAircraftLoadingOverlayState } from "@/features/aircraft/positions/aircraftLoadingOverlayModel";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useUserLocationLayer } from "@/hooks/useUserLocationLayer";
import { resolveFlightJourneyProgress } from "@/features/aircraft/onboard/flightJourneyProgressModel";
import { mapSettingsToExplorerLayers } from "@/features/airport/map-settings/mapSettingsModel";

const FlightRouteArc = lazy(() => import("@/components/map/FlightRouteArc"));
const MapFitToTraceController = lazy(() => import("@/components/map/MapFitToTraceController"));
const AirportMap = lazy(() => import("@/components/map/AirportMap"));

// Keep React's position consumers (route copy, context queries, trace labels)
// intentionally low-frequency. The map and focal canvas marker read the same
// ref directly on the shared motion frame, avoiding whole-explorer renders at
// display cadence.
const FOCAL_VISUAL_POSITION_PUBLISH_MS = 500;
const FOCAL_MOTION_OPTIONS = {
  maxCatchupM: null,
  maxVisualSpeedMultiplier: 2.5,
} as const;
const TRACE_VIEW_FULL = "full";
const TRACE_VIEW_RECORDED = "recorded";
// Max wait for a focal position before the flight map resolves to the terminal
// "no live position" card when the live feed has no plottable aircraft.
const FLIGHT_NO_POSITION_GRACE_MS = 9000;

export default function FlightExplorer({ callsign = "", onboardMode = false }) {
  return (
    <ExplorerUiProvider>
      <FlightExplorerContent
        key={`${callsign}:${onboardMode ? "onboard" : "tracking"}`}
        callsign={callsign}
        onboardMode={onboardMode}
      />
    </ExplorerUiProvider>
  );
}

function FlightExplorerContent({ callsign, onboardMode = false }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [mapMainContentLoading, setMapMainContentLoading] = useState(true);
  const {
    desktopSidebarWidth,
    clientDeviceProfile,
    clientDeviceLayout,
    sidebarOpen,
    sidebarCollapsed,
    isMobile,
    mapZoom,
    showMapLabels,
    showNavaidMarkers,
    showAirspaces,
    mapSettings,
    mapSettingsReadyForUserLocation,
    userLocationEnabled,
    trafficFilter,
    typeFilter,
    altitudeLevel,
    selectedAircraftId,
    selectedAirportIcao,
    selectedNavaidKey,
    selectedAirspaceId,
    selectedAirspaceIds,
    closeSidebar,
    selectAircraft,
    setSelectedAircraftId,
    selectAirport,
    selectNavaid,
    selectAirspace,
    setSelectedAirspaceId,
    clearAllPreviewSelections,
    collapseSidebar,
    expandSidebar,
    setUserLocationPreferences,
    fitToTrace,
    resumeMapFollow,
    mapFollowsAircraft,
  } = useExplorerUi();
  const [wakeLockState, toggleWakeLock] = useWakeLock();
  // Both views render the same actively-recorded tracking run. They only
  // differ in viewport scope: Full trace frames origin → destination, while
  // All recorded points frames the observations captured since this tracking
  // run began. Provider history is deliberately not part of either view.
  const [traceViewMode, setTraceViewMode] = useState(TRACE_VIEW_FULL);
  const pendingTraceFitRef = useRef(false);

  const {
    run: trackingRun,
    traceHistory: trackingTraceHistory,
  } = useTrackingRun(callsign);

  const {
    aircraft: trackedAircraft,
    feedSource,
    lastUpdated,
    settled: trackedAircraftSettled,
    lostSignal,
    realtimeStatus,
    nearbyAircraft: streamedNearbyAircraft,
    nearbyAirports: streamedNearbyAirports,
    nearbyContextSettled,
    freshPositionBoundaryMs,
  } = useTrackedAircraft(callsign, {
    runStatus: trackingRun?.status,
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
  const freshTrackingTraceHistory = useMemo(
    () =>
      freshPositionBoundaryMs == null
        ? []
        : trackingTraceHistory.filter(
            (point) => Number(point.timestampMs) >= freshPositionBoundaryMs,
          ),
    [freshPositionBoundaryMs, trackingTraceHistory],
  );
  const trackedAircraftForDisplay = useMemo(() => {
    const merged = mergeTrackedFlightMetadata({
        aircraft: trackedAircraft,
        metadata: cachedTrackedMetadata,
      });
    return merged && freshTrackingTraceHistory.length > 0
      ? { ...merged, traceHistory: freshTrackingTraceHistory }
      : merged;
  }, [cachedTrackedMetadata, freshTrackingTraceHistory, trackedAircraft]);

  // Switching a view suspends follow and asks the map controller to fit the
  // corresponding geometry. Re-selecting the current view repeats the fit.
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
        id: "trace:follow",
        labelKey: "map.followAircraft",
        iconKey: "locateFixed",
        active: mapFollowsAircraft,
        onSelect: resumeMapFollow,
      },
      {
        id: "trace:full",
        labelKey: "map.fullTrace",
        iconKey: "route",
        active: !mapFollowsAircraft && traceViewMode === TRACE_VIEW_FULL,
        onSelect: () => requestTraceView(TRACE_VIEW_FULL),
      },
      {
        id: "trace:all",
        labelKey: "map.allRecordedPoints",
        iconKey: "chartScatter",
        active: !mapFollowsAircraft && traceViewMode === TRACE_VIEW_RECORDED,
        onSelect: () => requestTraceView(TRACE_VIEW_RECORDED),
      },
    ],
    [mapFollowsAircraft, requestTraceView, resumeMapFollow, traceViewMode],
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
  // `trackedAircraftForDisplay` is enriched/merged during normal renders and
  // therefore does not have stable identity. Motion only needs these primitive
  // fields; isolate them so publishing a visual position cannot restart the
  // focal motion effect and create a render loop.
  const focalMotionAircraft = useMemo(() => {
    if (trackedLat == null || trackedLon == null) return null;
    return {
      lat: trackedLat,
      lon: trackedLon,
      velocity: trackedAircraftForDisplay?.velocity,
      track: trackedAircraftForDisplay?.track,
      positionTime: trackedAircraftForDisplay?.positionTime,
      onGround: trackedAircraftForDisplay?.onGround,
    };
  }, [
    trackedLat,
    trackedLon,
    trackedAircraftForDisplay?.velocity,
    trackedAircraftForDisplay?.track,
    trackedAircraftForDisplay?.positionTime,
    trackedAircraftForDisplay?.onGround,
  ]);
  const focalMotionKey = focalMotionAircraft
    ? [
        focalMotionAircraft.lat,
        focalMotionAircraft.lon,
        focalMotionAircraft.velocity,
        focalMotionAircraft.track,
        focalMotionAircraft.positionTime,
        focalMotionAircraft.onGround ? 1 : 0,
      ].join(":")
    : "";
  useEffect(() => {
    // Clear the carried-over focal position on flight switch. Without resetting
    // lastKnownRef the new flight's focalLat would inherit the PREVIOUS flight's
    // last position (or the fallback center), so the map briefly recenters on the
    // wrong location — and hasFocalPosition reads true too early, lifting the
    // loading overlay onto that stale view. Cleared, the overlay holds until the
    // new flight's own (cached or live) position resolves.
    lastKnownRef.current = { lat: null, lon: null };
    visualFocalPositionRef.current = { lat: null, lon: null };
    focalMotionRef.current = null;
    setVisualFocalPosition({ lat: null, lon: null });
  }, [callsign]);
  useEffect(() => {
    if (!focalMotionAircraft) return;
    const now = Date.now();
    focalMotionRef.current = beginAircraftMotionState(
      focalMotionAircraft,
      now,
      focalMotionRef.current,
    );
    const nextPosition = calculateAircraftVisualPosition(
      focalMotionRef.current,
      now,
      undefined,
      FOCAL_MOTION_OPTIONS,
    );
    updateVisualFocalPosition({
      nextPosition,
      positionRef: visualFocalPositionRef,
      setPosition: setVisualFocalPosition,
      publish: true,
    });
  }, [focalMotionAircraft]);
  useEffect(() => {
    if (!focalMotionRef.current) return undefined;
    let lastPublishedAt = 0;
    return subscribeAircraftMotionFrame((now) => {
      const motion = focalMotionRef.current;
      if (!motion) return false;
      const publish =
        lastPublishedAt === 0 ||
        now - lastPublishedAt >= FOCAL_VISUAL_POSITION_PUBLISH_MS;
      updateVisualFocalPosition({
        nextPosition: calculateAircraftVisualPosition(
          motion,
          now,
          undefined,
          FOCAL_MOTION_OPTIONS,
        ),
        positionRef: visualFocalPositionRef,
        setPosition: setVisualFocalPosition,
        publish,
      });
      if (publish) lastPublishedAt = now;
      return shouldAnimateAircraftVisualPosition(motion, now);
    });
  }, [focalMotionAircraft]);
  const visualFocalLat = toFiniteCoordinate(visualFocalPosition.lat);
  const visualFocalLon = toFiniteCoordinate(visualFocalPosition.lon);
  const initialVisualFocalPosition = useMemo(() => {
    if (!focalMotionAircraft) return null;
    const now = Date.now();
    return calculateAircraftVisualPosition(
      beginAircraftMotionState(focalMotionAircraft, now),
      now,
      undefined,
      FOCAL_MOTION_OPTIONS,
    );
  }, [focalMotionAircraft]);
  const focalLat =
    visualFocalLat ??
    toFiniteCoordinate(initialVisualFocalPosition?.lat) ??
    lastKnownRef.current.lat;
  const focalLon =
    visualFocalLon ??
    toFiniteCoordinate(initialVisualFocalPosition?.lon) ??
    lastKnownRef.current.lon;
  const focalVisualPosition = useMemo(
    () =>
      focalLat != null && focalLon != null
        ? { lat: focalLat, lon: focalLon }
        : null,
    [focalLat, focalLon],
  );
  useEffect(() => {
    if (visualFocalLat == null || visualFocalLon == null) return;
    lastKnownRef.current = { lat: visualFocalLat, lon: visualFocalLon };
  }, [visualFocalLat, visualFocalLon]);
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
  const userLocationLayer = useUserLocationLayer({
    focalLat,
    focalLon,
    mapSettingsHydrated: mapSettingsReadyForUserLocation,
    userLocationEnabled,
    setUserLocationPreferences,
    t,
  });
  const flightDisplayContext: Record<string, any> = useMemo(
    () =>
      resolveFlightTrackingDisplayContext(),
    [],
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
  const nearbyAircraft = useMemo(
    () => (showNearbyTrafficContext ? streamedNearbyAircraft : []),
    [showNearbyTrafficContext, streamedNearbyAircraft],
  );
  const nearbyAirports = useMemo(
    () => (showNearbyAirportContext ? streamedNearbyAirports : []),
    [showNearbyAirportContext, streamedNearbyAirports],
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
  const selectedAirspaces = useMemo(() => {
    const ids = selectedAirspaceIds.length
      ? selectedAirspaceIds
      : selectedAirspaceId
        ? [selectedAirspaceId]
        : [];
    const idSet = new Set(ids.map((id) => String(id || "")).filter(Boolean));
    if (idSet.size === 0) return [];
    return contextTiles.airspaces.filter((airspace) =>
      idSet.has(String(airspace?.id || "")),
    );
  }, [contextTiles.airspaces, selectedAirspaceId, selectedAirspaceIds]);
  const selectedAirspace = useMemo(
    () =>
      selectedAirspaces.find(
        (airspace) => String(airspace?.id || "") === selectedAirspaceId,
      ) ||
      selectedAirspaces[0] ||
      null,
    [selectedAirspaceId, selectedAirspaces],
  );
  useEffect(() => {
    if (!selectedAirspaceId) return;
    if (!selectedAirspace) setSelectedAirspaceId("");
  }, [selectedAirspace, selectedAirspaceId, setSelectedAirspaceId]);

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
  // The focal route is permanent page context. A selected secondary aircraft
  // may add a second lookup for its preview, but it must never evict the focal
  // route (otherwise the tracked flight's destination line disappears).
  const focusedRouteCallsign = useMemo(() => {
    if (!selectedAircraftId) return "";
    const selected = rawAircraft.find(
      (item) => getAircraftIdentity(item) === selectedAircraftId,
    );
    return normalizeCallsign(selected?.callsign);
  }, [rawAircraft, selectedAircraftId]);

  const routeAircraft = useMemo(() => {
    const routeCallsigns = resolveFlightRouteCandidateCallsigns({
      focalCallsign:
        normalizeCallsign(trackedAircraftForDisplay?.callsign) ||
        normalizeCallsign(callsign),
      selectedCallsign: focusedRouteCallsign,
    });
    return routeCallsigns.map(
      (routeCallsign) =>
        rawAircraft.find(
          (item) => normalizeCallsign(item.callsign) === routeCallsign,
        ) || { callsign: routeCallsign },
    );
  }, [
    callsign,
    focusedRouteCallsign,
    rawAircraft,
    trackedAircraftForDisplay?.callsign,
  ]);

  const {
    routesByCallsign,
    routeStatusByCallsign,
    loadingCount: routeLoadingCount,
  } = useFlightRoutes(routeAircraft, {
    enabled: true,
    lat: contextLat,
    lon: contextLon,
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
          flightRouteLookupStatus: key ? routeStatusByCallsign[key] : undefined,
        };
      }),
    [rawAircraft, routeStatusByCallsign, routesByCallsign],
  );

  const focalKey = trackedAircraftForDisplay
    ? getAircraftIdentity(trackedAircraftForDisplay)
    : "";
  const focalCallsignKey = String(
    trackedAircraftForDisplay?.callsign || callsign || "",
  ).trim();
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
  // resolved for the focal callsign.
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
    missingCodes.forEach((code) => {
      fetch(`/api/airport/${encodeURIComponent(code)}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) return null;
          const payload = await response.json();
          return payload?.airport || null;
        })
        .catch(() => null)
        .then((airport) => {
          if (controller.signal.aborted) return;
          setRouteAirportDetailsByCode((current) =>
            current[code] === undefined
              ? { ...current, [code]: airport }
              : current,
          );
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

  const selectedAirportFromLiveContext = useMemo(
    () =>
      sidebarNearbyAirports.find(
        (airport) => airport?.icao === selectedAirportIcao,
      ) || null,
    [sidebarNearbyAirports, selectedAirportIcao],
  );
  // The callsign stream clears its airport context while it crosses into the
  // next 0.01° grid cell, then fills it asynchronously. Keep a selected
  // airport preview anchored to its last complete record through that handoff;
  // an explicit dismiss or a different ICAO still removes it immediately.
  const [selectedAirportSnapshot, setSelectedAirportSnapshot] = useState<Record<string, any> | null>(null);
  useEffect(() => {
    if (!selectedAirportIcao) {
      setSelectedAirportSnapshot(null);
      return;
    }
    if (selectedAirportFromLiveContext) {
      setSelectedAirportSnapshot(selectedAirportFromLiveContext);
    }
  }, [selectedAirportFromLiveContext, selectedAirportIcao]);
  const selectedAirport =
    selectedAirportFromLiveContext ||
    (selectedAirportSnapshot?.icao === selectedAirportIcao
      ? selectedAirportSnapshot
      : null);

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

  const remainingRoutePath = useMemo(() => {
    return resolveFocusedFlightRouteArcPath({
      focalAircraft: enrichedTrackedAircraft,
      from: { lat: focalLat, lon: focalLon },
    });
  }, [
    enrichedTrackedAircraft,
    focalLat,
    focalLon,
  ]);
  const fullRouteOriginLat = enrichedTrackedAircraft?.flightRoute?.origin?.lat;
  const fullRouteOriginLon = enrichedTrackedAircraft?.flightRoute?.origin?.lon;
  const fullRouteDestinationLat =
    enrichedTrackedAircraft?.flightRoute?.destination?.lat;
  const fullRouteDestinationLon =
    enrichedTrackedAircraft?.flightRoute?.destination?.lon;
  const fullRoutePath = useMemo(
    () =>
      resolveFocusedFlightFullRoutePath({
        focalAircraft: {
          flightRoute: {
            origin: { lat: fullRouteOriginLat, lon: fullRouteOriginLon },
            destination: {
              lat: fullRouteDestinationLat,
              lon: fullRouteDestinationLon,
            },
          },
        },
      }),
    [
      fullRouteDestinationLat,
      fullRouteDestinationLon,
      fullRouteOriginLat,
      fullRouteOriginLon,
    ],
  );
  const fullRouteViewActive =
    !mapFollowsAircraft && traceViewMode === TRACE_VIEW_FULL;
  const traceFitRoutePath =
    traceViewMode === TRACE_VIEW_FULL ? fullRoutePath : [];

  const handleBack = () => navigate("/");

  // Single source of truth for what the flight map shows:
  //  - "loading"  → covering loading animation (key data not ready)
  //  - "position" → reveal the map centered on the aircraft
  //  - "terminal" → covering static card (no live position; never spinner / LAX)
  const hasFocalPosition = focalLat != null && focalLon != null;
  // Bound the initial wait so a callsign with no live position resolves to the
  // terminal card instead of an endless spinner.
  const [loadingGraceExpired, setLoadingGraceExpired] = useState(false);
  useEffect(() => {
    if (hasFocalPosition) {
      setLoadingGraceExpired(false);
      return undefined;
    }
    setLoadingGraceExpired(false);
    const timer = window.setTimeout(
      () => setLoadingGraceExpired(true),
      FLIGHT_NO_POSITION_GRACE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [callsign, hasFocalPosition]);
  const flightLifecycle = resolveFlightFocalLifecycle({
    hasActiveFlight: Boolean(callsign),
    resolved: trackedAircraftSettled || loadingGraceExpired,
    hasFocalPosition,
  });
  const flightTrackingLoadingActive = flightLifecycle === "loading";
  const flightTerminalReason =
    flightLifecycle === "terminal"
      ? resolveFlightTerminalReason({
          lostSignal,
        })
      : "";
  useEffect(() => {
    logFlightMapLifecycle({
      callsign,
      lifecycle: flightLifecycle,
      focalLat,
      focalLon,
      settled: trackedAircraftSettled,
      lostSignal,
    });
  }, [
    callsign,
    flightLifecycle,
    focalLat,
    focalLon,
    trackedAircraftSettled,
    lostSignal,
  ]);
  const loadingOverlaySources = {
    trackedAircraftLoading: flightTrackingLoadingActive,
    trafficLoading:
      showNearbyTrafficContext &&
      !nearbyContextSettled,
    nearbyAirportsLoading:
      showNearbyAirportContext &&
      !nearbyContextSettled,
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
    onboardMode,
  });
  const sourceLoadingStatus = sourceLoadingState.active
    ? sourceLoadingCopy.status
    : "";
  const journeyProgress = useMemo(
    () =>
      onboardMode
        ? resolveFlightJourneyProgress({
            route: enrichedTrackedAircraft?.flightRoute,
            aircraft: enrichedTrackedAircraft,
          })
        : null,
    [enrichedTrackedAircraft, onboardMode],
  );
  const toolbarContextProps = {
    traceViewItems,
    wakeLockState,
    onToggleWakeLock: toggleWakeLock,
    zoomDisabled: flightDisplayContext.zoomDisabled,
    userLocationActive: userLocationLayer.userLocationActive,
    userLocationPending: userLocationLayer.userLocationPending,
    userLocationNotice: userLocationLayer.userLocationNotice,
    userLocationPositionReady: userLocationLayer.userLocationPositionReady,
    userLocationCompassHeadingDeg: userLocationLayer.userLocationCompassHeadingDeg,
    onRequestUserLocationPermission: () => userLocationLayer.requestUserLocation({ requestCompassPermission: true }),
    onToggleUserLocation: userLocationLayer.toggleUserLocation,
  };
  const mobileSidebarToolbar = (
    <ExplorerMapMenu
      surface="sidebar"
      onMap={closeSidebar}
      {...toolbarContextProps}
    />
  );
  const mapShellStyle =
    clientDeviceLayout.safeAreaCssVariables as CSSProperties | undefined;

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
    onboardMode,
    journeyProgress,
    trackingRunStatus: trackingRun?.status || "",
    onBack: handleBack,
    onMap: closeSidebar,
    mobileToolbar: mobileSidebarToolbar,
    collapsed: sidebarCollapsed,
    collapseEnabled: !isMobile,
    onCollapse: collapseSidebar,
    onExpand: expandSidebar,
    fillAircraftList: true,
    loading: flightTrackingLoadingActive || mapMainContentLoading,
  };

  return (
    <SelectedAircraftTraceProvider
      selectedAircraft={selectedAircraft}
      focalAircraft={enrichedTrackedAircraft}
      showSelectedTrace={showNearbyMapContext}
      focalFullTrace
      focalClipToLeg
      focalVisualPosition={focalVisualPosition}
    >
      <AircraftPreviewCard
        aircraft={selectedAircraft}
        airport={selectedAirport}
        navaid={selectedNavaid}
        airspace={selectedAirspace}
        airspaces={selectedAirspaces}
        selectedAirspaceId={selectedAirspaceId}
        onSelectAirspace={setSelectedAirspaceId}
        isMobile={isMobile}
        sidebarOpen={sidebarOpen && !sidebarCollapsed}
        onDismiss={clearAllPreviewSelections}
        clientDeviceProfile={clientDeviceProfile}
        preferMobilePreview={clientDeviceLayout.useDesktopMobileLandscapeLayout}
        safeAreaInsets={clientDeviceLayout.safeAreaInsets}
      />
      <div
        data-client-orientation={clientDeviceLayout.orientation}
        data-client-mobile-device={
          clientDeviceLayout.isMobileDevice ? "true" : "false"
        }
        data-client-horizontal-obstruction={
          clientDeviceLayout.hasHorizontalViewportObstruction ? "true" : "false"
        }
        style={mapShellStyle}
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
            data-collapsed={sidebarCollapsed ? "true" : undefined}
            style={{
              width: sidebarOpen
                ? sidebarCollapsed
                  ? "max-content"
                  : desktopSidebarWidth
                : "0",
            }}
          >
            <div
              className="app-panel-transition h-full"
              style={{
                width: sidebarCollapsed
                  ? "max-content"
                  : desktopSidebarWidth,
              }}
            >
              <FlightSidebar {...sidebarProps} />
            </div>
          </div>
        )}

        <div className="airport-map-stage relative min-w-0 flex-1 overflow-hidden bg-atc-bg">
          {!(isMobile && sidebarOpen) && (
            <ExplorerMapMenu
              feedSource={feedSource}
              feedStatus="live"
              lastUpdated={lastUpdated}
              loadingStatus={sourceLoadingStatus}
              realtimeStatus={realtimeStatus}
              {...toolbarContextProps}
            />
          )}
          {mapSettingsReadyForUserLocation ? (
            <Suspense fallback={<MapLoadingFallback variant="flight" />}>
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
              showAirspaces={mapSettingsToExplorerLayers(mapSettings).showAirspaces}
              baseLayer={mapSettings?.baseLayer}
              trafficFilter={trafficFilter}
              typeFilter={typeFilter}
              altitudeLevel={altitudeLevel}
              selectedAircraftId={selectedAircraftId}
              selectedAirportIcao={selectedAirportIcao}
              selectedNavaidKey={selectedNavaidKey}
              selectedAirspaceId={selectedAirspaceId}
              focalAircraftId={focalKey}
              focalVisualPosition={focalVisualPosition}
              focalVisualPositionRef={visualFocalPositionRef}
              focalMotionRef={focalMotionRef}
              focalMotionKey={focalMotionKey}
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
              loadingOverlayOnboardMode={onboardMode}
              loadingOverlaySources={loadingOverlaySources}
              flightTerminalReason={flightTerminalReason}
              userLocation={userLocationLayer.userLocation}
              onMainContentLoadingChange={setMapMainContentLoading}
              mapInteractionMode={AirportMapInteractionMode.FlightTracking}
              >
              <FlightRouteArc
                path={remainingRoutePath}
                destination={enrichedTrackedAircraft?.flightRoute?.destination}
                followPositionRef={visualFocalPositionRef}
                motionRef={focalMotionRef}
              />
              <MapFitToTraceController
                routePath={traceFitRoutePath}
                fitTraceAircraftId={focalKey}
                allowRouteOnly={traceViewMode === TRACE_VIEW_FULL}
                keepRouteInView={fullRouteViewActive}
                fallbackAnchor={{ lat: focalLat, lon: focalLon }}
                centerAnchor={null}
                centerAnchorFollowKey=""
                autoFitKey=""
                fitOptions={flightDisplayContext.mapFitOptions}
                onAutoFit={undefined}
              />
              </AirportMap>
            </Suspense>
          ) : (
            <MapLoadingFallback variant="flight" />
          )}

          {isMobile && sidebarOpen && (
            <div className="sidebar-layout-overlay absolute inset-0 z-map-panel overscroll-none overflow-y-auto">
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

function updateVisualFocalPosition({
  nextPosition,
  positionRef,
  setPosition,
  publish = false,
}) {
  const nextLat = toFiniteCoordinate(nextPosition?.lat);
  const nextLon = toFiniteCoordinate(nextPosition?.lon);
  if (nextLat == null || nextLon == null) return;
  const next = { lat: nextLat, lon: nextLon };
  if (positionsNear(positionRef.current, next)) return;
  positionRef.current = next;
  if (publish) setPosition(next);
}
