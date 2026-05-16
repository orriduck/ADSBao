"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { MAP_ZOOM_OPTIONS } from "../../config/mapControls.js";
import { useThemePreference } from "../../features/app-shell/useThemePreference.js";
import MapControlRail from "../../features/airport/map-controls/MapControlRail.jsx";
import MapLayerDrawer from "../../features/airport/map-controls/MapLayerDrawer.jsx";
import {
  getNextZoomValue,
  resolveZoomOption,
} from "../../features/airport/map-controls/mapControlModel.js";
import { useDismissibleDrawer } from "../../features/airport/map-controls/useDismissibleDrawer.js";
import { useFocusAudio } from "../../features/airport/map-controls/useFocusAudio.js";
import { ZOOM_AIRPORT } from "../../utils/airportMapDisplay.js";

const LAYER_DRAWER_ID = "map-layer-drawer";

export default function MapControlBar({
  activeZoom = ZOOM_AIRPORT,
  showMapLabels = false,
  showRunwayBeams = true,
  showRoutingPointBadges = true,
  onZoom,
  onToggleMapLabels,
  onToggleRunwayBeams,
  onToggleRoutingPointBadges,
}) {
  const controlZone = useRef(null);
  const [layerDrawerOpen, setLayerDrawerOpen] = useState(false);
  const { themePreference, themeTitle, cycleTheme } = useThemePreference();
  const { playerHost, playing, audioReady, toggleAudio } = useFocusAudio();

  const currentZoomOption = useMemo(
    () => resolveZoomOption(activeZoom, MAP_ZOOM_OPTIONS),
    [activeZoom],
  );

  const closeLayerDrawer = useCallback(() => {
    setLayerDrawerOpen(false);
  }, []);

  useDismissibleDrawer({
    open: layerDrawerOpen,
    containerRef: controlZone,
    onClose: closeLayerDrawer,
  });

  const cycleZoom = () => {
    onZoom?.(getNextZoomValue(activeZoom, MAP_ZOOM_OPTIONS));
  };

  const toggleLayerDrawer = () => {
    setLayerDrawerOpen((value) => !value);
  };

  return (
    <>
      <div ref={playerHost} className="yt-sink" aria-hidden="true" />
      <div ref={controlZone} className="map-ctrl-zone">
        <MapLayerDrawer
          id={LAYER_DRAWER_ID}
          open={layerDrawerOpen}
          showMapLabels={showMapLabels}
          showBeams={showRunwayBeams}
          showBadges={showRoutingPointBadges}
          onToggleMapLabels={onToggleMapLabels}
          onToggleBeams={onToggleRunwayBeams}
          onToggleBadges={onToggleRoutingPointBadges}
        />

        <MapControlRail
          currentZoomOption={currentZoomOption}
          currentTheme={themePreference}
          themeTitle={themeTitle}
          layerDrawerOpen={layerDrawerOpen}
          playing={playing}
          audioReady={audioReady}
          layerDrawerId={LAYER_DRAWER_ID}
          onCycleZoom={cycleZoom}
          onToggleAudio={toggleAudio}
          onCycleTheme={cycleTheme}
          onToggleLayerDrawer={toggleLayerDrawer}
        />
      </div>
    </>
  );
}
