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

function AirportExplorerContent({ icao = "", airport = null, onBack }) {
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
    mapFollowsAircraft,
  } = useExplorerUi();
  const [userLocation, setUserLocation] = useState(null);
  const [userLocationMode, setUserLocationMode] = useState<UserLocationAudioMode>(
    USER_LOCATION_AUDIO_MODES.OFF,
  );
  const [userLocationPending, setUserLocationPending] = useState(false);
  const [userLocationNotice, setUserLocationNotice] = useState("");
  const userLocationWatchIdRef = useRef<number | null>(null);
  const airportProfile = useMemo(
    () => resolveAirportProfile({ icao, airport }),
    [icao, airport],
  );
  const { weather, traffic } = useAirportExplorerData(airportProfile);
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
  const nearbyAirports = useNearbyAirports({
    icao: airportProfile.icao,
    lat: airportProfile.lat,
    lon: airportProfile.lon,
  });
  const candidateWatchingSpots = useCandidateWatchingSpots({
    airportIcao: airportProfile.icao,
    enabled: showCandidateWatchingSpots,
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
    if (!isMobile) return undefined;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyOverscroll = document.body.style.overscrollBehavior;
    const originalHtmlOverscroll =
      document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overscrollBehavior = originalBodyOverscroll;
      document.documentElement.style.overscrollBehavior = originalHtmlOverscroll;
    };
  }, [isMobile]);

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
    stopUserLocationWatch,
    t,
  ]);

  const toggleUserLocation = useCallback(() => {
    if (userLocation) {
      clearUserLocation();
      return;
    }

    requestUserLocation(USER_LOCATION_AUDIO_MODES.LOCATION);
  }, [clearUserLocation, requestUserLocation, userLocation]);

  const toggleUserLocationAudio = useCallback(() => {
    if (!userLocation) return;
    if (userLocationAudioActive) {
      setUserLocationMode(USER_LOCATION_AUDIO_MODES.LOCATION);
      setUserLocationNotice("");
      return;
    }

    unlockAudio();
    setUserLocationMode(USER_LOCATION_AUDIO_MODES.LOCATION_AUDIO);
    setUserLocationNotice("");
  }, [unlockAudio, userLocation, userLocationAudioActive]);

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
    metar: weather.metar,
    metarRaw: weather.metarRaw,
    metarLoading: weather.metarLoading,
    metarError: weather.metarError,
    aircraft: traffic.aircraft,
    airports: nearbyAirports.airports,
    focusLat: airportProfile.lat,
    focusLon: airportProfile.lon,
    selectedAircraftId,
    selectedAirportIcao,
    lastUpdated: traffic.lastUpdated,
    feedStatus: traffic.feedStatus,
    feedSource: traffic.feedSource,
    routeProvider: traffic.routeProvider,
    loadingStatus: sourceLoadingStatus,
    onSelectAircraft: selectAircraft,
    onSelectAirport: selectAirport,
    onBack,
    onMap: closeSidebar,
  };

  return (
    <SelectedAircraftTraceProvider selectedAircraft={selection.selectedAircraft}>
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
      />
      <div
        className={`font-sans text-atc-text ${
          isMobile
            ? "fixed inset-0 z-0 flex overflow-hidden overscroll-none"
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

        <div className="airport-map-stage relative min-w-0 flex-1 overflow-hidden bg-atc-bg">
          {!(isMobile && sidebarOpen) && (
            <ExplorerMapMenu
              feedSource={traffic.feedSource}
              feedStatus={traffic.feedStatus}
              lastUpdated={traffic.lastUpdated}
              routeProvider={traffic.routeProvider}
              loadingStatus={sourceLoadingStatus}
              userLocationActive={userLocationActive}
              userLocationAudioActive={userLocationAudioActive}
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
            zoom={mapZoom}
            aircraft={traffic.aircraft}
            nearbyAirports={nearbyAirports.airports}
            nearbyNavaids={airport?.nearbyNavaids || []}
            airspaces={airport?.airspaces || []}
            airport={airport}
            showMapLabels={showMapLabels}
            showRunwayBeams={showRunwayBeams}
            showNavaidMarkers={showNavaidMarkers}
            showAirspaces={showAirspaces}
            showCandidateWatchingSpots={showCandidateWatchingSpots}
            trafficFilter={trafficFilter}
            typeFilter={typeFilter}
            altitudeLevel={altitudeLevel}
            selectedAircraftId={selectedAircraftId}
            selectedAirportIcao={selectedAirportIcao}
            selectedNavaidKey={selectedNavaidKey}
            selectedAirspaceId={selectedAirspaceId}
            selectedCandidateWatchingSpotId={selectedCandidateWatchingSpotId}
            candidateWatchingSpots={candidateWatchingSpots.spots}
            candidateWatchingSpotCount={candidateWatchingSpots.spots.length}
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
            <div className="absolute inset-0 z-map-panel">
              <AirportSidebar {...sidebarProps} onClose={closeSidebar} />
            </div>
          )}
        </div>
      </div>
    </SelectedAircraftTraceProvider>
  );
}
