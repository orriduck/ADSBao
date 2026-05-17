"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import FlightSidebar from "@/components/sidebar/FlightSidebar";
import ExplorerMapMenu from "@/components/explorer/ExplorerMapMenu.jsx";

// MapFitToTraceController imports leaflet, which evaluates `window` at
// module top — SSR-incompatible. Dynamic-import keeps the controller
// out of the server bundle, same pattern AirportMap uses.
const MapFitToTraceController = dynamic(
  () => import("@/components/map/MapFitToTraceController.jsx"),
  { ssr: false },
);
import {
  ExplorerUiProvider,
  useExplorerUi,
} from "@/components/explorer/ExplorerUiContext.jsx";
import { useAircraftPositions } from "@/hooks/useAircraftPositions.js";
import { useNearbyAirports } from "@/hooks/useNearbyAirports.js";
import { useTrackedAircraft } from "@/hooks/useTrackedAircraft.js";
import { getAircraftIdentity } from "@/features/airport/context/airportContextUiModel.js";
import { SelectedAircraftTraceProvider } from "@/components/aircraft/trace/SelectedAircraftTraceContext.jsx";
import TraceLoadingToast from "@/components/aircraft/trace/TraceLoadingToast.jsx";
import AircraftPreviewCard from "@/components/aircraft/preview/AircraftPreviewCard.jsx";

const AirportMap = dynamic(() => import("@/components/map/AirportMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-atc-bg font-mono text-[11px] uppercase tracking-[0.2em] text-atc-faint">
      Loading map...
    </div>
  ),
});

export default function FlightExplorer({ callsign = "" }) {
  return (
    <ExplorerUiProvider>
      <FlightExplorerContent callsign={callsign} />
    </ExplorerUiProvider>
  );
}

