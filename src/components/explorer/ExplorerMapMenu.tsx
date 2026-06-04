"use client";

import MapControlBar from "@/components/ui/MapControlBar";
import MobileMapSourceStatus from "./MobileMapSourceStatus";
import { useExplorerUi } from "./ExplorerUiContext";

export default function ExplorerMapMenu({
  feedSource = "",
  feedStatus = "live",
  lastUpdated = null,
  routeProvider = "",
  loadingStatus = "",
  userLocationActive = false,
  userLocationAudioActive = false,
  userLocationPending = false,
  userLocationNotice = "",
  onToggleUserLocation = null,
  onToggleUserLocationAudio = null,
  onFitToTrace = null,
  zoomDisabled = false,
}: Record<string, any> = {}) {
  const {
    isMobile,
    mapZoom,
    mapFollowsAircraft,
    showMapLabels,
    showRunwayBeams,
    showNavaidMarkers,
    showAirspaces,
    showCandidateWatchingSpots,
    mapSettings,
    mapSettingsSaveStatus,
    setMapZoom,
    applyMapMode,
    toggleSidebar,
    toggleMapLabels,
    toggleRunwayBeams,
    toggleNavaidMarkers,
    toggleAirspaces,
    toggleCandidateWatchingSpots,
  } = useExplorerUi();

  return (
    <div
      className={`airport-map-menu ${
        isMobile ? "airport-map-menu--mobile" : "airport-map-menu--desktop"
      }`}
    >
      <MapControlBar
        activeZoom={mapZoom}
        zoomActive={mapFollowsAircraft}
        zoomDisabled={zoomDisabled}
        showMapLabels={showMapLabels}
        showRunwayBeams={showRunwayBeams}
        showNavaidMarkers={showNavaidMarkers}
        showAirspaces={showAirspaces}
        showCandidateWatchingSpots={showCandidateWatchingSpots}
        mapSettings={mapSettings}
        mapSettingsSaveStatus={mapSettingsSaveStatus}
        userLocationActive={userLocationActive}
        userLocationAudioActive={userLocationAudioActive}
        userLocationPending={userLocationPending}
        userLocationNotice={userLocationNotice}
        showSidebarToggle={isMobile}
        onZoom={setMapZoom}
        onToggleMapLabels={toggleMapLabels}
        onToggleRunwayBeams={toggleRunwayBeams}
        onToggleNavaidMarkers={toggleNavaidMarkers}
        onToggleAirspaces={toggleAirspaces}
        onToggleCandidateWatchingSpots={toggleCandidateWatchingSpots}
        onSelectMapMode={applyMapMode}
        onToggleUserLocation={onToggleUserLocation}
        onToggleUserLocationAudio={onToggleUserLocationAudio}
        onToggleSidebar={toggleSidebar}
        onFitToTrace={onFitToTrace}
      />

      <MobileMapSourceStatus
        feedSource={feedSource}
        feedStatus={feedStatus}
        lastUpdated={lastUpdated}
        routeProvider={routeProvider}
        loadingStatus={loadingStatus}
      />
    </div>
  );
}
