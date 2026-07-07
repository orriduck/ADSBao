import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties } from "react";
import AirportSidebar from "@/components/sidebar/AirportSidebar";
import AirportExplorerDesktopSidebar from "./AirportExplorerDesktopSidebar";
import CandidateWatchingSpotNavigationModal from "./CandidateWatchingSpotNavigationModal";
import {
  MapLoadingFallback,
  useMapLoadingOverlayText,
} from "@/components/map/MapLoadingOverlay";
import {
  ExplorerUiProvider,
  useExplorerUi,
} from "@/components/explorer/ExplorerUiContext";
import ExplorerMapMenu from "@/components/explorer/ExplorerMapMenu";
import {
  resolveAirportExplorerSelection,
  resolveAirportProfile,
} from "@/features/airport/explorer/airportExplorerModel";
import { useAirportExplorerData } from "@/features/airport/explorer/useAirportExplorerData";
import { useNearbyAirports } from "@/hooks/useNearbyAirports";
import { SelectedAircraftTraceProvider } from "../../aircraft/trace/SelectedAircraftTraceContext";
import {
  areCriticalLoadingRequestsSettled,
  resolveAircraftLoadingOverlayState,
} from "@/features/aircraft/positions/aircraftLoadingOverlayModel";
import {
  buildUserLocationVisualTraffic,
  getUserLocationVisualTrafficStatusAnimationKey,
  getUserLocationVisualTrafficStatusLineKey,
  type UserLocationVisualTrafficItem,
} from "@/features/airport/map/userLocationVisualTrafficModel";
import { useUserLocationLayer } from "@/hooks/useUserLocationLayer";
import { useCandidateWatchingSpots } from "@/features/airport/watcher/useCandidateWatchingSpots";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useNotificationPreferences } from "@/features/notifications/NotificationPreferencesProvider";
import { useNotificationPermission } from "@/features/notifications/useNotificationPermission";
import { useAirportProximityNotifier } from "@/features/notifications/useAirportProximityNotifier";
import { useAircraftProximityNotifier } from "@/features/notifications/useAircraftProximityNotifier";
import {
  resolveAmbientChromeEdgeColor,
  resolveAmbientChromeSurfaceTint,
  resolveWeatherMood,
} from "@/features/aircraft/canvas/aircraftAmbientModel";
import { useSimplifiedLightBearing } from "@/hooks/useSimplifiedLightBearing";
import { resolveDocumentTheme } from "@/features/airport/map/airportMapModel";

const AirportMap = lazy(() => import("@/components/map/AirportMap"));
const AircraftPreviewCard = lazy(() => import("../../aircraft/preview/AircraftPreviewCard"));

export default function AirportExplorer(props) {
  return (
    <ExplorerUiProvider>
      <AirportExplorerContent {...props} />
    </ExplorerUiProvider>
  );
}

function formatUserLocationVisualTrafficStatusLine(
  item: UserLocationVisualTrafficItem,
  t: (key: string, params?: Record<string, unknown>) => string,
) {
  return t("map.visualTrafficLine", {
    callsign: item.callsign || t("map.visualTrafficUnknown"),
    distance: formatVisualTrafficDistanceNm(item.distanceNm),
    direction: formatVisualTrafficDirection(item, t),
  });
}

function formatVisualTrafficDistanceNm(distanceNm: number) {
  if (!Number.isFinite(distanceNm)) return "-";
  if (distanceNm < 1) return "<1";
  return String(Math.round(distanceNm));
}

function formatVisualTrafficDirection(
  item: UserLocationVisualTrafficItem,
  t: (key: string, params?: Record<string, unknown>) => string,
) {
  const clock = item.clockHour || 12;
  const degrees = Math.round(item.relativeDegrees || 0);

  switch (item.relativeSide) {
    case "ahead":
      return t("map.visualTrafficAhead", { clock });
    case "behind":
      return t("map.visualTrafficBehind", { clock });
    case "left":
      return t("map.visualTrafficLeft", { clock, degrees });
    case "right":
      return t("map.visualTrafficRight", { clock, degrees });
    default:
      return t("map.visualTrafficBearing", {
        bearing: String(Math.round(item.bearingDeg)).padStart(3, "0"),
      });
  }
}

