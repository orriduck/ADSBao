"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FlightSidebar from "@/components/sidebar/FlightSidebar";
import ExplorerMapMenu from "@/components/explorer/ExplorerMapMenu";
import {
  MapLoadingFallback,
  useMapLoadingOverlayText,
} from "@/components/map/MapLoadingOverlay";
import LostSignalToast from "@/components/aircraft/tracking/LostSignalToast";
import {
  getOrCreateTrackedFlight,
  getTraceCutoffMs,
} from "@/features/aircraft/tracking/trackedFlightStorage";
import {
  getTrackedFlightTraceRefreshKey,
} from "@/features/aircraft/tracking/lostSignalTrackingModel";
import {
  getFlightAwareFallbackAutoFitKey,
  getFlightAwareFallbackTraceStartAtMs,
} from "@/features/aircraft/tracking/flightAwareFallbackTrackingModel";
import {
  getFlightTrackingContextPosition,
  shouldShowFlightTrackingLoadingOverlay,
} from "@/features/aircraft/tracking/flightTrackingContextModel";
import {
  resolveFlightTrackingDisplayContext,
} from "@/features/aircraft/tracking/flightTrackingDisplayModel";
import { buildGreatCirclePath } from "@/features/aviation/flight-routes/greatCircleRouteModel";
import { useFlightAwareEnabled } from "@/features/app-shell/auth/useFlightAwareEnabled";
import { resolveRouteProvider } from "@/features/aviation/sourceDisplayModel";
import { mergeTrackedAircraftIntoNearby } from "@/features/airport/explorer/airportExplorerModel";
import { AIRCRAFT_TRAFFIC_CONFIG } from "@/config/aviation";
import {
  mergeTrackedFlightMetadata,
  readTrackedFlightMetadata,
  writeTrackedFlightMetadata,
} from "@/features/aircraft/tracking/trackedFlightMetadataStorage";

// These map helpers import Leaflet, which evaluates `window` at module
// top — SSR-incompatible. Dynamic-import keeps those helpers
// out of the server bundle, same pattern AirportMap uses.
const FlightAwareRouteArc = dynamic(
  () => import("@/components/map/FlightAwareRouteArc"),
  { ssr: false },
);
const MapFitToTraceController = dynamic(
  () => import("@/components/map/MapFitToTraceController"),
  { ssr: false },
);
import {
  ExplorerUiProvider,
  useExplorerUi,
} from "@/components/explorer/ExplorerUiContext";
import { useAircraftPositions } from "@/hooks/useAircraftPositions";
import { useFlightRoutes } from "@/hooks/useFlightRoutes";
import { useNearbyAirports } from "@/hooks/useNearbyAirports";
import { useTrackedAircraft } from "@/hooks/useTrackedAircraft";
import { getAircraftIdentity } from "@/features/airport/context/airportContextUiModel";
import { normalizeCallsign } from "@/utils/callsign";
import { formatFlightRouteLabel } from "@/utils/flightRouteDisplay";
import { getDistanceNm } from "@/utils/aircraftTrafficIntent";
import { SelectedAircraftTraceProvider } from "@/components/aircraft/trace/SelectedAircraftTraceContext";
import AircraftPreviewCard from "@/components/aircraft/preview/AircraftPreviewCard";
import { resolveAircraftLoadingOverlayState } from "@/features/aircraft/positions/aircraftLoadingOverlayModel";

