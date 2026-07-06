import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { MapContext } from "./MapContext";
import MapTileLayers from "./MapTileLayers";
import AirportMarker from "./AirportMarker";
import MapRangeLegend from "./MapRangeLegend";
import AirspaceLayer from "./AirspaceLayer";
import NearbyAirportLayer from "./NearbyAirportLayer";
import NavaidLabelLayer from "./NavaidLabelLayer";
import NavaidCountLayer from "./NavaidCountLayer";
import ReportingPointLabelLayer from "./ReportingPointLabelLayer";
import MapBadgeCollisionLayer from "./MapBadgeCollisionLayer";
import CandidateWatchingSpotsLayer from "./CandidateWatchingSpotsLayer";
import AircraftCanvasLayer from "./AircraftCanvasLayer";
import UserLocationMarker from "./UserLocationMarker";
import SelectedAircraftTrace from "./SelectedAircraftTrace";
import RunwayAnnotationLayer from "./RunwayAnnotationLayer";
import AirportSurfaceLayer from "./AirportSurfaceLayer";
import AirportGroundLightingLayer from "./AirportGroundLightingLayer";
import { resolveRunwayAnnotationVisibility } from "../../features/airport/map/runwayAnnotationModel";
import { AIRPORT_MAP_FALLBACK_CENTER } from "../../config/airportMap";
import {
  AIRPORT_MAP_ZOOM,
  AIRPORT_MAP_ZOOM_MAX,
  AIRPORT_MAP_ZOOM_MIN,
} from "../../config/aviation";
import MapAttribution from "./MapAttribution";
import MapLoadingOverlay, {
  useMapLoadingOverlayText,
  useResolvedMapLoadingOverlay,
} from "./MapLoadingOverlay";
import { getAircraftIdentity } from "../../features/airport/context/airportContextUiModel";
import { useI18n } from "../../features/app-shell/i18n/useI18n";
import {
  DEFAULT_ALTITUDE_LEVELS,
  aircraftMatchesFilters,
} from "../../features/aircraft/filters/aircraftFilters";
import {
  getMapOverlayTheme,
  resolveAirportMapInitialCenter,
  getVisibleAircraft,
  resolveNearbyAirportLayerDisplay,
  resolveAirportMapFocalCenter,
  resolveDocumentTheme,
  shouldRenderSelectedAircraftTrace,
} from "../../features/airport/map/airportMapModel";
import {
  MAP_DEFERRED_FOCAL_CENTER_CUTOFF_MS,
  MAP_VISUAL_CONTENT_POLL_MS,
  MAP_VISUAL_CONTENT_READY_CUTOFF_MS,
  hasActiveMapLoadingSource,
  resolveMapVisualGateKey,
  resolveMapVisualReady,
  resolveMapVisualRequirements,
} from "@/features/airport/map/mapVisualReadinessModel";
import {
  resolveMapLoadingPresentation,
  resolveMapSurfaceVisibility,
} from "../../features/aircraft/positions/aircraftLoadingOverlayModel";
import { useAviationContextTiles } from "../../features/airport/context/useAviationContextTiles";
import { shouldUseNavaidCountTiles } from "../../features/airport/context/aviationContextDisplayModel";
import { getOffsetMapCenter } from "./mapViewportOffset";

const resolveCurrentTheme = () =>
  typeof document !== "undefined"
    ? resolveDocumentTheme(document.documentElement)
    : "dark";

const WEB_MERCATOR_MAX_LAT = 85.05112878;
const WEB_MERCATOR_BOUNDS = [
  [-WEB_MERCATOR_MAX_LAT, -180],
  [WEB_MERCATOR_MAX_LAT, 180],
] as any;

