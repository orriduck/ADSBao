"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AirportSidebar from "@/components/sidebar/AirportSidebar";
import AirportExplorerDesktopSidebar from "./AirportExplorerDesktopSidebar";
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
import { resolveSpottingMetricZoomState } from "@/features/airport/explorer/airportExplorerUiModel";
import { useAirportExplorerData } from "@/features/airport/explorer/useAirportExplorerData";
import { useNearbyAirports } from "@/hooks/useNearbyAirports";
import { SelectedAircraftTraceProvider } from "../../aircraft/trace/SelectedAircraftTraceContext";
import AircraftPreviewCard from "../../aircraft/preview/AircraftPreviewCard";
import {
  areCriticalLoadingRequestsSettled,
  resolveAircraftLoadingOverlayState,
} from "@/features/aircraft/positions/aircraftLoadingOverlayModel";
import {
  resolveUserLocationWatchUpdate,
  USER_LOCATION_AUDIO_MODES,
  type UserLocationAudioMode,
} from "@/features/airport/map/userLocationModel";
import { useCandidateWatchingSpots } from "@/features/airport/watcher/useCandidateWatchingSpots";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useUserLocationAircraftAudio } from "@/hooks/useUserLocationAircraftAudio";
import { MAP_MODE_IDS } from "@/features/airport/map-settings/mapSettingsModel";
import { ZOOM_APPROACH, ZOOM_DETAIL } from "@/utils/airportMapDisplay";

const AirportMap = dynamic(() => import("@/components/map/AirportMap"), {
  ssr: false,
  loading: () => <MapLoadingFallback />,
});

