"use client";

import MapControlBar from "@/components/ui/MapControlBar";
import MobileMapSourceStatus from "./MobileMapSourceStatus";
import { useExplorerUi } from "./ExplorerUiContext";

export default function ExplorerMapMenu({
  feedSource = "",
  feedStatus = "live",
  lastUpdated = null,
  routeProvider = "",
  loadingStatus = "",
  onFitToTrace = null,
  zoomDisabled = false,
} = {}) {
  const {
    isMobile,
    mapZoom,
    mapFollowsAircraft,
    showMapLabels,
    showRunwayBeams,
    showRoutingPointBadges,
    setMapZoom,
    toggleSidebar,
    toggleMapLabels,
    toggleRunwayBeams,
    toggleRoutingPointBadges,
  } = useExplorerUi();

  return (
    <div
      className={`airport-map-menu ${
        isMobile ? "airport-map-menu--mobile" : "airport-map-menu--desktop"
      }`}
    >
      <MapControlBar
        activeZoom={mapZoom}
        zoomActive={mapFollowsAircraft}
        zoomDisabled={zoomDisabled}
        showMapLabels={showMapLabels}
        showRunwayBeams={showRunwayBeams}
        showRoutingPointBadges={showRoutingPointBadges}
        showSidebarToggle={isMobile}
        onZoom={setMapZoom}
        onToggleMapLabels={toggleMapLabels}
        onToggleRunwayBeams={toggleRunwayBeams}
        onToggleRoutingPointBadges={toggleRoutingPointBadges}
        onToggleSidebar={toggleSidebar}
        onFitToTrace={onFitToTrace}
      />

      <MobileMapSourceStatus
        feedSource={feedSource}
        feedStatus={feedStatus}
        lastUpdated={lastUpdated}
        routeProvider={routeProvider}
        loadingStatus={loadingStatus}
      />
    </div>
  );
}
