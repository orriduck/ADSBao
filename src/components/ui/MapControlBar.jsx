"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { MAP_ZOOM_OPTIONS } from "../../config/mapControls.js";
import { useThemePreference } from "../../features/app-shell/useThemePreference.js";
import MapControlRail from "@/components/map/controls/MapControlRail.jsx";
import MapLayerDrawer from "@/components/map/controls/MapLayerDrawer.jsx";
import {
  getNextZoomValue,
  resolveZoomOption,
} from "../../features/airport/map-controls/mapControlModel.js";
import { useDismissibleDrawer } from "../../features/airport/map-controls/useDismissibleDrawer.js";
import { ZOOM_AIRPORT } from "../../utils/airportMapDisplay.js";

const LAYER_DRAWER_ID = "map-layer-drawer";

export default function MapControlBar({
  activeZoom = ZOOM_AIRPORT,
  zoomActive = true,
  showMapLabels = false,
  showRunwayBeams = true,
  showRoutingPointBadges = true,
  onZoom,
  onToggleMapLabels,
  onToggleRunwayBeams,
  onToggleRoutingPointBadges,
  onFitToTrace = null,
}) {
  const controlZone = useRef(null);
  const [layerDrawerOpen, setLayerDrawerOpen] = useState(false);
  const { themePreference, themeTitle, cycleTheme } = useThemePreference();

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

  const toggleLayerDrawer = () => {
    setLayerDrawerOpen((value) => !value);
  };

  return (
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
        zoomActive={zoomActive}
        currentTheme={themePreference}
        themeTitle={themeTitle}
        layerDrawerOpen={layerDrawerOpen}
        layerDrawerId={LAYER_DRAWER_ID}
        onCycleZoom={cycleZoom}
        onFitToTrace={onFitToTrace}
        onCycleTheme={cycleTheme}
        onToggleLayerDrawer={toggleLayerDrawer}
      />
    </div>
  );
}
