"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import AirportSidebar from "@/components/sidebar/AirportSidebar";
import {
  AirportExplorerUiProvider,
  useAirportExplorerUi,
} from "./AirportExplorerUiContext.jsx";
import AircraftDataLoadingOverlay from "./AircraftDataLoadingOverlay.jsx";
import AirportExplorerMapMenu from "./AirportExplorerMapMenu.jsx";
import { resolveAirportProfile } from "./airportExplorerModel.js";
import { useAirportExplorerData } from "./useAirportExplorerData.js";
import { useAirportProcedures } from "../../hooks/useAirportProcedures.js";
import { useNearbyAirports } from "../../hooks/useNearbyAirports.js";
import { useAircraftTrace } from "../../hooks/useAircraftTrace.js";

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
    showRunwayBeams,
    showRoutingPointBadges,
    trafficFilter,
    typeFilter,
    altitudeLevel,
    selectedAircraftId,
    closeSidebar,
    selectAircraft,
    setSelectedAircraftId,
  } = useAirportExplorerUi();
  const airportProfile = useMemo(
    () => resolveAirportProfile({ icao, airport }),
    [icao, airport],
  );
  const { weather, traffic } = useAirportExplorerData(airportProfile);
  const procedures = useAirportProcedures(airportProfile.icao);
  const nearbyAirports = useNearbyAirports({
    icao: airportProfile.icao,
    lat: airportProfile.lat,
    lon: airportProfile.lon,
  });
  const selectedAircraft = useMemo(
    () =>
      traffic.aircraft.find(
        (item) => (item.icao24 || item.callsign) === selectedAircraftId,
      ) || null,
    [selectedAircraftId, traffic.aircraft],
  );
  const { tracePoints: selectedAircraftTrace } = useAircraftTrace(
    selectedAircraft,
  );

  useEffect(() => {
    if (!selectedAircraftId) return;
    const stillVisible = traffic.aircraft.some(
      (item) => (item.icao24 || item.callsign) === selectedAircraftId,
    );
    if (!stillVisible) setSelectedAircraftId("");
  }, [selectedAircraftId, setSelectedAircraftId, traffic.aircraft]);

  useEffect(() => {
    if (!isMobile) return undefined;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyOverscroll = document.body.style.overscrollBehavior;
    const originalHtmlOverscroll =
      document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overscrollBehavior = originalBodyOverscroll;
      document.documentElement.style.overscrollBehavior = originalHtmlOverscroll;
    };
  }, [isMobile]);

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
    selectedAircraftId,
    lastUpdated: traffic.lastUpdated,
    feedStatus: traffic.feedStatus,
    feedSource: traffic.feedSource,
    onSelectAircraft: selectAircraft,
    onBack,
  };

  return (
    <div
      className={`font-sans text-atc-text ${
        isMobile
          ? "fixed inset-0 z-0 flex overflow-hidden overscroll-none"
          : "flex h-dvh overflow-hidden"
      }`}
    >
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
          nearbyAirports={nearbyAirports.airports}
          airport={airport}
          showMapLabels={showMapLabels}
          showRunwayBeams={showRunwayBeams}
          showRoutingPointBadges={showRoutingPointBadges}
          trafficFilter={trafficFilter}
          typeFilter={typeFilter}
          altitudeLevel={altitudeLevel}
          selectedAircraftId={selectedAircraftId}
          selectedAircraftTrace={selectedAircraftTrace}
          onSelectAircraft={selectAircraft}
          runwayMap={procedures.runwayMap}
          runwayProcedures={null}
          procedureFixLabelRunwayProcedures={procedures.runwayProcedures}
          showProcedureFixLabels
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
