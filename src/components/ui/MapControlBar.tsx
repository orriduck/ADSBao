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
  activeZoom = ZOOM_AIRPORT,
  zoomActive = true,
  zoomDisabled = false,
  showMapLabels = false,
  showRunwayBeams = true,
  showNavaidMarkers = false,
  showAirspaces = true,
  showCandidateWatchingSpots = false,
  mapSettings = null,
  savedMapSettings = null,
  mapSettingsSaveStatus = "idle",
  mapSettingsRestoreStatus = "idle",
  userLocationActive = false,
  userLocationAudioActive = false,
  userLocationPending = false,
  userLocationNotice = "",
  showSidebarToggle = true,
  onZoom,
  onToggleMapLabels,
  onToggleRunwayBeams,
  onToggleNavaidMarkers,
  onToggleAirspaces,
  onToggleCandidateWatchingSpots,
  onSelectMapMode,
  onSaveMapSettings = null,
  onRestoreMapSettings = null,
  onToggleUserLocation = null,
  onToggleUserLocationAudio = null,
  onToggleSidebar,
  onFitToTrace = null,
}) {
  const controlZone = useRef(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { themePreference, themeTitle, cycleTheme } = useThemePreference();

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
        savedMapSettings={savedMapSettings}
        mapSettingsSaveStatus={mapSettingsSaveStatus}
        mapSettingsRestoreStatus={mapSettingsRestoreStatus}
        userLocationActive={userLocationActive}
        userLocationAudioActive={userLocationAudioActive}
        userLocationPending={userLocationPending}
        userLocationNotice={userLocationNotice}
        onSelectMapMode={onSelectMapMode}
        onToggleMapLabels={onToggleMapLabels}
        onToggleBeams={onToggleRunwayBeams}
        onToggleNavaidMarkers={onToggleNavaidMarkers}
        onToggleAirspaces={onToggleAirspaces}
        onToggleCandidateWatchingSpots={onToggleCandidateWatchingSpots}
        onSaveMapSettings={onSaveMapSettings}
        onRestoreMapSettings={onRestoreMapSettings}
        onToggleUserLocation={onToggleUserLocation}
        onToggleUserLocationAudio={onToggleUserLocationAudio}
      />

      <MapControlRail
        currentZoomOption={currentZoomOption}
        zoomActive={zoomActive}
        zoomDisabled={zoomDisabled}
        currentTheme={themePreference}
        themeTitle={themeTitle}
        settingsOpen={settingsOpen}
        settingsSheetId={MAP_SETTINGS_SHEET_ID}
        showSidebarToggle={showSidebarToggle}
        onToggleSidebar={onToggleSidebar}
        onCycleZoom={cycleZoom}
        onFitToTrace={onFitToTrace}
        onCycleTheme={cycleTheme}
        onToggleSettings={toggleSettings}
      />
    </div>
  );
}