export default function AirportExplorer(props) {
  return (
    <ExplorerUiProvider>
      <AirportExplorerContent {...props} />
    </ExplorerUiProvider>
  );
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
  nearMeRefresh,
}) {
  const nearMe = mode === "nearMe";
  const { t } = useI18n();
  const {
    desktopSidebarWidth,
    sidebarOpen,
    isMobile,
    mapZoom,
    showMapLabels,
    showRunwayBeams,
    showNavaidMarkers,
    showAirspaces,
    showCandidateWatchingSpots,
    showCallsigns,
    mapSettings,
    userLocationEnabled,
    userLocationAudioEnabled,
    trafficFilter,
    typeFilter,
    altitudeLevel,
    selectedAircraftId,
    selectedAirportIcao,
    selectedNavaidKey,
    selectedAirspaceId,
    selectedCandidateWatchingSpotId,
    closeSidebar,
    selectAircraft,
    setSelectedAircraftId,
    selectAirport,
    selectNavaid,
    setSelectedNavaidKey,
    selectAirspace,
    setSelectedAirspaceId,
    selectCandidateWatchingSpot,
    setSelectedCandidateWatchingSpotId,
    clearAllPreviewSelections,
    mapFollowsAircraft,
    setMapZoom,
    applyMapMode,
    setUserLocationPreferences,
  } = useExplorerUi();
  const [userLocation, setUserLocation] = useState(null);
  const [userLocationMode, setUserLocationMode] = useState<UserLocationAudioMode>(
    USER_LOCATION_AUDIO_MODES.OFF,
  );
  const [userLocationPending, setUserLocationPending] = useState(false);
  const [userLocationNotice, setUserLocationNotice] = useState("");
  const userLocationWatchIdRef = useRef<number | null>(null);
  const autoUserLocationAttemptKeyRef = useRef("");
  const spottingPreviousZoomRef = useRef<number | null>(null);
  const airportProfile = useMemo(
    () => resolveAirportProfile({ icao, airport }),
    [icao, airport],
  );
  // Nearby-airports list runs first in near-me mode so we can borrow
  // the closest airport's ICAO for the METAR temperature fetch — the
  // current location otherwise has no METAR station of its own.
  const nearbyAirports = useNearbyAirports({
    icao: airportProfile.icao,
    lat: airportProfile.lat,
    lon: airportProfile.lon,
  });
  const metarIcao = nearMe
    ? nearbyAirports.airports?.[0]?.icao || ""
    : airportProfile.icao;
  const { weather, traffic } = useAirportExplorerData(airportProfile, {
    metarIcao,
  });
  const userLocationActive = Boolean(userLocation);
  const userLocationAudioActive =
    userLocationActive &&
    userLocationMode === USER_LOCATION_AUDIO_MODES.LOCATION_AUDIO;
  const {
    cue: userLocationAudioCue,
    pulseBeat: userLocationPulseBeat,
    unlockAudio,
  } = useUserLocationAircraftAudio({
    enabled: userLocationAudioActive,
    userLocation,
    aircraft: traffic.aircraft,
  });
  const candidateWatchingSpots = useCandidateWatchingSpots({
    airportIcao: airportProfile.icao,
    enabled: Boolean(airportProfile.icao),
  });
  const selection = useMemo(
    () =>
      resolveAirportExplorerSelection({
        aircraft: traffic.aircraft,
        selectedAircraftId,
        airports: nearbyAirports.airports,
        selectedAirportIcao,
        navaids: airport?.nearbyNavaids || [],
        selectedNavaidKey,
        airspaces: airport?.airspaces || [],
        selectedAirspaceId,
        candidateWatchingSpots: candidateWatchingSpots.spots,
        selectedCandidateWatchingSpotId,
      }),
    [
      airport?.airspaces,
      airport?.nearbyNavaids,
      candidateWatchingSpots.spots,
      nearbyAirports.airports,
      selectedAircraftId,
      selectedAirportIcao,
      selectedNavaidKey,
      selectedAirspaceId,
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
    if (!userLocationNotice) return undefined;
    const timer = window.setTimeout(() => setUserLocationNotice(""), 3400);
    return () => window.clearTimeout(timer);
  }, [userLocationNotice]);

  const stopUserLocationWatch = useCallback(() => {
    if (
      userLocationWatchIdRef.current == null ||
      typeof navigator === "undefined" ||
      !navigator.geolocation ||
      typeof navigator.geolocation.clearWatch !== "function"
    ) {
      userLocationWatchIdRef.current = null;
      return;
    }

    navigator.geolocation.clearWatch(userLocationWatchIdRef.current);
    userLocationWatchIdRef.current = null;
  }, []);

  useEffect(() => stopUserLocationWatch, [stopUserLocationWatch]);

  const clearUserLocation = useCallback(() => {
    stopUserLocationWatch();
    setUserLocation(null);
    setUserLocationMode(USER_LOCATION_AUDIO_MODES.OFF);
    setUserLocationNotice("");
  }, [stopUserLocationWatch]);

  const requestUserLocation = useCallback((requestedMode: UserLocationAudioMode) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setUserLocationMode(USER_LOCATION_AUDIO_MODES.OFF);
      setUserLocationNotice(t("map.locationUnavailable"));
      return;
    }

    const handlePosition = (position) => {
      setUserLocationPending(false);
      const result = resolveUserLocationWatchUpdate({
        coords: position.coords,
        focalLat: airportProfile.lat,
        focalLon: airportProfile.lon,
        currentMode: requestedMode,
      });

      if (!result.location) {
        stopUserLocationWatch();
        setUserLocation(null);
        setUserLocationMode(USER_LOCATION_AUDIO_MODES.OFF);
        setUserLocationNotice(
          result.noticeKey === "tooFar"
            ? t("map.locationTooFar")
            : t("map.locationUnavailable"),
        );
        return;
      }

      setUserLocation(result.location);
      setUserLocationMode(result.mode);
      setUserLocationPreferences({
        userLocationEnabled: true,
        userLocationAudioEnabled:
          result.mode === USER_LOCATION_AUDIO_MODES.LOCATION_AUDIO,
      });
      setUserLocationNotice("");
    };
    const handleError = (error) => {
      stopUserLocationWatch();
      setUserLocationPending(false);
      setUserLocationMode(USER_LOCATION_AUDIO_MODES.OFF);
      setUserLocationNotice(
        error?.code === error?.PERMISSION_DENIED
          ? t("map.locationDenied")
          : t("map.locationUnavailable"),
      );
    };
    const locationOptions = {
      enableHighAccuracy: true,
      timeout: 10_000,
      maximumAge: 0,
    };

    setUserLocationPending(true);
    stopUserLocationWatch();
    if (typeof navigator.geolocation.watchPosition === "function") {
      userLocationWatchIdRef.current = navigator.geolocation.watchPosition(
        handlePosition,
        handleError,
        locationOptions,
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      handlePosition,
      handleError,
      locationOptions,
    );
  }, [
    airportProfile.lat,
    airportProfile.lon,
    setUserLocationPreferences,
    stopUserLocationWatch,
    t,
  ]);

  useEffect(() => {
    if (!userLocationEnabled) {
      autoUserLocationAttemptKeyRef.current = "";
      if (userLocation) clearUserLocation();
      return;
    }

    if (userLocation || userLocationPending) return;
    const attemptKey = `${airportProfile.icao}:${userLocationAudioEnabled}`;
    if (autoUserLocationAttemptKeyRef.current === attemptKey) return;
    autoUserLocationAttemptKeyRef.current = attemptKey;
    requestUserLocation(
      userLocationAudioEnabled
        ? USER_LOCATION_AUDIO_MODES.LOCATION_AUDIO
        : USER_LOCATION_AUDIO_MODES.LOCATION,
    );
  }, [
    airportProfile.icao,
    clearUserLocation,
    requestUserLocation,
    userLocation,
    userLocationAudioEnabled,
    userLocationEnabled,
    userLocationPending,
  ]);

  const toggleUserLocation = useCallback(() => {
    if (userLocation || userLocationEnabled) {
      setUserLocationPreferences({
        userLocationEnabled: false,
        userLocationAudioEnabled: false,
      });
      clearUserLocation();
      return;
    }

    requestUserLocation(USER_LOCATION_AUDIO_MODES.LOCATION);
  }, [
    clearUserLocation,
    requestUserLocation,
    setUserLocationPreferences,
    userLocation,
    userLocationEnabled,
  ]);

  const toggleUserLocationAudio = useCallback(() => {
    if (!userLocation) return;
    if (userLocationAudioActive) {
      setUserLocationMode(USER_LOCATION_AUDIO_MODES.LOCATION);
      setUserLocationPreferences({
        userLocationEnabled: true,
        userLocationAudioEnabled: false,
      });
      setUserLocationNotice("");
      return;
    }

    unlockAudio();
    setUserLocationMode(USER_LOCATION_AUDIO_MODES.LOCATION_AUDIO);
    setUserLocationPreferences({
      userLocationEnabled: true,
      userLocationAudioEnabled: true,
    });
    setUserLocationNotice("");
  }, [
    setUserLocationPreferences,
    unlockAudio,
    userLocation,
    userLocationAudioActive,
  ]);

  const openSpottingDetail = useCallback((activeView = "") => {
    const zoomUpdate = resolveSpottingMetricZoomState({
      activeView,
      currentZoom: mapZoom,
      previousZoom: spottingPreviousZoomRef.current,
      detailZoom: ZOOM_DETAIL,
      fallbackZoom: ZOOM_APPROACH,
    });
    spottingPreviousZoomRef.current = zoomUpdate.nextPreviousZoom;
    if (activeView !== "spotting") {
      applyMapMode(MAP_MODE_IDS.SPOTTING);
    }
    setMapZoom(zoomUpdate.nextZoom);
  }, [applyMapMode, mapZoom, setMapZoom]);

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
  const sidebarProps = {
    icao: airportProfile.icao,
    iata: airportProfile.iata,
    name: airportProfile.name,
    localizedName: airportProfile.localizedName,
    city: airportProfile.city,
    country: airportProfile.country,
    lat: airportProfile.lat,
    lon: airportProfile.lon,
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
    focusLat: airportProfile.lat,
    focusLon: airportProfile.lon,
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
    nearMeRefresh,
    onSelectAircraft: selectAircraft,
    onSelectAirport: selectAirport,
    onSelectCandidateWatchingSpot: selectCandidateWatchingSpot,
    onOpenSpotting: openSpottingDetail,
    onBack,
    onMap: closeSidebar,
  };

  return (
    <SelectedAircraftTraceProvider
      selectedAircraft={selection.selectedAircraft}
      showSelectedTrace
    >
      <AircraftPreviewCard
        aircraft={selection.selectedAircraft}
        airport={selection.selectedAirport}
        navaid={selection.selectedNavaid}
        airspace={selection.selectedAirspace}
        candidateWatchingSpot={selection.selectedCandidateWatchingSpot}
        candidateWatchingSpotAttribution={candidateWatchingSpots.sourceAttribution}
        isMobile={isMobile}
        sidebarOpen={sidebarOpen}
        airportProfile={airportProfile}
        onApplyTemporaryRoute={traffic.applyTemporaryRoute}
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
          <AirportExplorerDesktopSidebar
            open={sidebarOpen}
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
              userLocationActive={userLocationEnabled || userLocationActive}
              userLocationAudioActive={
                userLocationAudioEnabled || userLocationAudioActive
              }
              userLocationPending={userLocationPending}
              userLocationNotice={userLocationNotice}
              onToggleUserLocation={toggleUserLocation}
              onToggleUserLocationAudio={toggleUserLocationAudio}
            />
          )}

          <AirportMap
            icao={airportProfile.icao}
            lat={airportProfile.lat}
            lon={airportProfile.lon}
            airportElevationFt={airportProfile.elevationFt}
            zoom={mapZoom}
            aircraft={traffic.aircraft}
            nearbyAirports={nearbyAirports.airports}
            nearbyNavaids={airport?.nearbyNavaids || []}
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
            selectedAirspaceId={selectedAirspaceId}
            selectedCandidateWatchingSpotId={selectedCandidateWatchingSpotId}
            candidateWatchingSpots={candidateWatchingSpots.spots}
            candidateWatchingSpotCount={0}
            followsCenter={mapFollowsAircraft}
            floatingSidebarAware={!isMobile && sidebarOpen}
            onSelectAircraft={selectAircraft}
            onSelectAirport={selectAirport}
            onSelectNavaid={selectNavaid}
            onSelectAirspace={selectAirspace}
            onSelectCandidateWatchingSpot={selectCandidateWatchingSpot}
            runwayMap={airport?.runwayMap}
            loadingOverlayActive={loadingOverlayActive}
            loadingOverlaySources={loadingOverlaySources}
            userLocation={userLocation}
            userLocationPulseIntervalMs={
              userLocationAudioActive
                ? userLocationAudioCue?.intervalMs
                : undefined
            }
            userLocationPulseBeat={
              userLocationAudioActive ? userLocationPulseBeat : undefined
            }
          />

          {isMobile && sidebarOpen && (
            <div className="absolute inset-0 z-map-panel overscroll-none overflow-y-auto">
              <AirportSidebar {...sidebarProps} onClose={closeSidebar} />
            </div>
          )}
        </div>
      </div>
    </SelectedAircraftTraceProvider>
  );
}
