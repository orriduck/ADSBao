"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { MAP_ZOOM_OPTIONS } from "../../config/mapControls";
import { useThemePreference } from "../../features/app-shell/useThemePreference";
import MapControlRail from "@/components/map/controls/MapControlRail";
import MapLayerDrawer from "@/components/map/controls/MapLayerDrawer";
import {
  getNextZoomValue,
  resolveZoomOption,
} from "../../features/airport/map-controls/mapControlModel";
import { useDismissibleDrawer } from "../../features/airport/map-controls/useDismissibleDrawer";
import { ZOOM_AIRPORT } from "../../utils/airportMapDisplay";

const LAYER_DRAWER_ID = "map-layer-drawer";

export default function MapControlBar({
  activeZoom = ZOOM_AIRPORT,
  zoomActive = true,
  zoomDisabled = false,
  showMapLabels = false,
  showRunwayBeams = true,
  showNavaidMarkers = false,
  userLocationActive = false,
  userLocationPending = false,
  userLocationNotice = "",
  showSidebarToggle = true,
  onZoom,
  onToggleMapLabels,
  onToggleRunwayBeams,
  onToggleNavaidMarkers,
  onLocateUser = null,
  onToggleSidebar,
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
        showNavaidMarkers={showNavaidMarkers}
        userLocationActive={userLocationActive}
        userLocationPending={userLocationPending}
        userLocationNotice={userLocationNotice}
        onToggleMapLabels={onToggleMapLabels}
        onToggleBeams={onToggleRunwayBeams}
        onToggleNavaidMarkers={onToggleNavaidMarkers}
        onLocateUser={onLocateUser}
      />

      <MapControlRail
        currentZoomOption={currentZoomOption}
        zoomActive={zoomActive}
        zoomDisabled={zoomDisabled}
        currentTheme={themePreference}
        themeTitle={themeTitle}
        layerDrawerOpen={layerDrawerOpen}
        layerDrawerId={LAYER_DRAWER_ID}
        showSidebarToggle={showSidebarToggle}
        onToggleSidebar={onToggleSidebar}
        onCycleZoom={cycleZoom}
        onFitToTrace={onFitToTrace}
        onCycleTheme={cycleTheme}
        onToggleLayerDrawer={toggleLayerDrawer}
      />
    </div>
  );
}
