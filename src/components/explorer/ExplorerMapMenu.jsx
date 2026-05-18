"use client";

import { PanelLeft } from "lucide-react";
import MapControlBar from "@/components/ui/MapControlBar";
import { useExplorerUi } from "./ExplorerUiContext.jsx";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";

export default function ExplorerMapMenu({ onFitToTrace = null } = {}) {
  const { t } = useI18n();
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
      <button
        type="button"
        onClick={toggleSidebar}
        className="airport-map-menu-toggle"
        aria-label={t("map.toggleSidebar")}
      >
        <PanelLeft className="h-4 w-4" />
      </button>

      <MapControlBar
        activeZoom={mapZoom}
        zoomActive={mapFollowsAircraft}
        showMapLabels={showMapLabels}
        showRunwayBeams={showRunwayBeams}
        showRoutingPointBadges={showRoutingPointBadges}
        onZoom={setMapZoom}
        onToggleMapLabels={toggleMapLabels}
        onToggleRunwayBeams={toggleRunwayBeams}
        onToggleRoutingPointBadges={toggleRoutingPointBadges}
        onFitToTrace={onFitToTrace}
      />
    </div>
  );
}
