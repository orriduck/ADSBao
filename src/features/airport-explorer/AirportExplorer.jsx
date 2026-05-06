"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import AirportSidebar from "@/components/sidebar/AirportSidebar";
import {
  AirportExplorerUiProvider,
  useAirportExplorerUi,
} from "./AirportExplorerUiContext.jsx";
import AircraftDataLoadingOverlay from "./AircraftDataLoadingOverlay.jsx";
import AirportExplorerMapMenu from "./AirportExplorerMapMenu.jsx";
import { resolveAirportProfile } from "./airportExplorerModel.js";
import { useAirportExplorerData } from "./useAirportExplorerData.js";
import ProcedureInspectorControls from "../airport-map/ProcedureInspectorControls.jsx";
import {
  buildVisibleProcedurePayload,
  DEFAULT_PROCEDURE_PHASES,
  resolveProcedureInspectorState,
} from "../airport-map/procedureInspectorModel.js";
import { useAirportProcedures } from "../../hooks/useAirportProcedures.js";

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
  const procedures = useAirportProcedures(airportProfile.icao);
  const [procedurePanelOpen, setProcedurePanelOpen] = useState(false);
  const [procedureInspector, setProcedureInspector] = useState({
    selectedRunway: "",
    selectedProcedureCode: "",
    showTransitions: false,
    showMissed: false,
    showFixLabels: false,
    allProceduresDebug: false,
  });
  const {
    selectedRunway,
    selectedProcedureCode,
    showTransitions,
    showMissed,
    showFixLabels,
    allProceduresDebug,
  } = procedureInspector;

  const visibleProcedurePhases = useMemo(
    () => [
      ...DEFAULT_PROCEDURE_PHASES,
      ...(showTransitions ? ["transition"] : []),
      ...(showMissed ? ["missed"] : []),
    ],
    [showMissed, showTransitions],
  );

  useEffect(() => {
    const resolved = resolveProcedureInspectorState(
      procedures.runwayProcedures,
      {
        selectedRunway,
        selectedProcedureCode,
      },
    );
    if (
      resolved.selectedRunway === selectedRunway &&
      resolved.selectedProcedureCode === selectedProcedureCode
    ) {
      return;
    }

    setProcedureInspector((current) => ({
      ...current,
      ...resolved,
    }));
  }, [
    procedures.runwayProcedures,
    selectedProcedureCode,
    selectedRunway,
  ]);

  const visibleRunwayProcedures = useMemo(
    () =>
      buildVisibleProcedurePayload(procedures.runwayProcedures, {
        selectedRunway,
        selectedProcedureCode,
        visiblePhases: visibleProcedurePhases,
        allProceduresDebug,
      }),
    [
      procedures.runwayProcedures,
      allProceduresDebug,
      selectedProcedureCode,
      selectedRunway,
      visibleProcedurePhases,
    ],
  );

  const handleSelectRunway = (runway) => {
    setProcedureInspector((current) => {
      const resolved = resolveProcedureInspectorState(
        procedures.runwayProcedures,
        {
          ...current,
          selectedRunway: runway,
        },
      );
      return {
        ...current,
        ...resolved,
        allProceduresDebug: false,
      };
    });
  };

  const handleSelectProcedure = (procedureCode) => {
    setProcedureInspector((current) => ({
      ...current,
      selectedProcedureCode: procedureCode,
      allProceduresDebug: false,
    }));
  };

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
    lastUpdated: traffic.lastUpdated,
    feedStatus: traffic.feedStatus,
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
        {!(isMobile && sidebarOpen) && (
          <AirportExplorerMapMenu
            showProcedurePanel={procedurePanelOpen}
            onToggleProcedurePanel={() =>
              setProcedurePanelOpen((current) => !current)
            }
          />
        )}
        {procedurePanelOpen && !(isMobile && sidebarOpen) && (
          <ProcedureInspectorControls
            runwayProcedures={procedures.runwayProcedures}
            selectedRunway={selectedRunway}
            selectedProcedureCode={selectedProcedureCode}
            showTransitions={showTransitions}
            showMissed={showMissed}
            showFixLabels={showFixLabels}
            allProceduresDebug={allProceduresDebug}
            onSelectRunway={handleSelectRunway}
            onSelectProcedure={handleSelectProcedure}
            onToggleTransitions={() =>
              setProcedureInspector((current) => ({
                ...current,
                showTransitions: !current.showTransitions,
              }))
            }
            onToggleMissed={() =>
              setProcedureInspector((current) => ({
                ...current,
                showMissed: !current.showMissed,
              }))
            }
            onToggleFixLabels={() =>
              setProcedureInspector((current) => ({
                ...current,
                showFixLabels: !current.showFixLabels,
              }))
            }
            onToggleAllProceduresDebug={() =>
              setProcedureInspector((current) => ({
                ...current,
                allProceduresDebug: !current.allProceduresDebug,
              }))
            }
          />
        )}

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
          runwayMap={procedures.runwayMap}
          runwayProcedures={visibleRunwayProcedures}
          showProcedureFixLabels={showFixLabels}
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
