"use client";

import { PanelLeft } from "lucide-react";
import MapControlBar from "@/components/ui/MapControlBar";
import { useAirportExplorerUi } from "./AirportExplorerUiContext.jsx";

export default function AirportExplorerMapMenu() {
  const {
    isMobile,
    mapZoom,
    showMapLabels,
    showRunwayBeams,
    showRoutingPointBadges,
    showAirspaceContext,
    setMapZoom,
    toggleSidebar,
    toggleMapLabels,
    toggleRunwayBeams,
    toggleRoutingPointBadges,
    toggleAirspaceContext,
  } = useAirportExplorerUi();

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
        aria-label="Toggle sidebar"
      >
        <PanelLeft className="h-4 w-4" />
      </button>

      <MapControlBar
        activeZoom={mapZoom}
        showMapLabels={showMapLabels}
        showRunwayBeams={showRunwayBeams}
        showRoutingPointBadges={showRoutingPointBadges}
        showAirspaceContext={showAirspaceContext}
        onZoom={setMapZoom}
        onToggleMapLabels={toggleMapLabels}
        onToggleRunwayBeams={toggleRunwayBeams}
        onToggleRoutingPointBadges={toggleRoutingPointBadges}
        onToggleAirspaceContext={toggleAirspaceContext}
      />
    </div>
  );
}
