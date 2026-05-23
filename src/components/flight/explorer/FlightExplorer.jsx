"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FlightSidebar from "@/components/sidebar/FlightSidebar";
import ExplorerMapMenu from "@/components/explorer/ExplorerMapMenu.jsx";
import LostSignalOverlay from "@/components/aircraft/tracking/LostSignalOverlay.jsx";
import {
  getOrCreateTrackedFlight,
  getTraceCutoffMs,
} from "@/features/aircraft/tracking/trackedFlightStorage.js";
import { buildGreatCirclePath } from "@/features/aviation/flight-routes/greatCircleRouteModel.js";
import { useFlightAwareEnabled } from "@/features/app-shell/auth/useFlightAwareEnabled.js";

// These map helpers import Leaflet, which evaluates `window` at module
// top — SSR-incompatible. Dynamic-import keeps those helpers
// out of the server bundle, same pattern AirportMap uses.
const FlightAwareRouteArc = dynamic(
  () => import("@/components/map/FlightAwareRouteArc.jsx"),
  { ssr: false },
);
const MapFitToTraceController = dynamic(
  () => import("@/components/map/MapFitToTraceController.jsx"),
  { ssr: false },
);
import {
  ExplorerUiProvider,
  useExplorerUi,
} from "@/components/explorer/ExplorerUiContext.jsx";
import { useAircraftPositions } from "@/hooks/useAircraftPositions.js";
import { useFlightRoutes } from "@/hooks/useFlightRoutes.js";
import { useNearbyAirports } from "@/hooks/useNearbyAirports.js";
import { useTrackedAircraft } from "@/hooks/useTrackedAircraft.js";
import { getAircraftIdentity } from "@/features/airport/context/airportContextUiModel.js";
import { normalizeCallsign } from "@/utils/callsign.js";
import { formatFlightRouteLabel } from "@/utils/flightRouteDisplay.js";
import { SelectedAircraftTraceProvider } from "@/components/aircraft/trace/SelectedAircraftTraceContext.jsx";
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
  const flightAwareEnabled = useFlightAwareEnabled();
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
    lostSignal,
  } = useTrackedAircraft(callsign);

  // Anchor the tracking session as soon as we have a callsign so the
  // 12h TTL starts ticking on first load — the hex is recorded once it
  // becomes available so the cache captures the icao24 we anchored on.
  // The cutoff (firstTrackedAt - 30 min) drives trace clipping for the
  // focal aircraft below.
  const [trackingSession, setTrackingSession] = useState(null);
  useEffect(() => {
    if (!callsign) {
      setTrackingSession(null);
      return;
    }
    const session = getOrCreateTrackedFlight(callsign, {
      hex: trackedAircraft?.icao24 || null,
    });
    if (session) setTrackingSession(session);
  }, [callsign, trackedAircraft?.icao24]);
  const focalTraceStartAtMs = useMemo(
    () => getTraceCutoffMs(trackingSession),
    [trackingSession],
  );

  // User can dismiss the lost-signal overlay to keep watching the last
  // known trace. The dismissal resets whenever the feed comes back so a
  // later disappearance still prompts.
  const [lostSignalDismissed, setLostSignalDismissed] = useState(false);
  useEffect(() => {
    if (!lostSignal) setLostSignalDismissed(false);
  }, [lostSignal]);

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
    radiusNm: 40,
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
  const rawAircraft = useMemo(() => {
    if (!trackedAircraft) return nearbyAircraft;
    const trackedKey = getAircraftIdentity(trackedAircraft);
    const alreadyIn = nearbyAircraft.some(
      (entry) => getAircraftIdentity(entry) === trackedKey,
    );
    return alreadyIn ? nearbyAircraft : [trackedAircraft, ...nearbyAircraft];
  }, [trackedAircraft, nearbyAircraft]);

  // Look up routes for the tracked aircraft and any nearby traffic the user
  // might preview. No airport context on this page — the cache key is just
  // the callsign — and the same hook gives us the applyTemporaryRoute
  // callback so the preview-card feedback form can splice an override into
  // the in-memory cache without a refetch.
  const { routesByCallsign, applyTemporaryRoute } = useFlightRoutes(
    rawAircraft,
    { routeProvider: flightAwareEnabled ? "flightaware" : "" },
  );

  const aircraft = useMemo(
    () =>
      rawAircraft.map((item) => {
        const key = normalizeCallsign(item.callsign);
        const route = key ? routesByCallsign[key] || null : null;
        return {
          ...item,
          flightRoute: route,
          flightRouteLabel: formatFlightRouteLabel(route),
        };
      }),
    [rawAircraft, routesByCallsign],
  );

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

  // The sidebar reads `aircraft.flightRoute` / `flightRouteLabel` to paint
  // the route header. `trackedAircraft` straight out of useTrackedAircraft
  // has no route fields — we hand it the enriched entry from the same
  // array we already fed routes into, so the sidebar shows the route
  // (community-feedback override or adsbdb) for the focal callsign.
  const enrichedTrackedAircraft = useMemo(() => {
    if (!trackedAircraft) return null;
    const trackedKey = getAircraftIdentity(trackedAircraft);
    return (
      aircraft.find((item) => getAircraftIdentity(item) === trackedKey) ||
      trackedAircraft
    );
  }, [aircraft, trackedAircraft]);
  const focalFlightAwareRoutePath = useMemo(() => {
    const route = enrichedTrackedAircraft?.flightRoute;
    if (route?.source !== "flightaware") return [];
    return buildGreatCirclePath({
      from: { lat: focalLat, lon: focalLon },
      to: route.destination,
    });
  }, [enrichedTrackedAircraft?.flightRoute, focalLat, focalLon]);

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
    aircraft: enrichedTrackedAircraft,
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
      fullTraceForFocal
      focalTraceStartAtMs={focalTraceStartAtMs}
      focalPersistKey={callsign || null}
    >
      <AircraftPreviewCard
        aircraft={selectedAircraft}
        airport={selectedAirport}
        isMobile={isMobile}
        sidebarOpen={sidebarOpen}
        onApplyTemporaryRoute={applyTemporaryRoute}
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
            focalRangeRings={false}
            nearbyRangeRings={{ intervalNm: 5, maxNm: 5, prominent: true }}
          >
            <FlightAwareRouteArc path={focalFlightAwareRoutePath} />
            <MapFitToTraceController
              routePath={focalFlightAwareRoutePath}
            />
          </AirportMap>

          {isMobile && sidebarOpen && (
            <div className="absolute inset-0 z-[1100]">
              <FlightSidebar {...sidebarProps} onClose={closeSidebar} />
            </div>
          )}

          {lostSignal && !lostSignalDismissed && (
            <LostSignalOverlay
              callsign={callsign}
              onAcknowledge={() => setLostSignalDismissed(true)}
              onBackHome={handleBack}
            />
          )}
        </div>
      </div>
    </SelectedAircraftTraceProvider>
  );
}
