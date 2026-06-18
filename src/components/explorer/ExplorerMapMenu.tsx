import MapControlBar from "@/components/ui/MapControlBar";
import MobileMapSourceStatus from "./MobileMapSourceStatus";
import { useExplorerUi } from "./ExplorerUiContext";

export default function ExplorerMapMenu({
  surface = "map",
  feedSource = "",
  feedStatus = "live",
  lastUpdated = null,
  loadingStatus = "",
  realtimeStatus = "",
  traceViewItems = [],
  userLocationActive = false,
  userLocationAudioActive = false,
  userLocationPending = false,
  userLocationNotice = "",
  wakeLockState = { supported: false, active: false },
  onToggleWakeLock = null,
  onMap = null,
  onToggleUserLocation = null,
  onToggleUserLocationAudio = null,
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

  const toolbar = (
    <MapControlBar
      surface={surface}
      menuPlacement={isMobile ? "top" : "bottom"}
      activeZoom={mapZoom}
      zoomActive={mapFollowsAircraft}
      zoomDisabled={zoomDisabled}
      traceViewItems={traceViewItems}
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
      showSidebarToggle={surface === "map" && isMobile}
      showMapButton={surface === "sidebar"}
      wakeLockActive={wakeLockState.active}
      wakeLockSupported={wakeLockState.supported}
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
      onMap={onMap}
      onToggleWakeLock={onToggleWakeLock}
    />
  );

  if (surface === "sidebar") return toolbar;

  return (
    <div
      className={`airport-map-menu ${
        isMobile ? "airport-map-menu--mobile" : "airport-map-menu--desktop"
      }`}
    >
      {toolbar}

      <MobileMapSourceStatus
        feedSource={feedSource}
        feedStatus={feedStatus}
        lastUpdated={lastUpdated}
        loadingStatus={loadingStatus}
        realtimeStatus={realtimeStatus}
        wakeLockActive={wakeLockState.active}
      />
    </div>
  );
}
