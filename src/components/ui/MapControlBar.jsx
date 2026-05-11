"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { MAP_ZOOM_OPTIONS } from "../../config/mapControls.js";
import { useThemePreference } from "../../features/app-shell/useThemePreference.js";
import MapControlRail from "../../features/map-controls/MapControlRail.jsx";
import MapZoomDrawer from "../../features/map-controls/MapZoomDrawer.jsx";
import MapLayerDrawer from "../../features/map-controls/MapLayerDrawer.jsx";
import {
  getNextZoomValue,
  resolveZoomOption,
} from "../../features/map-controls/mapControlModel.js";
import { useDismissibleDrawer } from "../../features/map-controls/useDismissibleDrawer.js";
import { useFocusAudio } from "../../features/map-controls/useFocusAudio.js";
import { ZOOM_AIRPORT } from "../../utils/airportMapDisplay.js";

const DRAWER_ID = "map-action-drawer";
const LAYER_DRAWER_ID = "map-layer-drawer";

export default function MapControlBar({
  activeZoom = ZOOM_AIRPORT,
  showMapLabels = false,
  showTelemetry = true,
  showRunwayBeams = true,
  showRoutingPointBadges = true,
  showAirspaceContext = true,
  telemetryDisabledForTraffic = false,
  telemetryTrafficLimit = 50,
  altitudeFocus = "all",
  onZoom,
  onAltitudeFocus,
  onToggleMapLabels,
  onToggleTelemetry,
  onToggleRunwayBeams,
  onToggleRoutingPointBadges,
  onToggleAirspaceContext,
}) {
  const controlZone = useRef(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [layerDrawerOpen, setLayerDrawerOpen] = useState(false);
  const { themePreference, themeTitle, cycleTheme } = useThemePreference();
  const { playerHost, playing, audioReady, toggleAudio } = useFocusAudio();

  const currentZoomOption = useMemo(
    () => resolveZoomOption(activeZoom, MAP_ZOOM_OPTIONS),
    [activeZoom],
  );

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const closeLayerDrawer = useCallback(() => {
    setLayerDrawerOpen(false);
  }, []);

  useDismissibleDrawer({
    open: drawerOpen,
    containerRef: controlZone,
    onClose: closeDrawer,
  });

  useDismissibleDrawer({
    open: layerDrawerOpen,
    containerRef: controlZone,
    onClose: closeLayerDrawer,
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
    setLayerDrawerOpen(false);
  };

  const toggleLayerDrawer = () => {
    setLayerDrawerOpen((value) => !value);
    setDrawerOpen(false);
  };

  return (
    <>
      <div ref={playerHost} className="yt-sink" aria-hidden="true" />
      <div ref={controlZone} className="map-ctrl-zone">
        <MapLayerDrawer
          id={LAYER_DRAWER_ID}
          open={layerDrawerOpen}
          showMapLabels={showMapLabels}
          showTelemetry={showTelemetry}
          showBeams={showRunwayBeams}
          showBadges={showRoutingPointBadges}
          showAirspaceContext={showAirspaceContext}
          telemetryDisabledForTraffic={telemetryDisabledForTraffic}
          telemetryTrafficLimit={telemetryTrafficLimit}
          altitudeFocus={altitudeFocus}
          onToggleMapLabels={onToggleMapLabels}
          onToggleTelemetry={onToggleTelemetry}
          onToggleBeams={onToggleRunwayBeams}
          onToggleBadges={onToggleRoutingPointBadges}
          onToggleAirspaceContext={onToggleAirspaceContext}
          onAltitudeFocus={onAltitudeFocus}
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
          layerDrawerOpen={layerDrawerOpen}
          playing={playing}
          audioReady={audioReady}
          drawerId={DRAWER_ID}
          layerDrawerId={LAYER_DRAWER_ID}
          onCycleZoom={cycleZoom}
          onToggleAudio={toggleAudio}
          onCycleTheme={cycleTheme}
          onToggleDrawer={toggleDrawer}
          onToggleLayerDrawer={toggleLayerDrawer}
        />
      </div>
    </>
  );
}
