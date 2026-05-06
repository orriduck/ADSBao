"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { MAP_ZOOM_OPTIONS } from "../../config/mapControls.js";
import { useThemePreference } from "../../features/app-shell/useThemePreference.js";
import MapControlRail from "../../features/map-controls/MapControlRail.jsx";
import MapZoomDrawer from "../../features/map-controls/MapZoomDrawer.jsx";
import {
  getNextZoomValue,
  resolveZoomOption,
} from "../../features/map-controls/mapControlModel.js";
import { useDismissibleDrawer } from "../../features/map-controls/useDismissibleDrawer.js";
import { useFocusAudio } from "../../features/map-controls/useFocusAudio.js";
import { ZOOM_AIRPORT } from "../../utils/airportMapDisplay.js";

const DRAWER_ID = "map-action-drawer";

export default function MapControlBar({
  activeZoom = ZOOM_AIRPORT,
  showMapLabels = true,
  showProcedurePanel = false,
  showTelemetry = true,
  onZoom,
  onToggleMapLabels,
  onToggleProcedurePanel,
  onToggleTelemetry,
}) {
  const controlZone = useRef(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { themePreference, themeTitle, cycleTheme } = useThemePreference();
  const { playerHost, playing, audioReady, toggleAudio } = useFocusAudio();

  const currentZoomOption = useMemo(
    () => resolveZoomOption(activeZoom, MAP_ZOOM_OPTIONS),
    [activeZoom],
  );

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  useDismissibleDrawer({
    open: drawerOpen,
    containerRef: controlZone,
    onClose: closeDrawer,
  });

  const selectZoom = (zoom) => {
    onZoom?.(zoom);
    setDrawerOpen(false);
  };

  const cycleZoom = () => {
    onZoom?.(getNextZoomValue(activeZoom, MAP_ZOOM_OPTIONS));
  };

  return (
    <>
      <div ref={playerHost} className="yt-sink" aria-hidden="true" />
      <div ref={controlZone} className="map-ctrl-zone">
        <MapZoomDrawer
          id={DRAWER_ID}
          open={drawerOpen}
          options={MAP_ZOOM_OPTIONS}
          activeZoom={activeZoom}
          onSelect={selectZoom}
        />

        <MapControlRail
          currentZoomOption={currentZoomOption}
          currentTheme={themePreference}
          themeTitle={themeTitle}
          drawerOpen={drawerOpen}
          playing={playing}
          audioReady={audioReady}
          showMapLabels={showMapLabels}
          showProcedurePanel={showProcedurePanel}
          showTelemetry={showTelemetry}
          drawerId={DRAWER_ID}
          onCycleZoom={cycleZoom}
          onToggleAudio={toggleAudio}
          onCycleTheme={cycleTheme}
          onToggleMapLabels={onToggleMapLabels}
          onToggleProcedurePanel={onToggleProcedurePanel}
          onToggleTelemetry={onToggleTelemetry}
          onToggleDrawer={() => setDrawerOpen((value) => !value)}
        />
      </div>
    </>
  );
}
