"use client";

import MapControlBar from "@/components/ui/MapControlBar";
import MobileMapSourceStatus from "./MobileMapSourceStatus";
import { useExplorerUi } from "./ExplorerUiContext";
import { useWakeLock } from "@/hooks/useWakeLock";

export default function ExplorerMapMenu({
  feedSource = "",
  feedStatus = "live",
  lastUpdated = null,
  routeProvider = "",
  loadingStatus = "",
  realtimeStatus = "",
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
    showCallsigns,
    mapSettings,
    mapSettingsDevice,
    mapSettingsSaveStatus,
    mapSettingsSaveStatusCode,
    mapSettingsSaveCycle,
    setMapZoom,
    applyMapMode,
    setMapBaseLayer,
    toggleSidebar,
    toggleMapLabels,
    toggleRunwayBeams,
    toggleNavaidMarkers,
    toggleAirspaces,
    toggleCandidateWatchingSpots,
    toggleShowCallsigns,
  } = useExplorerUi();

  const [wakeLockState, toggleWakeLock] = useWakeLock();

  return (
    <div
      className={`airport-map-menu ${
        isMobile ? "airport-map-menu--mobile" : "airport-map-menu--desktop"
      }`}
    >
      <MapControlBar
        menuPlacement={isMobile ? "top" : "bottom"}
        activeZoom={mapZoom}
        zoomActive={mapFollowsAircraft}
        zoomDisabled={zoomDisabled}
        showMapLabels={showMapLabels}
        showRunwayBeams={showRunwayBeams}
        showNavaidMarkers={showNavaidMarkers}
        showAirspaces={showAirspaces}
        showCandidateWatchingSpots={showCandidateWatchingSpots}
        showCallsigns={showCallsigns}
        mapSettings={mapSettings}
        mapSettingsDevice={mapSettingsDevice}
        mapSettingsSaveStatus={mapSettingsSaveStatus}
        mapSettingsSaveStatusCode={mapSettingsSaveStatusCode}
        mapSettingsSaveCycle={mapSettingsSaveCycle}
        userLocationActive={userLocationActive}
        userLocationAudioActive={userLocationAudioActive}
        userLocationPending={userLocationPending}
        userLocationNotice={userLocationNotice}
        showSidebarToggle={isMobile}
        wakeLockActive={wakeLockState.active}
        onZoom={setMapZoom}
        onToggleMapLabels={toggleMapLabels}
        onToggleRunwayBeams={toggleRunwayBeams}
        onToggleNavaidMarkers={toggleNavaidMarkers}
        onToggleAirspaces={toggleAirspaces}
        onToggleCandidateWatchingSpots={toggleCandidateWatchingSpots}
        onToggleShowCallsigns={toggleShowCallsigns}
        onSelectMapMode={applyMapMode}
        onSelectBaseLayer={setMapBaseLayer}
        onToggleUserLocation={onToggleUserLocation}
        onToggleUserLocationAudio={onToggleUserLocationAudio}
        onToggleSidebar={toggleSidebar}
        onFitToTrace={onFitToTrace}
        onToggleWakeLock={
          wakeLockState.supported ? toggleWakeLock : null
        }
      />

      <MobileMapSourceStatus
        feedSource={feedSource}
        feedStatus={feedStatus}
        lastUpdated={lastUpdated}
        routeProvider={routeProvider}
        loadingStatus={loadingStatus}
        realtimeStatus={realtimeStatus}
        wakeLockActive={wakeLockState.active}
      />
    </div>
  );
}