export default function AirportMap({
  icao = "",
  lat = null,
  lon = null,
  airportElevationFt = null,
  zoom = 13,
  aircraft = [],
  nearbyAirports = [],
  nearbyNavaids = [],
  reportingPoints = [],
  airspaces = [],
  contextTileOverlays = false,
  contextTileRefreshKey = "",
  fullTraceContext = false,
  onContextTilesChange = null,
  airport = null,
  showMapLabels = false,
  showRunwayBeams = true,
  showNavaidMarkers = false,
  showReportingPoints = false,
  showAirspaces = true,
  showCandidateWatchingSpots = false,
  showCallsigns = true,
  baseLayer = "terrain",
  trafficFilter = "all",
  typeFilter = "all",
  altitudeLevel = DEFAULT_ALTITUDE_LEVELS,
  selectedAircraftId = "",
  selectedAirportIcao = "",
  selectedNavaidKey = "",
  selectedReportingPointKey = "",
  selectedAirspaceId = "",
  selectedCandidateWatchingSpotId = "",
  candidateWatchingSpots = [],
  focalAircraftId = "",
  followsCenter = true,
  floatingSidebarAware = false,
  onSelectAircraft,
  onSelectAirport,
  onSelectNavaid,
  onSelectReportingPoint,
  onSelectAirspace,
  onSelectCandidateWatchingSpot,
  runwayMap = null,
  surfaceMap = null,
  focalRangeRings = null,
  fallbackCenter = AIRPORT_MAP_FALLBACK_CENTER,
  deferUntilFocal = false,
  loadingOverlayActive = false,
  loadingOverlayVariant = "airport",
  loadingOverlayCallsign = "",
  loadingOverlaySources = {},
  flightTerminalReason = "",
  userLocation = null,
  weatherMood = "clear",
  lightBearingDeg = null,
  children = null,
}: Record<string, any>) {
  const { locale } = useI18n();
  const groundRadiusNm =
    focalRangeRings === false ? null : (focalRangeRings?.intervalNm || 3);
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const sizeObs = useRef(null);
  // Set by AircraftCanvasLayer; the map click handler hit-tests aircraft through
  // it (the canvas pane is pointer-events:none, so clicks reach the map).
  const aircraftHitTestRef = useRef<((cp: any) => string | null) | null>(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [mapTilesReady, setMapTilesReady] = useState(false);
  const [visualContentReady, setVisualContentReady] = useState(false);
  const [initialVisualReady, setInitialVisualReady] = useState(false);
  const [deferredFocalCutoffReached, setDeferredFocalCutoffReached] =
    useState(false);
  const [leafletZoom, setLeafletZoom] = useState(zoom);
  const [loadingOverlayPlayback, setLoadingOverlayPlayback] = useState({
    visible: true,
    exiting: false,
  });
  const [currentTheme, setCurrentTheme] = useState(() => resolveCurrentTheme());
  const compactRunwayAnnotations = Number(zoom) <= AIRPORT_MAP_ZOOM.approach;
  const focalCenter = useMemo(
    () => resolveAirportMapFocalCenter({ lat, lon }),
    [lat, lon],
  );
  useEffect(() => {
    if (!deferUntilFocal || focalCenter) {
      setDeferredFocalCutoffReached(false);
      return undefined;
    }

    setDeferredFocalCutoffReached(false);
    const timer = window.setTimeout(() => {
      setDeferredFocalCutoffReached(true);
    }, MAP_DEFERRED_FOCAL_CENTER_CUTOFF_MS);
    return () => window.clearTimeout(timer);
  }, [deferUntilFocal, focalCenter]);
  const shouldDeferInitialCenter =
    Boolean(deferUntilFocal && !deferredFocalCutoffReached);
  const initialCenter = useMemo(
    () =>
      resolveAirportMapInitialCenter({
        focalCenter,
        fallbackCenter,
        deferUntilFocal: shouldDeferInitialCenter,
      }),
    [fallbackCenter, focalCenter, shouldDeferInitialCenter],
  );
  const canInitializeMap = Boolean(initialCenter);
  const visualGateKey = resolveMapVisualGateKey({
    variant: loadingOverlayVariant,
    icao,
    callsign: loadingOverlayCallsign,
  });

  useEffect(() => {
    setCurrentTheme(resolveCurrentTheme());
    const observer = new MutationObserver(() => {
      const next = resolveCurrentTheme();
      setCurrentTheme((current) => (current === next ? current : next));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setInitialVisualReady(false);
    setVisualContentReady(false);
    setMapTilesReady(false);
  }, [visualGateKey]);

  useEffect(() => {
    if (!mapEl.current || mapRef.current || !initialCenter) return undefined;
    const map = L.map(mapEl.current, {
      center: [initialCenter.lat, initialCenter.lon],
      zoom,
      minZoom: AIRPORT_MAP_ZOOM_MIN,
      maxZoom: AIRPORT_MAP_ZOOM_MAX,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      zoomControl: false,
      attributionControl: false,
      // 缩放只由工具栏滑条驱动(setMapZoom → setView),地图本身锁定直接交互,
      // 中心不变。min/max 仅用于 setView 钳制滑条范围。
      scrollWheelZoom: false,
      dragging: false,
      touchZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      tap: false,
      maxBounds: WEB_MERCATOR_BOUNDS,
      maxBoundsViscosity: 1,
    } as any);
    mapRef.current = map;
    setMapInstance(map);

    sizeObs.current = new ResizeObserver(() => {
      requestAnimationFrame(() => mapRef.current?.invalidateSize());
    });
    sizeObs.current.observe(mapEl.current);

    return () => {
      sizeObs.current?.disconnect();
      sizeObs.current = null;
      map.remove();
      mapRef.current = null;
      setMapInstance(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canInitializeMap]);

  // followsCenter controls whether the map re-centers on every poll.
  // After "fit to trace" the caller flips this to false so the map
  // stays anchored to the trace bounds even though the aircraft keeps
  // moving; clicking a preset zoom flips it back to true upstream.
  useEffect(() => {
    if (!mapRef.current || !focalCenter || !followsCenter) return undefined;

    const map = mapRef.current;
    const setOffsetAwareView = () => {
      const targetCenter = floatingSidebarAware
        ? getOffsetMapCenter(map, focalCenter, zoom)
        : ([focalCenter.lat, focalCenter.lon] as any);
      map.invalidateSize();
      map.setView(targetCenter, zoom, {
        animate: false,
      });
    };

    setOffsetAwareView();
    const transitionSettleTimer = window.setTimeout(setOffsetAwareView, 320);

    // Mobile browsers can suspend / freeze the page when the user
    // switches apps or locks the screen. When the tab becomes visible
    // again the map's internal size and center can drift (especially
    // after a viewport resize triggered by the OS keyboard dismissing
    // or a virtual keyboard appearing). Re-applying the offset-aware
    // view on visibility resume + on bfcache restore keeps the focal
    // point pinned to the user's coords without waiting for the next
    // geolocation tick.
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        setOffsetAwareView();
      }
    };
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setOffsetAwareView();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.clearTimeout(transitionSettleTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [floatingSidebarAware, focalCenter, followsCenter, zoom]);

  // Clicks on the map background (not on an aircraft marker) clear the
  // selection so the user can drop "trace mode" without targeting an
  // explicit element. Aircraft markers stop event propagation in their own
  // container click handler, so this listener only fires on bare tiles.
  useEffect(() => {
    if (!mapInstance) return undefined;
    const handleMapClick = (event: any) => {
      // Click priority follows the z-order: aircraft > airport / navaid (their
      // own badge handlers, in a pane above airspace) > airspace. Aircraft live
      // on a pointer-events:none canvas, so their clicks land here — hit-test
      // them FIRST, before the airspace check, so a plane sitting over an OPEN
      // airspace still wins (the airspace fill underneath would otherwise grab
      // it). A miss falls through to airspace, then to a bare-tile clear.
      const hitAircraft = aircraftHitTestRef.current?.(event.containerPoint);
      if (hitAircraft) {
        if (typeof onSelectAircraft === "function") onSelectAircraft(hitAircraft);
        return;
      }
      if (showAirspaces && mapClickTargetsAirspace(event)) return;
      if (selectedAircraftId && typeof onSelectAircraft === "function") {
        onSelectAircraft("");
      }
      if (selectedAirportIcao && typeof onSelectAirport === "function") {
        onSelectAirport("");
      }
      if (selectedNavaidKey && typeof onSelectNavaid === "function") {
        onSelectNavaid("");
      }
      if (selectedAirspaceId && typeof onSelectAirspace === "function") {
        onSelectAirspace("");
      }
      if (
        selectedCandidateWatchingSpotId &&
        typeof onSelectCandidateWatchingSpot === "function"
      ) {
        onSelectCandidateWatchingSpot("");
      }
    };
    mapInstance.on("click", handleMapClick);
    return () => {
      mapInstance.off("click", handleMapClick);
    };
  }, [
    mapInstance,
    onSelectAircraft,
    onSelectAirport,
    onSelectNavaid,
    onSelectAirspace,
    onSelectCandidateWatchingSpot,
    showAirspaces,
    selectedAircraftId,
    selectedAirportIcao,
    selectedNavaidKey,
    selectedAirspaceId,
    selectedCandidateWatchingSpotId,
  ]);

  const visibleAircraft = useMemo(() => {
    return getVisibleAircraft({
      aircraft,
      // Only apply the airport-ground filter when there's actually an
      // airport in focus. On the flight page (no icao) the map center is
      // the focal aircraft's own position — applying the filter there
      // would silently hide the focal because it's "at the airport".
      airportLat: icao ? lat : null,
      airportLon: icao ? lon : null,
      airportElevationFt: icao ? airportElevationFt : null,
      nearbyAirports,
      zoom,
    });
  }, [
    aircraft,
    icao,
    lat,
    lon,
    airportElevationFt,
    nearbyAirports,
    zoom,
  ]);
  const aircraftCanvasMatchesFilters = useCallback(
    (ac: any) =>
      aircraftMatchesFilters(ac, { trafficFilter, typeFilter, altitudeLevel }),
    [trafficFilter, typeFilter, altitudeLevel],
  );
  const selectedAircraft = useMemo(
    () =>
      visibleAircraft.find(
        (item) => getAircraftIdentity(item) === selectedAircraftId,
      ) ||
      aircraft.find((item) => getAircraftIdentity(item) === selectedAircraftId) ||
      null,
    [aircraft, selectedAircraftId, visibleAircraft],
  );
  const selectionActive = Boolean(selectedAircraftId && selectedAircraft);
  const renderSelectedAircraftTrace = shouldRenderSelectedAircraftTrace({
    selectedAircraftId,
    selectedAircraft,
  });
  const feedLoadingActive = hasActiveMapLoadingSource({
    active: loadingOverlayActive,
    sources: loadingOverlaySources,
  });
  const visualRequirements = useMemo(
    () =>
      resolveMapVisualRequirements({
        feedLoading: feedLoadingActive,
        renderedAircraftCount: visibleAircraft.length,
        traceExpected:
          loadingOverlayVariant === "flight" && renderSelectedAircraftTrace,
      }),
    [
      feedLoadingActive,
      loadingOverlayVariant,
      renderSelectedAircraftTrace,
      visibleAircraft.length,
    ],
  );
  const visualRequirementKey = [
    visualGateKey,
    visualRequirements.aircraftMarkersRequired ? "aircraft" : "no-aircraft",
    visualRequirements.traceRequired ? "trace" : "no-trace",
    visibleAircraft.length,
    selectedAircraftId,
  ].join("|");

  useEffect(() => {
    if (initialVisualReady) {
      setVisualContentReady(true);
      return undefined;
    }
    if (!mapInstance) {
      setVisualContentReady(false);
      return undefined;
    }

    const { aircraftMarkersRequired, traceRequired } = visualRequirements;
    if (!aircraftMarkersRequired && !traceRequired) {
      setVisualContentReady(true);
      return undefined;
    }

    setVisualContentReady(false);
    let cancelled = false;
    let timer: number | null = null;
    const startedAt = window.performance.now();
    const mapContainer = mapInstance.getContainer?.() || null;
    const checkReadiness = () => {
      if (cancelled) return;
      const aircraftMarkersReady =
        !aircraftMarkersRequired ||
        Boolean(mapContainer?.querySelector(".aircraft-marker"));
      const traceReady =
        !traceRequired || Boolean(mapContainer?.querySelector(".aircraft-trace"));
      const timedOut =
        window.performance.now() - startedAt >=
        MAP_VISUAL_CONTENT_READY_CUTOFF_MS;

      if ((aircraftMarkersReady && traceReady) || timedOut) {
        setVisualContentReady(true);
        return;
      }

      timer = window.setTimeout(checkReadiness, MAP_VISUAL_CONTENT_POLL_MS);
    };

    timer = window.setTimeout(checkReadiness, 0);
    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
    };
  }, [
    initialVisualReady,
    mapInstance,
    visualRequirementKey,
    visualRequirements,
  ]);
  useEffect(() => {
    if (!mapInstance) {
      setLeafletZoom(zoom);
      return undefined;
    }
    const updateZoom = () => {
      const nextZoom = Number(mapInstance.getZoom?.());
      if (Number.isFinite(nextZoom)) setLeafletZoom(nextZoom);
    };
    updateZoom();
    mapInstance.on?.("zoomend", updateZoom);
    return () => {
      mapInstance.off?.("zoomend", updateZoom);
    };
  }, [mapInstance, zoom]);
  const useNavaidCountTiles = shouldUseNavaidCountTiles({
    fullTraceMode: fullTraceContext,
    zoom: leafletZoom,
  });
  const contextTiles = useAviationContextTiles({
    map: mapInstance,
    enabled: contextTileOverlays,
    airspacesEnabled: showAirspaces,
    navaidsEnabled: showNavaidMarkers && !useNavaidCountTiles,
    navaidCountsEnabled: showNavaidMarkers && useNavaidCountTiles,
    refreshKey: contextTileRefreshKey,
  });
  const renderedAirspaces = useMemo(() => {
    if (!contextTileOverlays) return airspaces;
    const seen = new Set();
    return [...airspaces, ...contextTiles.airspaces].filter((item) => {
      const key = item?.id || item?.name;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [airspaces, contextTileOverlays, contextTiles.airspaces]);
  const selectableAirspaceIds = useMemo(
    () => renderedAirspaces.map((item) => String(item?.id || "")).filter(Boolean),
    [renderedAirspaces],
  );
  const renderedNavaids = useMemo(() => {
    if (!contextTileOverlays) return nearbyNavaids;
    const seen = new Set();
    return [...nearbyNavaids, ...contextTiles.navaids].filter((item) => {
      const key = item?.id || `${item?.ident}:${item?.lat}:${item?.lon}`;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [contextTileOverlays, contextTiles.navaids, nearbyNavaids]);
  const contextSignature = useMemo(
    () =>
      JSON.stringify({
        airspaces: contextTiles.airspaces.map((item) => item?.id || item?.name),
        navaids: contextTiles.navaids.map(
          (item) => item?.id || `${item?.ident}:${item?.lat}:${item?.lon}`,
        ),
        navaidCounts: contextTiles.navaidCounts.map(
          (item) => item?.key || `${item?.z}:${item?.x}:${item?.y}`,
        ),
      }),
    [contextTiles.airspaces, contextTiles.navaidCounts, contextTiles.navaids],
  );

  useEffect(() => {
    if (!contextTileOverlays || typeof onContextTilesChange !== "function") {
      return;
    }
    onContextTilesChange({
      airspaces: contextTiles.airspaces,
      navaids: contextTiles.navaids,
      navaidCounts: contextTiles.navaidCounts,
      loading: contextTiles.loading,
      error: contextTiles.error,
    });
  }, [
    contextSignature,
    contextTileOverlays,
    contextTiles.error,
    contextTiles.loading,
    onContextTilesChange,
    contextTiles.airspaces,
    contextTiles.navaidCounts,
    contextTiles.navaids,
  ]);

  const overlayTheme = getMapOverlayTheme(currentTheme);
  const runwayAnnotationVisibility = resolveRunwayAnnotationVisibility({
    showRunwayBeams,
  });
  const nearbyAirportLayerDisplay = resolveNearbyAirportLayerDisplay({
    nearbyAirports,
    showMapLabels,
  });
  const mapVisualReady = resolveMapVisualReady({
    mapCreated: Boolean(mapInstance),
    tilesReady: mapTilesReady,
    aircraftMarkersRequired: visualRequirements.aircraftMarkersRequired,
    aircraftMarkersReady: visualContentReady,
    traceRequired: visualRequirements.traceRequired,
    traceReady: visualContentReady,
  });
  const overlayMapReady =
    Boolean(mapInstance) &&
    (initialVisualReady || mapVisualReady) &&
    // For the flight page (deferUntilFocal), the map isn't "ready to reveal"
    // until it actually has a focal center to show. Without this, once tiles
    // load the map-covering loading overlay (mode "map") flips to the
    // non-covering "feed" state and the fallback (LAX) view shows through —
    // especially on SPA nav between flights, where initialVisualReady stays
    // latched from the previous map so the new one reads ready immediately.
    !(deferUntilFocal && !focalCenter);
  useEffect(() => {
    if (mapVisualReady) setInitialVisualReady(true);
  }, [mapVisualReady]);
  const loadingOverlayState = useResolvedMapLoadingOverlay({
    mapReady: overlayMapReady,
    variant: loadingOverlayVariant,
    active: loadingOverlayActive,
    sources: { ...loadingOverlaySources, flightTerminalReason },
  });
  const loadingPresentation =
    resolveMapLoadingPresentation(loadingOverlayState as any);
  const { mapVisible } = resolveMapSurfaceVisibility({
    loadingOverlayVisible: loadingOverlayPlayback.visible,
    loadingOverlayExiting: loadingOverlayPlayback.exiting,
  });
  const loadingOverlayCopy = useMapLoadingOverlayText({
    mode: loadingOverlayState.mode,
    reason: loadingOverlayState.reason,
    variant: loadingOverlayVariant,
    callsign: loadingOverlayCallsign,
  });
  const handleLoadingOverlayVisibleChange = useCallback((nextVisible, state) => {
    setLoadingOverlayPlayback({
      visible: Boolean(nextVisible),
      exiting: Boolean(state?.exiting),
    });
  }, []);
  const handleMapTileReadinessChange = useCallback((state) => {
    setMapTilesReady(Boolean(state?.ready));
  }, []);

  return (
    <div className="relative h-full w-full bg-atc-bg">
      <div
        ref={mapEl}
        className="airport-map-surface h-full w-full"
        aria-hidden={!mapVisible}
        style={{
          opacity: mapVisible ? 1 : 0,
          pointerEvents: mapVisible ? undefined : "none",
          transition: mapVisible ? "none" : undefined,
        }}
      />

      {mapInstance && (
        <MapContext.Provider value={mapInstance}>
          <MapTileLayers
            theme={currentTheme}
            locale={locale}
            showLabels={showMapLabels}
            baseLayer={baseLayer}
            selectionActive={selectionActive}
            onReadinessChange={handleMapTileReadinessChange}
          />
          <AirspaceLayer
            airspaces={renderedAirspaces}
            selectableAirspaceIds={selectableAirspaceIds}
            visible={showAirspaces}
            showBoundaryLabels={false}
            selectedAirspaceId={selectedAirspaceId}
            onSelectAirspace={onSelectAirspace}
          />
          <AirportSurfaceLayer
            runwayMap={runwayMap}
            surfaceMap={surfaceMap}
            theme={currentTheme}
            zoom={zoom}
          />
          <AirportGroundLightingLayer
            runwayMap={runwayMap}
            surfaceMap={surfaceMap}
            theme={currentTheme}
            zoom={zoom}
          />
          {icao && (
            <AirportMarker
              lat={lat}
              lon={lon}
              icao={icao}
              airport={airport}
              aircraft={aircraft}
              zoom={zoom}
              groundRadiusNm={groundRadiusNm}
            />
          )}
          <NearbyAirportLayer
            airports={nearbyAirportLayerDisplay.airports}
            theme={currentTheme}
            zoom={zoom}
            selectedIcao={selectedAirportIcao}
            onSelectAirport={onSelectAirport}
            showAirportBadges={nearbyAirportLayerDisplay.showAirportBadges}
            showRunwayBadges={nearbyAirportLayerDisplay.showRunwayBadges}
          />
          <NavaidLabelLayer
            navaids={renderedNavaids}
            theme={currentTheme}
            visible={showNavaidMarkers && !useNavaidCountTiles}
            selectedNavaidKey={selectedNavaidKey}
            onSelectNavaid={onSelectNavaid}
          />
          <ReportingPointLabelLayer
            points={reportingPoints}
            theme={currentTheme}
            visible={showReportingPoints && reportingPoints.length > 0}
            selectedReportingPointKey={selectedReportingPointKey}
            onSelectReportingPoint={onSelectReportingPoint}
          />
          <MapBadgeCollisionLayer
            refreshKey={[
              selectedAirportIcao,
              selectedNavaidKey,
              selectedReportingPointKey,
              selectedCandidateWatchingSpotId,
              selectedAirspaceId,
              showNavaidMarkers ? "navaid-on" : "navaid-off",
              showReportingPoints && reportingPoints.length
                ? "reporting-on"
                : "reporting-off",
              showCandidateWatchingSpots && candidateWatchingSpots.length
                ? "candidate-spots-on"
                : "candidate-spots-off",
              nearbyAirportLayerDisplay.showAirportBadges ? "airport-on" : "airport-off",
              renderedNavaids.length,
              reportingPoints.length,
              candidateWatchingSpots.length,
              nearbyAirportLayerDisplay.airports.length,
              leafletZoom,
            ].join("|")}
          />
          <NavaidCountLayer
            counts={contextTiles.navaidCounts}
            theme={currentTheme}
            visible={showNavaidMarkers && useNavaidCountTiles}
          />
          <RunwayAnnotationLayer
            runwayMap={runwayMap}
            surfaceMap={surfaceMap}
            theme={currentTheme}
            zoom={zoom}
            compact={compactRunwayAnnotations}
            showBeams={runwayAnnotationVisibility.showBeams}
            showBadges={false}
            showCenterlines={compactRunwayAnnotations}
          />
          <CandidateWatchingSpotsLayer
            enabled={showCandidateWatchingSpots}
            spots={candidateWatchingSpots}
            zoom={zoom}
            selectedSpotId={selectedCandidateWatchingSpotId}
            onSelectSpot={onSelectCandidateWatchingSpot}
          />
          {renderSelectedAircraftTrace && (
            <SelectedAircraftTrace theme={currentTheme} />
          )}
          <MapRangeLegend />
          <UserLocationMarker location={userLocation} />
          {children}
          <AircraftCanvasLayer
            aircraft={visibleAircraft}
            theme={currentTheme}
            selectedAircraftId={selectedAircraftId}
            focalAircraftId={focalAircraftId}
            selectionActive={selectionActive}
            traceActive={renderSelectedAircraftTrace}
            showCallsigns={showCallsigns}
            matchesFilters={aircraftCanvasMatchesFilters}
            onSelectAircraft={onSelectAircraft}
            hitTestRef={aircraftHitTestRef}
            weatherMood={weatherMood}
            lightBearingDeg={lightBearingDeg}
          />
        </MapContext.Provider>
      )}

      {mapInstance && (
        <MapAttribution
          color={overlayTheme.attributionColor}
          shadowColor={overlayTheme.labelShadowColor}
          hidden={!mapVisible}
        />
      )}

      <MapLoadingOverlay
        active={loadingPresentation.overlayActive}
        sidebarAware={floatingSidebarAware}
        variant={loadingOverlayVariant}
        onVisibleChange={handleLoadingOverlayVisibleChange}
        {...loadingOverlayCopy}
      />
    </div>
  );
}

function mapClickTargetsAirspace(event: any) {
  const originalEvent = event?.originalEvent as MouseEvent | undefined;
  const target = originalEvent?.target;
  if (target instanceof Element && target.closest("[data-airspace-feature-id]")) {
    return true;
  }
  const x = Number(originalEvent?.clientX);
  const y = Number(originalEvent?.clientY);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  return document
    .elementsFromPoint(x, y)
    .some((element) => element.getAttribute?.("data-airspace-feature-id"));
}