function FlightExplorerContent({ callsign }) {
  const router = useRouter();
  const {
    desktopSidebarWidth,
    sidebarOpen,
    isMobile,
    mapZoom,
    showMapLabels,
    trafficFilter,
    typeFilter,
    altitudeLevel,
    selectedAircraftId,
    selectedAirportIcao,
    closeSidebar,
    selectAircraft,
    setSelectedAircraftId,
    selectAirport,
    toggleMapLabels,
    fitToTrace,
    mapFollowsAircraft,
  } = useExplorerUi();

  // Default-on location labels for the flight page: when tracking a
  // specific aircraft cross-country the place names give the moving map
  // useful context, so the labels start visible (user can still toggle
  // off via the map control). Effect fires once via the ref guard so
  // subsequent toggles aren't clobbered.
  const labelsInitializedRef = useRef(false);
  useEffect(() => {
    if (labelsInitializedRef.current) return;
    labelsInitializedRef.current = true;
    if (!showMapLabels) toggleMapLabels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    aircraft: trackedAircraft,
    feedSource,
    lastUpdated,
  } = useTrackedAircraft(callsign);

  // Keep the last known position around so the map doesn't snap back when
  // the tracked aircraft is briefly absent from the feed.
  const lastKnownRef = useRef({ lat: null, lon: null });
  if (
    trackedAircraft?.lat != null &&
    Number.isFinite(Number(trackedAircraft.lat)) &&
    trackedAircraft?.lon != null &&
    Number.isFinite(Number(trackedAircraft.lon))
  ) {
    lastKnownRef.current = {
      lat: Number(trackedAircraft.lat),
      lon: Number(trackedAircraft.lon),
    };
  }
  const focalLat = lastKnownRef.current.lat;
  const focalLon = lastKnownRef.current.lon;

  const { aircraft: nearbyAircraft } = useAircraftPositions(
    callsign || "",
    focalLat,
    focalLon,
  );

  // Pull airports around the focal so the sidebar list and the map's
  // airport layer both show context relative to the moving flight.
  const { airports: nearbyAirports } = useNearbyAirports({
    lat: focalLat || 0,
    lon: focalLon || 0,
    radiusNm: 80,
    limit: 12,
  });

  const selectedAirport = useMemo(
    () =>
      nearbyAirports.find(
        (airport) => airport?.icao === selectedAirportIcao,
      ) || null,
    [nearbyAirports, selectedAirportIcao],
  );

  // Merge tracked aircraft into the nearby list so the map always renders
  // it (the radius poll can lag a beat behind the callsign poll).
  const aircraft = useMemo(() => {
    if (!trackedAircraft) return nearbyAircraft;
    const trackedKey = getAircraftIdentity(trackedAircraft);
    const alreadyIn = nearbyAircraft.some(
      (entry) => getAircraftIdentity(entry) === trackedKey,
    );
    return alreadyIn ? nearbyAircraft : [trackedAircraft, ...nearbyAircraft];
  }, [trackedAircraft, nearbyAircraft]);

  // Default the selection to the focal aircraft so its trace appears on
  // load. Once the user clicks around it's their choice.
  const focalKey = trackedAircraft
    ? getAircraftIdentity(trackedAircraft)
    : "";
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || !focalKey) return;
    seededRef.current = true;
    setSelectedAircraftId(focalKey);
  }, [focalKey, setSelectedAircraftId]);

  const selectedAircraft = useMemo(
    () =>
      aircraft.find(
        (item) => getAircraftIdentity(item) === selectedAircraftId,
      ) || null,
    [aircraft, selectedAircraftId],
  );

  useEffect(() => {
    if (!isMobile) return undefined;
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [isMobile]);

  const handleBack = () => router.push("/");

  const sidebarProps = {
    callsign,
    aircraft: trackedAircraft,
    nearbyAircraft: aircraft,
    nearbyAirports,
    focusLat: focalLat,
    focusLon: focalLon,
    selectedAircraftId,
    selectedAirportIcao,
    onSelectAircraft: selectAircraft,
    onSelectAirport: selectAirport,
    feedSource,
    lastUpdated,
    onBack: handleBack,
  };

  return (
    <SelectedAircraftTraceProvider
      selectedAircraft={selectedAircraft}
      focalAircraft={trackedAircraft}
    >
      <TraceLoadingToast />
      <AircraftPreviewCard
        aircraft={selectedAircraft}
        airport={selectedAirport}
        isMobile={isMobile}
        sidebarOpen={sidebarOpen}
      />
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
              <FlightSidebar {...sidebarProps} />
            </div>
          </div>
        )}

        <div className="relative min-w-0 flex-1 overflow-hidden bg-atc-bg">
          {!(isMobile && sidebarOpen) && (
            <ExplorerMapMenu onFitToTrace={fitToTrace} />
          )}
          <AirportMap
            icao=""
            lat={focalLat || 0}
            lon={focalLon || 0}
            zoom={mapZoom}
            aircraft={aircraft}
            nearbyAirports={nearbyAirports}
            airport={null}
            showMapLabels={showMapLabels}
            showRunwayBeams={false}
            showRoutingPointBadges={false}
            trafficFilter={trafficFilter}
            typeFilter={typeFilter}
            altitudeLevel={altitudeLevel}
            selectedAircraftId={selectedAircraftId}
            selectedAirportIcao={selectedAirportIcao}
            focalAircraftId={focalKey}
            followsCenter={mapFollowsAircraft}
            onSelectAircraft={selectAircraft}
            onSelectAirport={selectAirport}
            runwayMap={null}
            runwayProcedures={null}
            procedureFixLabelRunwayProcedures={null}
            showProcedureFixLabels={false}
          >
            <MapFitToTraceController />
          </AirportMap>

          {isMobile && sidebarOpen && (
            <div className="absolute inset-0 z-[1100]">
              <FlightSidebar {...sidebarProps} onClose={closeSidebar} />
            </div>
          )}
        </div>
      </div>
    </SelectedAircraftTraceProvider>
  );
}
