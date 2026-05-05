"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import AirportSidebar from "@/components/sidebar/AirportSidebar";
import {
  AirportExplorerUiProvider,
  useAirportExplorerUi,
} from "./AirportExplorerUiContext.jsx";
import AircraftDataLoadingOverlay from "./AircraftDataLoadingOverlay.jsx";
import AirportExplorerMapMenu from "./AirportExplorerMapMenu.jsx";
import { resolveAirportProfile } from "./airportExplorerModel.js";
import { useAirportExplorerData } from "./useAirportExplorerData.js";

const AirportMap = dynamic(() => import("@/components/map/AirportMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-atc-bg font-mono text-[11px] uppercase tracking-[0.2em] text-atc-faint">
      Loading map...
    </div>
  ),
});

export default function AirportExplorer(props) {
  return (
    <AirportExplorerUiProvider>
      <AirportExplorerContent {...props} />
    </AirportExplorerUiProvider>
  );
}

function AirportExplorerContent({ icao = "", airport = null, onBack }) {
  const {
    desktopSidebarWidth,
    sidebarOpen,
    isMobile,
    mapZoom,
    showMapLabels,
    showTelemetry,
    closeSidebar,
  } = useAirportExplorerUi();
  const airportProfile = useMemo(
    () => resolveAirportProfile({ icao, airport }),
    [icao, airport],
  );
  const { weather, traffic } = useAirportExplorerData(airportProfile);

  const sidebarProps = {
    icao: airportProfile.icao,
    iata: airportProfile.iata,
    name: airportProfile.name,
    city: airportProfile.city,
    country: airportProfile.country,
    lat: airportProfile.lat,
    lon: airportProfile.lon,
    metar: weather.metar,
    metarRaw: weather.metarRaw,
    metarLoading: weather.metarLoading,
    metarError: weather.metarError,
    aircraft: traffic.aircraft,
    lastUpdated: traffic.lastUpdated,
    feedStatus: traffic.feedStatus,
    onBack,
  };

  return (
    <div className="flex h-dvh overflow-hidden font-sans text-atc-text">
      {!isMobile && (
        <div
          className="airport-desktop-sidebar shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out"
          style={{ width: sidebarOpen ? desktopSidebarWidth : "0" }}
        >
          <div className="h-full" style={{ width: desktopSidebarWidth }}>
            <AirportSidebar {...sidebarProps} />
          </div>
        </div>
      )}

      <div className="relative min-w-0 flex-1 overflow-hidden bg-atc-bg">
        {!(isMobile && sidebarOpen) && <AirportExplorerMapMenu />}

        <AirportMap
          icao={airportProfile.icao}
          lat={airportProfile.lat}
          lon={airportProfile.lon}
          zoom={mapZoom}
          accent="var(--atc-accent)"
          aircraft={traffic.aircraft}
          airport={airport}
          showMapLabels={showMapLabels}
          showTelemetry={showTelemetry}
        />
        <AircraftDataLoadingOverlay active={traffic.aircraftInitialLoading} />

        {isMobile && sidebarOpen && (
          <div className="absolute inset-0 z-[1100]">
            <AirportSidebar {...sidebarProps} onClose={closeSidebar} />
          </div>
        )}
      </div>
    </div>
  );
}
