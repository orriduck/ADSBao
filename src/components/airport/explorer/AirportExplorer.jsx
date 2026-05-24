"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import AirportSidebar from "@/components/sidebar/AirportSidebar";
import AirportExplorerDesktopSidebar from "./AirportExplorerDesktopSidebar.jsx";
import {
  ExplorerUiProvider,
  useExplorerUi,
} from "@/components/explorer/ExplorerUiContext.jsx";
import AircraftDataLoadingOverlay from "./AircraftDataLoadingOverlay.jsx";
import ExplorerMapMenu from "@/components/explorer/ExplorerMapMenu.jsx";
import {
  resolveAirportExplorerSelection,
  resolveAirportProfile,
} from "@/features/airport/explorer/airportExplorerModel.js";
import { useAirportExplorerData } from "@/features/airport/explorer/useAirportExplorerData.js";
import { useAirportProcedures } from "@/hooks/useAirportProcedures.js";
import { useNearbyAirports } from "@/hooks/useNearbyAirports.js";
import { SelectedAircraftTraceProvider } from "../../aircraft/trace/SelectedAircraftTraceContext.jsx";
import AircraftPreviewCard from "../../aircraft/preview/AircraftPreviewCard.jsx";
import { areCriticalLoadingRequestsSettled } from "@/features/aircraft/positions/aircraftLoadingOverlayModel.js";

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
    <ExplorerUiProvider>
      <AirportExplorerContent {...props} />
    </ExplorerUiProvider>
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
    selectedAirportIcao,
    closeSidebar,
    selectAircraft,
    setSelectedAircraftId,
    selectAirport,
    mapFollowsAircraft,
  } = useExplorerUi();
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
  const selection = useMemo(
    () =>
      resolveAirportExplorerSelection({
        aircraft: traffic.aircraft,
        selectedAircraftId,
        airports: nearbyAirports.airports,
        selectedAirportIcao,
      }),
    [
      nearbyAirports.airports,
      selectedAircraftId,
      selectedAirportIcao,
      traffic.aircraft,
    ],
  );

  useEffect(() => {
    if (!selectedAircraftId) return;
    if (!selection.selectedAircraftStillVisible) setSelectedAircraftId("");
  }, [
    selectedAircraftId,
    selection.selectedAircraftStillVisible,
    setSelectedAircraftId,
  ]);

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
    airports: nearbyAirports.airports,
    focusLat: airportProfile.lat,
    focusLon: airportProfile.lon,
    selectedAircraftId,
    selectedAirportIcao,
    lastUpdated: traffic.lastUpdated,
    feedStatus: traffic.feedStatus,
    feedSource: traffic.feedSource,
    onSelectAircraft: selectAircraft,
    onSelectAirport: selectAirport,
    onBack,
  };
  const criticalLoadingSettled = areCriticalLoadingRequestsSettled({
    aircraftPositionsSettled: traffic.aircraftPositionsSettled,
    metarSettled: weather.metarSettled,
    nearbyAirportsSettled: nearbyAirports.settled,
    proceduresSettled: procedures.settled,
  });

  return (
    <SelectedAircraftTraceProvider selectedAircraft={selection.selectedAircraft}>
      <AircraftPreviewCard
        aircraft={selection.selectedAircraft}
        airport={selection.selectedAirport}
        isMobile={isMobile}
        sidebarOpen={sidebarOpen}
        airportProfile={airportProfile}
        onApplyTemporaryRoute={traffic.applyTemporaryRoute}
      />
      <div
        className={`font-sans text-atc-text ${
          isMobile
            ? "fixed inset-0 z-0 flex overflow-hidden overscroll-none"
            : "flex h-dvh overflow-hidden"
        }`}
      >
        {!isMobile && (
          <AirportExplorerDesktopSidebar
            open={sidebarOpen}
            width={desktopSidebarWidth}
            sidebarProps={sidebarProps}
          />
        )}

        <div className="relative min-w-0 flex-1 overflow-hidden bg-atc-bg">
          {!(isMobile && sidebarOpen) && (
            <ExplorerMapMenu
              feedSource={traffic.feedSource}
              feedStatus={traffic.feedStatus}
              lastUpdated={traffic.lastUpdated}
              routeProvider={traffic.routeProvider}
            />
          )}

          <AirportMap
            icao={airportProfile.icao}
            lat={airportProfile.lat}
            lon={airportProfile.lon}
            zoom={mapZoom}
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
            selectedAirportIcao={selectedAirportIcao}
            followsCenter={mapFollowsAircraft}
            onSelectAircraft={selectAircraft}
            onSelectAirport={selectAirport}
            runwayMap={procedures.runwayMap}
            runwayProcedures={null}
            procedureFixLabelRunwayProcedures={procedures.runwayProcedures}
            showProcedureFixLabels
          />
          <AircraftDataLoadingOverlay
            active={
              !criticalLoadingSettled || traffic.aircraftLoadingOverlayActive
            }
          />

          {isMobile && sidebarOpen && (
            <div className="absolute inset-0 z-[1100]">
              <AirportSidebar {...sidebarProps} onClose={closeSidebar} />
            </div>
          )}
        </div>
      </div>
    </SelectedAircraftTraceProvider>
  );
}
