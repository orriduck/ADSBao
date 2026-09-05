import { useMemo, useRef, useState } from "react";
import {
  AIRPORT_MAP_ZOOM_MAX,
  AIRPORT_MAP_ZOOM_MIN,
} from "../../config/aviation";
import { useThemePreference } from "../../features/app-shell/useThemePreference";
import MapControlRail from "@/components/map/controls/MapControlRail";
import MapSettingsSheet from "@/components/map/controls/MapSettingsSheet";
import { ZOOM_AIRPORT } from "../../utils/airportMapDisplay";
import { cn } from "@/lib/utils";
import { useI18n } from "@/features/app-shell/i18n/useI18n";

const MAP_SETTINGS_SHEET_ID = "map-settings-sheet";

export default function MapControlBar({
  surface = "map",
  menuPlacement = "bottom",
  activeZoom = ZOOM_AIRPORT,
  zoomActive = true,
  zoomDisabled = false,
  traceViewItems = [],
  mapSettings,
  mapSettingsDevice = "desktop",
  onSaveMapSettings = null,
  userLocationActive = false,
  userLocationPending = false,
  userLocationNotice = "",
  userLocationPermissionDenied = false,
  onRequestUserLocationPermission = null,
  userLocationPositionReady = false,
  userLocationCompassHeadingDeg = null,
  showSidebarToggle = true,
  showMapButton = false,
  wakeLockActive = false,
  wakeLockSupported = false,
  onZoom,
  onMap = null,
  onRecenter = null,
  onToggleSidebar,
  onToggleWakeLock = null,
}) {
  const controlZone = useRef(null);
  const settingsTrigger = useRef<HTMLButtonElement>(null);
  const { t } = useI18n();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const {
    themePreference,
    themeTitle,
    cycleTheme,
    selectTheme,
  } = useThemePreference();

  const normalizedTraceViewItems = useMemo(
    () =>
      traceViewItems.map((item) => ({
        ...item,
        label: item.label || (item.labelKey ? t(item.labelKey) : ""),
      })),
    [t, traceViewItems],
  );

  const toggleSettings = (event) => {
    settingsTrigger.current = event.currentTarget;
    setSettingsOpen((value) => !value);
  };

  // Zoom + settings only make sense while the map is visible. In the mobile
  // sidebar surface the map isn't shown, so hide both controls (and the now
  // unreachable settings sheet).
  const showMapViewControls = surface !== "sidebar";

  return (
    <div
      ref={controlZone}
      className={cn(
        "map-ctrl-zone",
        surface === "sidebar" && "map-ctrl-zone--sidebar",
      )}
    >
      {showMapViewControls && (
        <MapSettingsSheet
          id={MAP_SETTINGS_SHEET_ID}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            settingsTrigger.current?.focus();
          }}
          onSaveMapSettings={onSaveMapSettings}
          mapSettings={mapSettings}
          mapSettingsDevice={mapSettingsDevice}
          userLocationActive={userLocationActive}
          userLocationPending={userLocationPending}
          userLocationNotice={userLocationNotice}
          userLocationPermissionDenied={userLocationPermissionDenied}
          onRequestUserLocationPermission={onRequestUserLocationPermission}
          userLocationPositionReady={userLocationPositionReady}
          userLocationCompassHeadingDeg={userLocationCompassHeadingDeg}
          wakeLockActive={wakeLockActive}
          wakeLockSupported={wakeLockSupported}
          onToggleWakeLock={onToggleWakeLock}
        />
      )}

      <MapControlRail
        menuPlacement={menuPlacement}
        activeZoom={activeZoom}
        zoomMin={AIRPORT_MAP_ZOOM_MIN}
        zoomMax={AIRPORT_MAP_ZOOM_MAX}
        zoomDisabled={zoomDisabled}
        zoomAdjustmentDisabled={
          normalizedTraceViewItems.length > 0 && !zoomActive
        }
        onZoom={onZoom}
        onRecenter={onRecenter}
        traceItems={normalizedTraceViewItems}
        currentTheme={themePreference}
        themeTitle={themeTitle}
        onSelectTheme={selectTheme}
        settingsOpen={settingsOpen}
        settingsSheetId={MAP_SETTINGS_SHEET_ID}
        showSidebarToggle={showSidebarToggle}
        showMapButton={showMapButton}
        showZoom={showMapViewControls}
        showSettings={showMapViewControls}
        onToggleSidebar={onToggleSidebar}
        onMap={onMap}
        onCycleTheme={cycleTheme}
        onToggleSettings={toggleSettings}
      />
    </div>
  );
}