const AirportMap = dynamic(() => import("@/components/map/AirportMap"), {
  ssr: false,
  loading: () => <MapLoadingFallback variant="flight" />,
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
  const routeProvider = resolveRouteProvider({ flightAwareEnabled });
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
    suspendMapFollow,
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
    loadingOverlayActive: trackedLoadingOverlayActive,
    settled: trackedAircraftSettled,
    lostSignal,
    pollVersion: trackedPollVersion,
    visibilityRefreshVersion: trackedVisibilityRefreshVersion,
    trackingState,
  } = useTrackedAircraft(callsign);
  const [cachedTrackedMetadata, setCachedTrackedMetadata] = useState(null);
  useEffect(() => {
    setCachedTrackedMetadata(readTrackedFlightMetadata(callsign));
  }, [callsign]);
  const trackedAircraftForDisplay = useMemo(
    () =>
      mergeTrackedFlightMetadata({
        aircraft: trackedAircraft,
        metadata: cachedTrackedMetadata,
      }),
    [cachedTrackedMetadata, trackedAircraft],
  );

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
      hex: trackedAircraftForDisplay?.icao24 || null,
    });
    if (session) setTrackingSession(session);
  }, [callsign, trackedAircraftForDisplay?.icao24]);
  const focalTraceStartAtMs = useMemo(
    () =>
      getFlightAwareFallbackTraceStartAtMs({
        trackingState,
        defaultTraceStartAtMs: getTraceCutoffMs(trackingSession),
      }),
    [trackingSession, trackingState],
  );
  const flightAwareAutoFitKey = useMemo(
    () =>
      getFlightAwareFallbackAutoFitKey({
        trackingState,
        callsign,
        aircraftHex: trackedAircraftForDisplay?.icao24,
      }),
    [callsign, trackedAircraftForDisplay?.icao24, trackingState],
  );
  const focalTraceRefreshKey = useMemo(
    () =>
      getTrackedFlightTraceRefreshKey({
        lostSignal,
        pollVersion: trackedPollVersion,
        visibilityRefreshVersion: trackedVisibilityRefreshVersion,
        trackingState,
        pollMs: AIRCRAFT_TRAFFIC_CONFIG.pollMs,
        flightAwareTraceRefreshMs:
          AIRCRAFT_TRAFFIC_CONFIG.flightAwareTraceRefreshMs,
      }),
    [
      lostSignal,
      trackedPollVersion,
      trackedVisibilityRefreshVersion,
      trackingState,
    ],
  );

  // User can dismiss the lost-signal toast to keep watching the last
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
    trackedAircraftForDisplay?.lat != null &&
    Number.isFinite(Number(trackedAircraftForDisplay.lat)) &&
    trackedAircraftForDisplay?.lon != null &&
    Number.isFinite(Number(trackedAircraftForDisplay.lon))
  ) {
    lastKnownRef.current = {
      lat: Number(trackedAircraftForDisplay.lat),
      lon: Number(trackedAircraftForDisplay.lon),
    };
  }
  const focalLat = lastKnownRef.current.lat;
  const focalLon = lastKnownRef.current.lon;
  const contextPosition = useMemo(
    () =>
      getFlightTrackingContextPosition({
        lat: focalLat,
        lon: focalLon,
      }),
    [focalLat, focalLon],
  );
  const contextLat = contextPosition?.lat ?? null;
  const contextLon = contextPosition?.lon ?? null;
  const flightDisplayContext: Record<string, any> = useMemo(
    () =>
      resolveFlightTrackingDisplayContext({
        trackingState,
        isMobile,
      }),
    [isMobile, trackingState],
  );
  const showNearbyContext = Boolean(flightDisplayContext.showNearbyContext !== false);
  const showNearbyMapContext =
    flightDisplayContext.showNearbyMapContext !== false;
  const nearbyQueryLat = showNearbyContext ? contextLat : null;
  const nearbyQueryLon = showNearbyContext ? contextLon : null;

  const {
    aircraft: fetchedNearbyAircraft,
    loading: fetchedNearbyAircraftLoading,
    settled: fetchedNearbyAircraftSettled,
  } = useAircraftPositions(callsign || "", nearbyQueryLat, nearbyQueryLon, {
    pollWhenHidden: false,
    distNm: flightDisplayContext.aircraftRangeNm,
  });

  // Pull airports around the focal so the sidebar list and the map's
  // airport layer both show context relative to the moving flight.
  const {
    airports: fetchedNearbyAirports,
    loading: fetchedNearbyAirportsLoading,
    settled: fetchedNearbyAirportsSettled,
  } = useNearbyAirports({
    lat: nearbyQueryLat,
    lon: nearbyQueryLon,
    radiusNm: flightDisplayContext.airportRadiusNm,
    limit: flightDisplayContext.airportLimit,
  });
  const nearbyAircraft = useMemo(
    () => (showNearbyContext ? fetchedNearbyAircraft : []),
    [fetchedNearbyAircraft, showNearbyContext],
  );
  const nearbyAirports = useMemo(
    () => (showNearbyContext ? fetchedNearbyAirports : []),
    [fetchedNearbyAirports, showNearbyContext],
  );

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
    if (!showNearbyContext) {
      return trackedAircraftForDisplay ? [trackedAircraftForDisplay] : [];
    }
    return mergeTrackedAircraftIntoNearby({
      trackedAircraft: trackedAircraftForDisplay,
      nearbyAircraft,
    });
  }, [showNearbyContext, trackedAircraftForDisplay, nearbyAircraft]);

  // Look up routes for the tracked aircraft and any nearby traffic the user
  // might preview. No airport context on this page — the cache key is just
  // the callsign — and the same hook gives us the applyTemporaryRoute
  // callback so the preview-card feedback form can splice an override into
  // the in-memory cache without a refetch.
  const {
    routesByCallsign,
    loadingCount: routeLoadingCount,
    applyTemporaryRoute,
  } = useFlightRoutes(rawAircraft, {
    routeProvider,
  });

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
  const focalKey = trackedAircraftForDisplay
    ? getAircraftIdentity(trackedAircraftForDisplay)
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
    if (!trackedAircraftForDisplay) return null;
    const trackedKey = getAircraftIdentity(trackedAircraftForDisplay);
    return (
      aircraft.find((item) => getAircraftIdentity(item) === trackedKey) ||
      trackedAircraftForDisplay
    );
  }, [aircraft, trackedAircraftForDisplay]);
  // Full-trace mode declutters the zoomed-out viewport: only the focal
  // aircraft and the FlightAware route endpoints (if any) stay on the map.
  const flightAwareRouteAirports = useMemo(() => {
    const route = enrichedTrackedAircraft?.flightRoute;
    if (route?.source !== "flightaware") return [];
    const endpoints = [];
    for (const point of [route.origin, route.destination]) {
      if (!point) continue;
      const pointLat = Number(point.lat);
      const pointLon = Number(point.lon);
      if (!Number.isFinite(pointLat) || !Number.isFinite(pointLon)) continue;
      endpoints.push({
        icao: point.icao || "",
        iata: point.iata || "",
        name: point.name || "",
        municipality: point.municipality || "",
        country: point.country || "",
        lat: pointLat,
        lon: pointLon,
        distanceNm:
          focalLat != null && focalLon != null
            ? getDistanceNm(focalLat, focalLon, pointLat, pointLon)
            : null,
      });
    }
    return endpoints;
  }, [enrichedTrackedAircraft?.flightRoute, focalLat, focalLon]);

  const mapAircraft = useMemo(() => {
    if (!mapFollowsAircraft) {
      return enrichedTrackedAircraft ? [enrichedTrackedAircraft] : [];
    }
    return showNearbyMapContext
      ? aircraft
      : enrichedTrackedAircraft
        ? [enrichedTrackedAircraft]
        : [];
  }, [
    aircraft,
    enrichedTrackedAircraft,
    showNearbyMapContext,
    mapFollowsAircraft,
  ]);
  const mapNearbyAirports = useMemo(() => {
    if (!mapFollowsAircraft) return flightAwareRouteAirports;
    return showNearbyMapContext ? nearbyAirports : [];
  }, [
    nearbyAirports,
    showNearbyMapContext,
    mapFollowsAircraft,
    flightAwareRouteAirports,
  ]);
  const trackedMetadataSignature = useMemo(
    () =>
      JSON.stringify({
        type: enrichedTrackedAircraft?.type || "",
        category: enrichedTrackedAircraft?.category || "",
        origin: enrichedTrackedAircraft?.origin || "",
        destination: enrichedTrackedAircraft?.destination || "",
        route: enrichedTrackedAircraft?.route || "",
        flightRoute: enrichedTrackedAircraft?.flightRoute || null,
      }),
    [
      enrichedTrackedAircraft?.type,
      enrichedTrackedAircraft?.category,
      enrichedTrackedAircraft?.origin,
      enrichedTrackedAircraft?.destination,
      enrichedTrackedAircraft?.route,
      enrichedTrackedAircraft?.flightRoute,
    ],
  );
  const lastWrittenMetadataSignatureRef = useRef("");
  useEffect(() => {
    if (!callsign || !enrichedTrackedAircraft) return;
    if (
      !trackedMetadataSignature ||
      trackedMetadataSignature === lastWrittenMetadataSignatureRef.current
    ) {
      return;
    }
    const written = writeTrackedFlightMetadata(callsign, {
      aircraft: enrichedTrackedAircraft,
    });
    if (written) {
      lastWrittenMetadataSignatureRef.current = trackedMetadataSignature;
      setCachedTrackedMetadata(written);
    }
  }, [callsign, enrichedTrackedAircraft, trackedMetadataSignature]);

  useEffect(() => {
    if (showNearbyContext || !focalKey || selectedAircraftId === focalKey) {
      return;
    }
    setSelectedAircraftId(focalKey);
  }, [focalKey, selectedAircraftId, setSelectedAircraftId, showNearbyContext]);

  const focalFlightAwareRoutePath = useMemo(() => {
    const route = enrichedTrackedAircraft?.flightRoute;
    if (route?.source !== "flightaware" || focalLat == null || focalLon == null) {
      return [];
    }
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

  const flightTrackingLoadingActive = shouldShowFlightTrackingLoadingOverlay({
    hasActiveFlight: Boolean(callsign),
    trackedAircraftSettled,
    trackedLoadingOverlayActive,
  });
  const loadingOverlaySources = {
    trackedAircraftLoading: flightTrackingLoadingActive,
    trafficLoading:
      showNearbyContext &&
      (fetchedNearbyAircraftLoading || !fetchedNearbyAircraftSettled),
    nearbyAirportsLoading:
      showNearbyContext &&
      (fetchedNearbyAirportsLoading || !fetchedNearbyAirportsSettled),
    routeLoadingCount,
  };
  const sourceLoadingState = resolveAircraftLoadingOverlayState({
    mapReady: true,
    variant: "flight",
    feedLoading: false,
    ...loadingOverlaySources,
  });
  const sourceLoadingCopy = useMapLoadingOverlayText({
    mode: sourceLoadingState.mode,
    reason: sourceLoadingState.reason,
    variant: "flight",
    callsign,
  });
  const sourceLoadingStatus = sourceLoadingState.active
    ? sourceLoadingCopy.status
    : "";

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
    showNearbyList: showNearbyContext,
    feedSource,
    lastUpdated,
    loadingStatus: sourceLoadingStatus,
    onBack: handleBack,
    onMap: closeSidebar,
  };

  return (
    <SelectedAircraftTraceProvider
      selectedAircraft={selectedAircraft}
      focalAircraft={enrichedTrackedAircraft}
      fullTraceForFocal={flightDisplayContext.fullTraceForFocal}
      showSelectedTrace={showNearbyMapContext}
      focalTraceStartAtMs={focalTraceStartAtMs}
      focalPersistKey={callsign || null}
      focalTraceRefreshKey={focalTraceRefreshKey}
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
            : `airport-map-kit ${
                sidebarOpen ? "airport-map-kit--sidebar-open" : ""
              } flex h-dvh overflow-hidden`
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

        <div className="airport-map-stage relative min-w-0 flex-1 overflow-hidden bg-atc-bg">
          {!(isMobile && sidebarOpen) && (
            <ExplorerMapMenu
              feedSource={feedSource}
              feedStatus="live"
              lastUpdated={lastUpdated}
              routeProvider={routeProvider}
              loadingStatus={sourceLoadingStatus}
              onFitToTrace={fitToTrace}
              zoomDisabled={flightDisplayContext.zoomDisabled}
            />
          )}
          <AirportMap
            icao=""
            lat={focalLat}
            lon={focalLon}
            zoom={mapZoom}
            aircraft={mapAircraft}
            nearbyAirports={mapNearbyAirports}
            airport={null}
            showMapLabels={showMapLabels}
            showRunwayBeams={false}
            showNavaidMarkers={false}
            trafficFilter={trafficFilter}
            typeFilter={typeFilter}
            altitudeLevel={altitudeLevel}
            selectedAircraftId={selectedAircraftId}
            selectedAirportIcao={selectedAirportIcao}
            focalAircraftId={focalKey}
            followsCenter={mapFollowsAircraft}
            floatingSidebarAware={!isMobile && sidebarOpen}
            onSelectAircraft={selectAircraft}
            onSelectAirport={selectAirport}
            runwayMap={null}
            runwayProcedures={null}
            procedureFixLabelRunwayProcedures={null}
            showProcedureFixLabels={false}
            focalRangeRings={false}
            deferUntilFocal
            loadingOverlayActive={flightTrackingLoadingActive}
            loadingOverlayVariant="flight"
            loadingOverlayCallsign={callsign}
            loadingOverlaySources={loadingOverlaySources}
          >
            <FlightAwareRouteArc path={focalFlightAwareRoutePath} />
            <MapFitToTraceController
              routePath={focalFlightAwareRoutePath}
              autoFitKey={flightAwareAutoFitKey}
              fitOptions={flightDisplayContext.mapFitOptions}
              onAutoFit={
                flightDisplayContext.autoFitSuspendsFollow
                  ? suspendMapFollow
                  : undefined
              }
            />
          </AirportMap>

          {isMobile && sidebarOpen && (
            <div className="absolute inset-0 z-map-panel">
              <FlightSidebar {...sidebarProps} onClose={closeSidebar} />
            </div>
          )}

          <LostSignalToast
            active={lostSignal && !lostSignalDismissed}
            callsign={callsign}
            onStay={() => setLostSignalDismissed(true)}
            onBackHome={handleBack}
          />
        </div>
      </div>
    </SelectedAircraftTraceProvider>
  );
}