function normalizeNearMeLocation(location) {
  const lat = Number(location?.lat);
  const lon = Number(location?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const accuracyMeters = Number(location?.accuracyMeters);
  const headingDeg = Number(location?.headingDeg);
  const speedMps = Number(location?.speedMps);
  const altitudeMeters = Number(location?.altitudeMeters);
  return {
    lat,
    lon,
    accuracyMeters: Number.isFinite(accuracyMeters) ? accuracyMeters : null,
    headingDeg:
      Number.isFinite(headingDeg) && headingDeg >= 0
        ? ((headingDeg % 360) + 360) % 360
        : null,
    speedMps: Number.isFinite(speedMps) && speedMps >= 0 ? speedMps : null,
    altitudeMeters: Number.isFinite(altitudeMeters) ? altitudeMeters : null,
    updatedAt: Number(location?.updatedAt) || Date.now(),
  };
}

function AirportExplorerContent({
  icao = "",
  airport = null,
  onBack,
  // "airport" (default) = standard airport detail view with full
  // metric cards, candidate watching spots, ATC, etc.
  // "nearMe" = user-location centered view: metric cards collapse to
  // weather + nearby traffic, airport-specific surfaces are skipped,
  // candidate-spots / ATC fetches are skipped, METAR temp comes from
  // the closest nearby airport, sidebar identity reads "Your location".
  mode = "airport",
  nearMeUserLocation = null,
  nearMeSidebarLocation = null,
  nearMeRefresh,
}) {
  const nearMe = mode === "nearMe";
  // Airport → airport navigation does a HARD reload to the new URL (same policy
  // as flight → flight): a reused map across an airport switch can get stuck not
  // reloading tiles, so a clean mount per page is simpler and stable. Only the
  // standard airport-detail mode (route /airport/:icao); nearMe follows the user
  // location and must not reload as the nearest airport changes. Runs before
  // paint, covers links AND browser back/forward.
  const mountIcaoRef = useRef(icao);
  useLayoutEffect(() => {
    if (mode === "airport" && mountIcaoRef.current !== icao) {
      window.location.reload();
    }
  }, [icao, mode]);
  const { t } = useI18n();
  const {
    desktopSidebarWidth,
    clientDeviceProfile,
    clientDeviceLayout,
    sidebarOpen,
    sidebarCollapsed,
    isMobile,
    mapZoom,
    showMapLabels,
    showRunwayBeams,
    showNavaidMarkers,
    showReportingPoints,
    showAirspaces,
    showCandidateWatchingSpots,
    showCallsigns,
    mapSettings,
    mapSettingsReadyForUserLocation,
    userLocationEnabled,
    trafficFilter,
    typeFilter,
    altitudeLevel,
    selectedAircraftId,
    selectedAirportIcao,
    selectedNavaidKey,
    selectedReportingPointKey,
    selectedAirspaceId,
    selectedAirspaceIds,
    selectedCandidateWatchingSpotId,
    closeSidebar,
    selectAircraft,
    setSelectedAircraftId,
    selectAirport,
    selectNavaid,
    setSelectedNavaidKey,
    selectReportingPoint,
    setSelectedReportingPointKey,
    selectAirspace,
    setSelectedAirspaceId,
    setSelectedCandidateWatchingSpotId,
    clearAllPreviewSelections,
    collapseSidebar,
    expandSidebar,
    mapFollowsAircraft,
    setUserLocationPreferences,
  } = useExplorerUi();
  const [nearMeUserLocationHidden, setNearMeUserLocationHidden] = useState(false);
  const [wakeLockState, toggleWakeLock] = useWakeLock();
  const [navigationSpotId, setNavigationSpotId] = useState("");
  const airportProfile = useMemo(
    () => resolveAirportProfile({ icao, airport }),
    [icao, airport],
  );
  const userLocationLayer = useUserLocationLayer({
    enabled: !nearMe,
    focalLat: airportProfile.lat,
    focalLon: airportProfile.lon,
    mapSettingsHydrated: mapSettingsReadyForUserLocation,
    userLocationEnabled,
    setUserLocationPreferences,
    t,
  });
  const nearMeMapUserLocation = useMemo(() => {
    if (!nearMe || nearMeUserLocationHidden) return null;
    return normalizeNearMeLocation(nearMeUserLocation);
  }, [nearMe, nearMeUserLocation, nearMeUserLocationHidden]);
  const nearMeSidebarUserLocation = useMemo(() => {
    if (!nearMe) return null;
    return normalizeNearMeLocation(nearMeSidebarLocation) || nearMeMapUserLocation;
  }, [nearMe, nearMeMapUserLocation, nearMeSidebarLocation]);
  // The here-mode speed/altitude readout follows the user's own motion, so it
  // reads from the live position (not the distance-thresholded sidebar one) and
  // survives hiding the map marker.
  const nearMeSelfLocation = useMemo(
    () => (nearMe ? normalizeNearMeLocation(nearMeUserLocation) : null),
    [nearMe, nearMeUserLocation],
  );
  const nearbyAirportsFocus = nearMeSidebarUserLocation || airportProfile;
  // Nearby-airports list runs first in near-me mode so we can borrow
  // the closest airport's ICAO for the METAR temperature fetch — the
  // current location otherwise has no METAR station of its own.
  const nearbyAirports = useNearbyAirports({
    icao: airportProfile.icao,
    lat: nearbyAirportsFocus.lat,
    lon: nearbyAirportsFocus.lon,
  });
  const metarIcao = nearMe
    ? nearbyAirports.airports?.[0]?.icao || ""
    : airportProfile.icao;
  const { weather, traffic } = useAirportExplorerData(airportProfile, {
    metarIcao,
    selectedAircraftId,
  });
  // Proximity alerts: airport alert is here-mode only and fires once per
  // enabled session; aircraft alert runs in every mode (here + airport
  // detail) and re-fires per aircraft on each new approach. Both stay fully
  // inert unless the user both opted in AND already granted the browser
  // Notification permission — no permission-request side effect lives here.
  const { preferences: notificationPreferences } = useNotificationPreferences();
  const { permission: notificationPermission } = useNotificationPermission();
  const notificationsGranted = notificationPermission === "granted";
  useAirportProximityNotifier({
    enabled:
      nearMe &&
      notificationsGranted &&
      notificationPreferences.nearbyAirportEnabled,
    airports: nearbyAirports.airports,
    radiusNm: notificationPreferences.nearbyAirportRadiusNm,
  });
  useAircraftProximityNotifier({
    enabled: notificationsGranted && notificationPreferences.nearbyAircraftEnabled,
    aircraft: traffic.aircraft,
    radiusNm: notificationPreferences.nearbyAircraftRadiusNm,
  });
  // Ambient map ambiance: aircraft glyphs combine a weather-driven "mood"
  // (clear/overcast/severe, from the flight-rules category already fetched
  // above; sets chroma/lightness) with a time-of-day colour temperature
  // (dawn/day/dusk/night; sets hue) plus a simplified light-direction shading
  // (see aircraftAmbientModel.ts — none of this is a real day/night terminator).
  const weatherMood = useMemo(
    () => resolveWeatherMood(weather.metar?.flightCategory),
    [weather.metar],
  );
  const { lightBearingDeg, timeOfDay } = useSimplifiedLightBearing(
    airportProfile.lon,
  );
  // Chrome edge glow: lets the floating toolbar's existing map-kit halo
  // (Toolbar.tsx) and the sidebar's map-facing border pick up a hint of the
  // same weather/time ambiance, without tinting either surface's own
  // background or content — see resolveAmbientChromeEdgeColor's comment.
  const [currentTheme, setCurrentTheme] = useState(() =>
    typeof document !== "undefined"
      ? resolveDocumentTheme(document.documentElement)
      : "dark",
  );
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const next = resolveDocumentTheme(document.documentElement);
      setCurrentTheme((current) => (current === next ? current : next));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);
  // "Ambient colour" map setting: "theme" opts the WHOLE ambient system out
  // (map wash, aircraft weather/time tint + light-mask colour, sidebar edge
  // glow + surface tint, floating toolbar edge glow + surface tint) back to
  // the plain pre-ambient look, so the map is never left in an inconsistent
  // half-tinted state.
  const ambientEnabled = mapSettings?.ambientMode !== "theme";
  const ambientChromeEdgeColor = useMemo(
    () =>
      ambientEnabled
        ? resolveAmbientChromeEdgeColor(weatherMood, timeOfDay, currentTheme !== "light")
        : null,
    [ambientEnabled, weatherMood, timeOfDay, currentTheme],
  );
  const ambientChromeSurfaceTint = useMemo(
    () =>
      ambientEnabled
        ? resolveAmbientChromeSurfaceTint(weatherMood, timeOfDay, currentTheme !== "light")
        : null,
    [ambientEnabled, weatherMood, timeOfDay, currentTheme],
  );
  const effectiveUserLocation =
    (nearMe ? null : userLocationLayer.userLocation) || nearMeMapUserLocation;
  const userLocationActive = Boolean(effectiveUserLocation);
  const userLocationVisualTraffic = useMemo(
    () =>
      buildUserLocationVisualTraffic({
        userLocation: effectiveUserLocation,
        aircraft: traffic.aircraft,
      }),
    [effectiveUserLocation, traffic.aircraft],
  );
  const userLocationStatusLines = useMemo(
    () =>
      userLocationVisualTraffic.map((item) => ({
        key: getUserLocationVisualTrafficStatusLineKey(item),
        animationKey: getUserLocationVisualTrafficStatusAnimationKey(item),
        line: formatUserLocationVisualTrafficStatusLine(item, t),
      })),
    [t, userLocationVisualTraffic],
  );
  const candidateWatchingSpots = useCandidateWatchingSpots({
    airportIcao: airportProfile.icao,
    enabled: Boolean(airportProfile.icao),
    spots: airport?.spotterLocations || [],
  });
  const navigationSpot = useMemo(
    () =>
      navigationSpotId
        ? candidateWatchingSpots.spots.find(
            (spot) => String(spot?.id || "") === navigationSpotId,
          ) || null
        : null,
    [candidateWatchingSpots.spots, navigationSpotId],
  );
  const selection = useMemo(
    () =>
      resolveAirportExplorerSelection({
        aircraft: traffic.aircraft,
        selectedAircraftId,
        airports: nearbyAirports.airports,
        selectedAirportIcao,
        navaids: airport?.nearbyNavaids || [],
        selectedNavaidKey,
        reportingPoints: airport?.reportingPoints || [],
        selectedReportingPointKey,
        airspaces: airport?.airspaces || [],
        selectedAirspaceId,
        selectedAirspaceIds,
        candidateWatchingSpots: candidateWatchingSpots.spots,
        selectedCandidateWatchingSpotId,
      }),
    [
      airport?.airspaces,
      airport?.nearbyNavaids,
      airport?.reportingPoints,
      candidateWatchingSpots.spots,
      nearbyAirports.airports,
      selectedAircraftId,
      selectedAirportIcao,
      selectedNavaidKey,
      selectedReportingPointKey,
      selectedAirspaceId,
      selectedAirspaceIds,
      selectedCandidateWatchingSpotId,
      traffic.aircraft,
    ],
  );

  useEffect(() => {
    if (!selectedAircraftId) return;
    if (!selection.selectedAircraftStillVisible) setSelectedAircraftId("");
  }, [
    selectedAircraftId,
    selection.selectedAircraftStillVisible,
    setSelectedAircraftId,
  ]);

  useEffect(() => {
    if (!selectedNavaidKey) return;
    if (!selection.selectedNavaidStillVisible) setSelectedNavaidKey("");
  }, [
    selectedNavaidKey,
    selection.selectedNavaidStillVisible,
    setSelectedNavaidKey,
  ]);

  useEffect(() => {
    if (!selectedReportingPointKey) return;
    if (!selection.selectedReportingPointStillVisible) {
      setSelectedReportingPointKey("");
    }
  }, [
    selectedReportingPointKey,
    selection.selectedReportingPointStillVisible,
    setSelectedReportingPointKey,
  ]);

  useEffect(() => {
    if (!selectedAirspaceId) return;
    if (!selection.selectedAirspaceStillVisible) setSelectedAirspaceId("");
  }, [
    selectedAirspaceId,
    selection.selectedAirspaceStillVisible,
    setSelectedAirspaceId,
  ]);

  useEffect(() => {
    if (!selectedCandidateWatchingSpotId) return;
    if (!selection.selectedCandidateWatchingSpotStillVisible) {
      setSelectedCandidateWatchingSpotId("");
    }
  }, [
    selectedCandidateWatchingSpotId,
    selection.selectedCandidateWatchingSpotStillVisible,
    setSelectedCandidateWatchingSpotId,
  ]);

  useEffect(() => {
    if (navigationSpotId && !navigationSpot) setNavigationSpotId("");
  }, [navigationSpot, navigationSpotId]);

  const toggleUserLocation = useCallback(() => {
    if (nearMe && nearMeMapUserLocation && !userLocationLayer.userLocation) {
      setNearMeUserLocationHidden(true);
      return;
    }

    if (nearMe && nearMeUserLocationHidden && !userLocationLayer.userLocation) {
      setNearMeUserLocationHidden(false);
      return;
    }

    if (nearMe) return;

    userLocationLayer.toggleUserLocation();
  }, [
    nearMe,
    nearMeMapUserLocation,
    nearMeUserLocationHidden,
    userLocationLayer,
  ]);

  const openSpottingDetail = useCallback((_activeView = "") => {
    // No-op: preset modes have been removed; layers are toggled independently
  }, []);

  const handleSelectCandidateWatchingSpot = useCallback((spotId) => {
    const nextSpotId = String(spotId || "").trim();
    if (!nextSpotId) return;
    setSelectedCandidateWatchingSpotId(nextSpotId);
  }, [setSelectedCandidateWatchingSpotId]);

  const handleOpenCandidateWatchingSpotNavigation = useCallback(() => {
    const nextSpotId = String(
      selection.selectedCandidateWatchingSpot?.id || "",
    ).trim();
    if (!nextSpotId) return;
    setNavigationSpotId(nextSpotId);
  }, [selection.selectedCandidateWatchingSpot]);

  const handleClearPreviewSelections = useCallback(() => {
    setNavigationSpotId("");
    clearAllPreviewSelections();
  }, [clearAllPreviewSelections]);

  const criticalLoadingSettled = areCriticalLoadingRequestsSettled({
    aircraftPositionsSettled: traffic.aircraftPositionsSettled,
    metarSettled: weather.metarSettled,
    nearbyAirportsSettled: nearbyAirports.settled,
  });
  const loadingOverlayActive =
    !criticalLoadingSettled || traffic.aircraftLoadingOverlayActive;
  const loadingOverlaySources = {
    trafficLoading:
      traffic.aircraftLoadingOverlayActive || !traffic.aircraftPositionsSettled,
    weatherLoading: weather.metarLoading || !weather.metarSettled,
    nearbyAirportsLoading: nearbyAirports.loading || !nearbyAirports.settled,
    routeLoadingCount: traffic.routeLoadingCount,
  };
  const sourceLoadingState = resolveAircraftLoadingOverlayState({
    mapReady: true,
    variant: "airport",
    feedLoading: false,
    ...loadingOverlaySources,
  });
  const sourceLoadingCopy = useMapLoadingOverlayText({
    mode: sourceLoadingState.mode,
    reason: sourceLoadingState.reason,
    variant: "airport",
  });
  const sourceLoadingStatus = sourceLoadingState.active
    ? sourceLoadingCopy.status
    : "";
  const previewSelectionActive = Boolean(
    selection.selectedAircraft ||
      selection.selectedAirport ||
      selection.selectedNavaid ||
      selection.selectedReportingPoint ||
      selection.selectedAirspace ||
      selection.selectedAirspaces?.length ||
      selection.selectedCandidateWatchingSpot,
  );
  const toolbarContextProps = {
    wakeLockState,
    onToggleWakeLock: toggleWakeLock,
    userLocationActive: nearMe
      ? userLocationActive
      : userLocationLayer.userLocationActive,
    userLocationPending: nearMe ? false : userLocationLayer.userLocationPending,
    userLocationNotice: nearMe ? "" : userLocationLayer.userLocationNotice,
    userLocationPermissionDenied: nearMe
      ? false
      : userLocationLayer.userLocationPermissionDenied,
    userLocationPositionReady: nearMe ? false : userLocationLayer.userLocationPositionReady,
    userLocationCompassHeadingDeg: nearMe ? null : userLocationLayer.userLocationCompassHeadingDeg,
    onRequestUserLocationPermission: nearMe
      ? null
      : () => userLocationLayer.requestUserLocation({ requestCompassPermission: true }),
    onToggleUserLocation: toggleUserLocation,
  };
  const sidebarFocusLat = nearMe
    ? nearMeSidebarUserLocation?.lat ?? airportProfile.lat
    : airportProfile.lat;
  const sidebarFocusLon = nearMe
    ? nearMeSidebarUserLocation?.lon ?? airportProfile.lon
    : airportProfile.lon;
  const mobileSidebarToolbar = (
    <ExplorerMapMenu
      surface="sidebar"
      onMap={closeSidebar}
      {...toolbarContextProps}
    />
  );
  const mapShellStyle = {
    ...(clientDeviceLayout.safeAreaCssVariables as CSSProperties | undefined),
    // Overrides Toolbar.tsx's map-kit halo token (and feeds the matching
    // sidebar edge glow) and blends a tint into the toolbar/sidebar surface
    // itself (Toolbar.tsx / SidebarShell.tsx) with the current weather/time
    // ambiance — scoped selectors mean this is a no-op anywhere else in the
    // app. Left unset entirely when the "Sidebar & toolbar colour" setting
    // is "theme", so both fall back to their plain pre-ambient CSS values.
    ...(ambientChromeEdgeColor
      ? { "--app-floating-edge-shadow": ambientChromeEdgeColor }
      : {}),
    ...(ambientChromeSurfaceTint
      ? { "--app-ambient-chrome-tint": ambientChromeSurfaceTint }
      : {}),
  } as CSSProperties;
  const sidebarProps = {
    icao: airportProfile.icao,
    iata: airportProfile.iata,
    name: airportProfile.name,
    localizedName: airportProfile.localizedName,
    city: airportProfile.city,
    country: airportProfile.country,
    lat: airportProfile.lat,
    lon: airportProfile.lon,
    placeLat: nearMe ? sidebarFocusLat : undefined,
    placeLon: nearMe ? sidebarFocusLon : undefined,
    elevationFt: airportProfile.elevationFt,
    metar: weather.metar,
    metarRaw: weather.metarRaw,
    metarLoading: weather.metarLoading,
    metarError: weather.metarError,
    metarStatusCode: weather.metarStatusCode ?? null,
    aircraft: traffic.aircraft,
    airports: nearbyAirports.airports,
    // In near-me mode there's no airport identity, so airport-specific
    // frequencies stay empty and the metric grid only shows weather + nearby.
    frequencies: nearMe ? [] : airport?.frequencies || [],
    candidateWatchingSpots: candidateWatchingSpots.spots,
    focusLat: sidebarFocusLat,
    focusLon: sidebarFocusLon,
    selectedAircraftId,
    selectedAirportIcao,
    selectedCandidateWatchingSpotId,
    lastUpdated: traffic.lastUpdated,
    feedStatus: traffic.feedStatus,
    feedSource: traffic.feedSource,
    routeProvider: traffic.routeProvider,
    flightAwareResolved: traffic.flightAwareResolved,
    loadingStatus: sourceLoadingStatus,
    nearMe,
    nearMeSelfSpeedMps: nearMe ? nearMeSelfLocation?.speedMps ?? null : null,
    nearMeSelfAltitudeMeters: nearMe
      ? nearMeSelfLocation?.altitudeMeters ?? null
      : null,
    nearMeSelfHeadingDeg: nearMe ? nearMeSelfLocation?.headingDeg ?? null : null,
    nearMeRefresh,
    onSelectAircraft: selectAircraft,
    onSelectAirport: selectAirport,
    onSelectCandidateWatchingSpot: handleSelectCandidateWatchingSpot,
    onOpenSpotting: openSpottingDetail,
    onBack,
    onMap: closeSidebar,
    mobileToolbar: mobileSidebarToolbar,
    collapsed: sidebarCollapsed,
    collapseEnabled: !isMobile,
    onCollapse: collapseSidebar,
    onExpand: expandSidebar,
    fillAircraftList: true,
  };

  return (
    <SelectedAircraftTraceProvider
      selectedAircraft={selection.selectedAircraft}
      showSelectedTrace
    >
      {previewSelectionActive && (
        <Suspense fallback={null}>
          <AircraftPreviewCard
            aircraft={selection.selectedAircraft}
            airport={selection.selectedAirport}
            navaid={selection.selectedNavaid}
            reportingPoint={selection.selectedReportingPoint}
            airspace={selection.selectedAirspace}
            airspaces={selection.selectedAirspaces}
            selectedAirspaceId={selectedAirspaceId}
            onSelectAirspace={setSelectedAirspaceId}
            candidateWatchingSpot={selection.selectedCandidateWatchingSpot}
            candidateWatchingSpotAttribution={candidateWatchingSpots.sourceAttribution}
            onOpenCandidateWatchingSpotNavigation={
              selection.selectedCandidateWatchingSpot
                ? handleOpenCandidateWatchingSpotNavigation
                : undefined
            }
            isMobile={isMobile}
            sidebarOpen={sidebarOpen && !sidebarCollapsed}
            airportProfile={airportProfile}
            onApplyTemporaryRoute={traffic.applyTemporaryRoute}
            onDismiss={handleClearPreviewSelections}
            clientDeviceProfile={clientDeviceProfile}
            preferMobilePreview={
              clientDeviceLayout.useDesktopMobileLandscapeLayout
            }
            safeAreaInsets={clientDeviceLayout.safeAreaInsets}
          />
        </Suspense>
      )}
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
          <AirportExplorerDesktopSidebar
            open={sidebarOpen}
            collapsed={sidebarCollapsed}
            width={desktopSidebarWidth}
            sidebarProps={sidebarProps}
          />
        )}

        <div
          className="airport-map-stage relative min-w-0 flex-1 overflow-hidden bg-atc-bg"
        >
          {!(isMobile && sidebarOpen) && (
            <ExplorerMapMenu
              feedSource={traffic.feedSource}
              feedStatus={traffic.feedStatus}
              lastUpdated={traffic.lastUpdated}
              routeProvider={traffic.routeProvider}
              loadingStatus={sourceLoadingStatus}
              realtimeStatus={traffic.realtimeStatus}
              userLocationStatusLines={userLocationStatusLines}
              {...toolbarContextProps}
            />
          )}

          <Suspense fallback={<MapLoadingFallback />}>
            <AirportMap
              icao={airportProfile.icao}
              lat={airportProfile.lat}
              lon={airportProfile.lon}
              airportElevationFt={airportProfile.elevationFt}
              zoom={mapZoom}
              aircraft={traffic.aircraft}
              nearbyAirports={nearbyAirports.airports}
              nearbyNavaids={airport?.nearbyNavaids || []}
              reportingPoints={airport?.reportingPoints || []}
              airspaces={airport?.airspaces || []}
              airport={airport}
              // In near-me mode the airport profile has no ICAO and so
              // no server-side airspaces / navaids attached. Flip the
              // lat/lon-keyed aviation context tile fetch on so the
              // map still shows Class B/C/D etc. polygons around the
              // user — same hook the flight explorer already uses.
              contextTileOverlays={nearMe}
              showMapLabels={showMapLabels}
              showRunwayBeams={showRunwayBeams}
              showNavaidMarkers={showNavaidMarkers}
              showReportingPoints={showReportingPoints}
              showAirspaces={showAirspaces}
              showCandidateWatchingSpots={showCandidateWatchingSpots}
              showCallsigns={showCallsigns}
              baseLayer={mapSettings?.baseLayer}
              trafficFilter={trafficFilter}
              typeFilter={typeFilter}
              altitudeLevel={altitudeLevel}
              selectedAircraftId={selectedAircraftId}
              selectedAirportIcao={selectedAirportIcao}
              selectedNavaidKey={selectedNavaidKey}
              selectedReportingPointKey={selectedReportingPointKey}
              selectedAirspaceId={selectedAirspaceId}
              selectedCandidateWatchingSpotId={selectedCandidateWatchingSpotId}
              candidateWatchingSpots={candidateWatchingSpots.spots}
              followsCenter={mapFollowsAircraft}
              floatingSidebarAware={!isMobile && sidebarOpen}
              onSelectAircraft={selectAircraft}
              onSelectAirport={selectAirport}
              onSelectNavaid={selectNavaid}
              onSelectReportingPoint={selectReportingPoint}
              onSelectAirspace={selectAirspace}
              onSelectCandidateWatchingSpot={handleSelectCandidateWatchingSpot}
              runwayMap={airport?.runwayMap}
              surfaceMap={airport?.surfaceMap}
              loadingOverlayActive={loadingOverlayActive}
              loadingOverlaySources={loadingOverlaySources}
              userLocation={effectiveUserLocation}
              weatherMood={weatherMood}
              timeOfDay={timeOfDay}
              lightBearingDeg={ambientEnabled ? lightBearingDeg : null}
              ambientEnabled={ambientEnabled}
            />
          </Suspense>

          {isMobile && sidebarOpen && (
            <div className="absolute inset-0 z-map-panel overscroll-none overflow-y-auto">
              <AirportSidebar {...sidebarProps} onClose={closeSidebar} />
            </div>
          )}
          <CandidateWatchingSpotNavigationModal
            spot={navigationSpot}
            open={Boolean(navigationSpot)}
            onOpenChange={(nextOpen) => {
              if (!nextOpen) setNavigationSpotId("");
            }}
          />
        </div>
      </div>
    </SelectedAircraftTraceProvider>
  );
}
