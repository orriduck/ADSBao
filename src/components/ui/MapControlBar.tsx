"use client";

import { useMemo, useRef, useState } from "react";
import { MAP_ZOOM_OPTIONS } from "../../config/mapControls";
import { useThemePreference } from "../../features/app-shell/useThemePreference";
import MapControlRail from "@/components/map/controls/MapControlRail";
import MapSettingsSheet from "@/components/map/controls/MapSettingsSheet";
import {
  resolveZoomOption,
} from "../../features/airport/map-controls/mapControlModel";
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
  showMapLabels = false,
  showRunwayBeams = true,
  showNavaidMarkers = false,
  showAirspaces = true,
  showCandidateWatchingSpots = false,
  showCallsigns = true,
  mapSettings,
  mapSettingsDevice = "desktop",
  mapSettingsSaveStatus = "idle",
  mapSettingsSaveStatusCode = null,
  mapSettingsSaveCycle = 0,
  userLocationActive = false,
  userLocationAudioActive = false,
  userLocationPending = false,
  userLocationNotice = "",
  showSidebarToggle = true,
  showMapButton = false,
  wakeLockActive = false,
  wakeLockSupported = false,
  onZoom,
  onToggleMapLabels,
  onToggleRunwayBeams,
  onToggleNavaidMarkers,
  onToggleAirspaces,
  onToggleCandidateWatchingSpots,
  onToggleShowCallsigns,
  onSelectMapMode,
  onSelectBaseLayer,
  onMap = null,
  onToggleUserLocation = null,
  onToggleUserLocationAudio = null,
  onToggleSidebar,
  onToggleWakeLock = null,
}) {
  const controlZone = useRef(null);
  const { t } = useI18n();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const {
    themePreference,
    themeTitle,
    cycleTheme,
    selectTheme,
  } = useThemePreference();

  const currentZoomOption = useMemo(
    () => resolveZoomOption(activeZoom, MAP_ZOOM_OPTIONS),
    [activeZoom],
  );

  const zoomViewItems = useMemo(
    () =>
      MAP_ZOOM_OPTIONS.map((option) => ({
        id: `zoom:${option.value}`,
        label: t(option.labelKey),
        iconKey: option.iconKey,
        active: zoomActive && !zoomDisabled && option.value === activeZoom,
        disabled: zoomDisabled,
        onSelect: () => onZoom?.(option.value),
      })),
    [activeZoom, onZoom, t, zoomActive, zoomDisabled],
  );
  const normalizedTraceViewItems = useMemo(
    () =>
      traceViewItems.map((item) => ({
        ...item,
        label: item.label || (item.labelKey ? t(item.labelKey) : ""),
      })),
    [t, traceViewItems],
  );
  const viewItems = useMemo(
    () => [...zoomViewItems, ...normalizedTraceViewItems],
    [normalizedTraceViewItems, zoomViewItems],
  );
  const currentZoomViewItem =
    zoomViewItems.find((item) => item.id === `zoom:${activeZoom}`) ||
    zoomViewItems[0] ||
    null;
  const activeViewItem =
    viewItems.find((item) => item.active) || currentZoomViewItem;

  const toggleSettings = () => {
    setSettingsOpen((value) => !value);
  };

  return (
    <div
      ref={controlZone}
      className={cn(
        "map-ctrl-zone",
        surface === "sidebar" && "map-ctrl-zone--sidebar",
      )}
    >
      <MapSettingsSheet
        id={MAP_SETTINGS_SHEET_ID}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        mapSettings={mapSettings}
        showMapLabels={showMapLabels}
        showBeams={showRunwayBeams}
        showNavaidMarkers={showNavaidMarkers}
        showAirspaces={showAirspaces}
        showCandidateWatchingSpots={showCandidateWatchingSpots}
        showCallsigns={showCallsigns}
        mapSettingsDevice={mapSettingsDevice}
        mapSettingsSaveStatus={mapSettingsSaveStatus}
        mapSettingsSaveStatusCode={mapSettingsSaveStatusCode}
        mapSettingsSaveCycle={mapSettingsSaveCycle}
        userLocationActive={userLocationActive}
        userLocationAudioActive={userLocationAudioActive}
        userLocationPending={userLocationPending}
        userLocationNotice={userLocationNotice}
        onSelectMapMode={onSelectMapMode}
        onSelectBaseLayer={onSelectBaseLayer}
        onToggleMapLabels={onToggleMapLabels}
        onToggleBeams={onToggleRunwayBeams}
        onToggleNavaidMarkers={onToggleNavaidMarkers}
        onToggleAirspaces={onToggleAirspaces}
        onToggleCandidateWatchingSpots={onToggleCandidateWatchingSpots}
        onToggleShowCallsigns={onToggleShowCallsigns}
        onToggleUserLocation={onToggleUserLocation}
        onToggleUserLocationAudio={onToggleUserLocationAudio}
      />

      <MapControlRail
        menuPlacement={menuPlacement}
        currentZoomOption={currentZoomOption}
        zoomViewItems={zoomViewItems}
        currentZoomViewItem={currentZoomViewItem}
        viewItems={viewItems}
        activeViewItem={activeViewItem}
        currentTheme={themePreference}
        themeTitle={themeTitle}
        onSelectTheme={selectTheme}
        settingsOpen={settingsOpen}
        settingsSheetId={MAP_SETTINGS_SHEET_ID}
        showSidebarToggle={showSidebarToggle}
        showMapButton={showMapButton}
        wakeLockActive={wakeLockActive}
        wakeLockSupported={wakeLockSupported}
        onToggleSidebar={onToggleSidebar}
        onMap={onMap}
        onCycleTheme={cycleTheme}
        onToggleSettings={toggleSettings}
        onToggleWakeLock={onToggleWakeLock}
      />
    </div>
  );
}
