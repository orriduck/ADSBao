"use client";

import { useMemo, useRef, useState } from "react";
import { MAP_ZOOM_OPTIONS } from "../../config/mapControls";
import { useThemePreference } from "../../features/app-shell/useThemePreference";
import MapControlRail from "@/components/map/controls/MapControlRail";
import MapSettingsSheet from "@/components/map/controls/MapSettingsSheet";
import {
  getNextZoomValue,
  resolveZoomOption,
} from "../../features/airport/map-controls/mapControlModel";
import { ZOOM_AIRPORT } from "../../utils/airportMapDisplay";

const MAP_SETTINGS_SHEET_ID = "map-settings-sheet";

export default function MapControlBar({
  menuPlacement = "bottom",
  activeZoom = ZOOM_AIRPORT,
  zoomActive = true,
  zoomDisabled = false,
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
  wakeLockActive = false,
  onZoom,
  onToggleMapLabels,
  onToggleRunwayBeams,
  onToggleNavaidMarkers,
  onToggleAirspaces,
  onToggleCandidateWatchingSpots,
  onToggleShowCallsigns,
  onSelectMapMode,
  onSelectBaseLayer,
  onToggleUserLocation = null,
  onToggleUserLocationAudio = null,
  onToggleSidebar,
  onFitToTrace = null,
  onToggleWakeLock = null,
}) {
  const controlZone = useRef(null);
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

  const cycleZoom = () => {
    if (zoomDisabled) return;
    // If the button is currently inactive (auto-follow is off because the
    // user clicked fit-to-trace), the first click should resume tracking
    // at the SAME preset zoom they were on — not skip to the next one.
    // Once auto-follow is back on, subsequent clicks cycle as usual.
    if (!zoomActive) {
      onZoom?.(activeZoom);
      return;
    }
    onZoom?.(getNextZoomValue(activeZoom, MAP_ZOOM_OPTIONS));
  };

  const toggleSettings = () => {
    setSettingsOpen((value) => !value);
  };

  return (
    <div ref={controlZone} className="map-ctrl-zone">
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
        zoomActive={zoomActive}
        zoomDisabled={zoomDisabled}
        currentTheme={themePreference}
        themeTitle={themeTitle}
        onSelectTheme={selectTheme}
        settingsOpen={settingsOpen}
        settingsSheetId={MAP_SETTINGS_SHEET_ID}
        showSidebarToggle={showSidebarToggle}
        wakeLockActive={wakeLockActive}
        onToggleSidebar={onToggleSidebar}
        onCycleZoom={cycleZoom}
        onFitToTrace={onFitToTrace}
        onCycleTheme={cycleTheme}
        onToggleSettings={toggleSettings}
        onToggleWakeLock={onToggleWakeLock}
      />
    </div>
  );
}
