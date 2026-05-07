"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { MAP_ZOOM_OPTIONS } from "../../config/mapControls.js";
import { useThemePreference } from "../../features/app-shell/useThemePreference.js";
import MapControlRail from "../../features/map-controls/MapControlRail.jsx";
import MapZoomDrawer from "../../features/map-controls/MapZoomDrawer.jsx";
import RunwayLayerDrawer from "../../features/map-controls/RunwayLayerDrawer.jsx";
import {
  getNextZoomValue,
  resolveZoomOption,
} from "../../features/map-controls/mapControlModel.js";
import { useDismissibleDrawer } from "../../features/map-controls/useDismissibleDrawer.js";
import { useFocusAudio } from "../../features/map-controls/useFocusAudio.js";
import { ZOOM_AIRPORT } from "../../utils/airportMapDisplay.js";

const DRAWER_ID = "map-action-drawer";
const RUNWAY_DRAWER_ID = "map-runway-drawer";

export default function MapControlBar({
  activeZoom = ZOOM_AIRPORT,
  showMapLabels = true,
  showTelemetry = true,
  showRunwayBeams = true,
  showRunwayBadges = true,
  onZoom,
  onToggleMapLabels,
  onToggleTelemetry,
  onToggleRunwayBeams,
  onToggleRunwayBadges,
}) {
  const controlZone = useRef(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [runwayDrawerOpen, setRunwayDrawerOpen] = useState(false);
  const { themePreference, themeTitle, cycleTheme } = useThemePreference();
  const { playerHost, playing, audioReady, toggleAudio } = useFocusAudio();

  const currentZoomOption = useMemo(
    () => resolveZoomOption(activeZoom, MAP_ZOOM_OPTIONS),
    [activeZoom],
  );

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const closeRunwayDrawer = useCallback(() => {
    setRunwayDrawerOpen(false);
  }, []);

  useDismissibleDrawer({
    open: drawerOpen,
    containerRef: controlZone,
    onClose: closeDrawer,
  });

  useDismissibleDrawer({
    open: runwayDrawerOpen,
    containerRef: controlZone,
    onClose: closeRunwayDrawer,
  });

  const selectZoom = (zoom) => {
    onZoom?.(zoom);
    setDrawerOpen(false);
  };

  const cycleZoom = () => {
    onZoom?.(getNextZoomValue(activeZoom, MAP_ZOOM_OPTIONS));
  };

  const toggleDrawer = () => {
    setDrawerOpen((value) => !value);
    setRunwayDrawerOpen(false);
  };

  const toggleRunwayDrawer = () => {
    setRunwayDrawerOpen((value) => !value);
    setDrawerOpen(false);
  };

  return (
    <>
      <div ref={playerHost} className="yt-sink" aria-hidden="true" />
      <div ref={controlZone} className="map-ctrl-zone">
        <RunwayLayerDrawer
          id={RUNWAY_DRAWER_ID}
          open={runwayDrawerOpen}
          showBeams={showRunwayBeams}
          showBadges={showRunwayBadges}
          onToggleBeams={onToggleRunwayBeams}
          onToggleBadges={onToggleRunwayBadges}
        />

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
          runwayDrawerOpen={runwayDrawerOpen}
          playing={playing}
          audioReady={audioReady}
          showMapLabels={showMapLabels}
          showTelemetry={showTelemetry}
          drawerId={DRAWER_ID}
          runwayDrawerId={RUNWAY_DRAWER_ID}
          onCycleZoom={cycleZoom}
          onToggleAudio={toggleAudio}
          onCycleTheme={cycleTheme}
          onToggleMapLabels={onToggleMapLabels}
          onToggleTelemetry={onToggleTelemetry}
          onToggleDrawer={toggleDrawer}
          onToggleRunwayDrawer={toggleRunwayDrawer}
        />
      </div>
    </>
  );
}
