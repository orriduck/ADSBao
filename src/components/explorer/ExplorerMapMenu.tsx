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
  userLocationPending = false,
  userLocationNotice = "",
  userLocationPermissionDenied = false,
  onRequestUserLocationPermission = null,
  userLocationPositionReady = false,
  userLocationCompassHeadingDeg = null,
  userLocationStatusLines = [],
  wakeLockState = { supported: false, active: false },
  onToggleWakeLock = null,
  onMap = null,
  onRecenter = null,
  zoomDisabled = false,
}: Record<string, any> = {}) {
  const {
    isMobile,
    mapZoom,
    mapFollowsAircraft,
    mapSettings,
    mapSettingsDevice,
    saveMapSettings,
    setMapZoom,
    toggleSidebar,
  } = useExplorerUi();

  const toolbar = (
    <MapControlBar
      surface={surface}
      menuPlacement={isMobile ? "top" : "bottom"}
      activeZoom={mapZoom}
      zoomActive={mapFollowsAircraft}
      zoomDisabled={zoomDisabled}
      traceViewItems={traceViewItems}
      mapSettings={mapSettings}
      mapSettingsDevice={mapSettingsDevice}
      onSaveMapSettings={saveMapSettings}
      userLocationActive={userLocationActive}
      userLocationPending={userLocationPending}
      userLocationNotice={userLocationNotice}
      userLocationPermissionDenied={userLocationPermissionDenied}
      onRequestUserLocationPermission={onRequestUserLocationPermission}
      userLocationPositionReady={userLocationPositionReady}
      userLocationCompassHeadingDeg={userLocationCompassHeadingDeg}
      showSidebarToggle={surface === "map" && isMobile}
      showMapButton={surface === "sidebar"}
      wakeLockActive={wakeLockState.active}
      wakeLockSupported={wakeLockState.supported}
      onZoom={setMapZoom}
      onToggleSidebar={toggleSidebar}
      onMap={onMap}
      onRecenter={onRecenter}
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
        statusLines={userLocationStatusLines}
        wakeLockActive={wakeLockState.active}
      />
    </div>
  );
}
