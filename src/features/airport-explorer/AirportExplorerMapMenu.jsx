"use client";

import { PanelLeft } from "lucide-react";
import MapControlBar from "@/components/ui/MapControlBar";
import { useAirportExplorerUi } from "./AirportExplorerUiContext.jsx";

export default function AirportExplorerMapMenu() {
  const {
    isMobile,
    mapZoom,
    showMapLabels,
    showTelemetry,
    showRunwayBeams,
    showRunwayBadges,
    setMapZoom,
    toggleSidebar,
    toggleMapLabels,
    toggleTelemetry,
    toggleRunwayBeams,
    toggleRunwayBadges,
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
        showTelemetry={showTelemetry}
        showRunwayBeams={showRunwayBeams}
        showRunwayBadges={showRunwayBadges}
        onZoom={setMapZoom}
        onToggleMapLabels={toggleMapLabels}
        onToggleTelemetry={toggleTelemetry}
        onToggleRunwayBeams={toggleRunwayBeams}
        onToggleRunwayBadges={toggleRunwayBadges}
      />
    </div>
  );
}
