"use client";

import { PanelLeft } from "lucide-react";
import MapControlBar from "@/components/ui/MapControlBar";
import { useAirportExplorerUi } from "./AirportExplorerUiContext.jsx";

export default function AirportExplorerMapMenu({
  showProcedurePanel = false,
  onToggleProcedurePanel,
}) {
  const {
    isMobile,
    mapZoom,
    showMapLabels,
    showTelemetry,
    setMapZoom,
    toggleSidebar,
    toggleMapLabels,
    toggleTelemetry,
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
        showProcedurePanel={showProcedurePanel}
        showTelemetry={showTelemetry}
        onZoom={setMapZoom}
        onToggleMapLabels={toggleMapLabels}
        onToggleProcedurePanel={onToggleProcedurePanel}
        onToggleTelemetry={toggleTelemetry}
      />
    </div>
  );
}
