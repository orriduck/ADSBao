"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import dynamic from "next/dynamic";
import { MapContext } from "./MapContext";
import MapTileLayers from "./MapTileLayers";
import AirportMarker from "./AirportMarker";
import MapRangeLegend from "./MapRangeLegend";
import AirspaceLayer from "./AirspaceLayer";
import NearbyAirportLayer from "./NearbyAirportLayer";
import NavaidLabelLayer from "./NavaidLabelLayer";
import NavaidCountLayer from "./NavaidCountLayer";
import CandidateWatchingSpotsLayer from "./CandidateWatchingSpotsLayer";
import AircraftPosition from "./AircraftPosition";
import UserLocationMarker from "./UserLocationMarker";
import SelectedAircraftTrace from "./SelectedAircraftTrace";
import RunwayAnnotationLayer from "./RunwayAnnotationLayer";
import { resolveRunwayAnnotationVisibility } from "../../features/airport/map/runwayAnnotationModel";
import { AIRPORT_MAP_FALLBACK_CENTER } from "../../config/airportMap";
import MapAttribution from "./MapAttribution";
import MapLoadingOverlay, {
  useMapLoadingOverlayText,
  useResolvedMapLoadingOverlay,
} from "./MapLoadingOverlay";
import { getAircraftIdentity } from "../../features/airport/context/airportContextUiModel";
import { useI18n } from "../../features/app-shell/i18n/useI18n";
import { aircraftMatchesFilters } from "../../features/aircraft/filters/aircraftFilters";
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
  resolveMapLoadingPresentation,
  resolveMapSurfaceVisibility,
} from "../../features/aircraft/positions/aircraftLoadingOverlayModel";
import { useAviationContextTiles } from "../../features/airport/context/useAviationContextTiles";
import { shouldUseNavaidCountTiles } from "../../features/airport/context/aviationContextDisplayModel";
import { getOffsetMapCenter } from "./mapViewportOffset";
import { shouldRenderAircraft3DOverlay } from "@/features/aircraft/icons/aircraftIcon3DModel";

const resolveCurrentTheme = () =>
  typeof document !== "undefined"
    ? resolveDocumentTheme(document.documentElement)
    : "dark";

const Aircraft3DOverlay = dynamic(() => import("./Aircraft3DOverlay"), {
  ssr: false,
});

const WEB_MERCATOR_MAX_LAT = 85.05112878;
const WEB_MERCATOR_BOUNDS = [
  [-WEB_MERCATOR_MAX_LAT, -180],
  [WEB_MERCATOR_MAX_LAT, 180],
] as any;

export default function AirportMap({
  icao = "",
  lat = null,
  lon = null,
  zoom = 13,
  aircraft = [],
  nearbyAirports = [],
  nearbyNavaids = [],
  airspaces = [],
  contextTileOverlays = false,
  contextTileRefreshKey = "",
  fullTraceContext = false,
  onContextTilesChange = null,
  airport = null,
  showMapLabels = false,
  showRunwayBeams = true,
  showNavaidMarkers = false,
  showAirspaces = true,
  showCandidateWatchingSpots = false,
  trafficFilter = "all",
  typeFilter = "all",
  altitudeLevel = "all",
  selectedAircraftId = "",
  selectedAirportIcao = "",
  selectedNavaidKey = "",
  selectedAirspaceId = "",
  selectedCandidateWatchingSpotId = "",
  candidateWatchingSpots = [],
  candidateWatchingSpotCount = 0,
  focalAircraftId = "",
  followsCenter = true,
  floatingSidebarAware = false,
  onSelectAircraft,
  onSelectAirport,
  onSelectNavaid,
  onSelectAirspace,
  onSelectCandidateWatchingSpot,
  runwayMap = null,
  focalRangeRings = null,
  fallbackCenter = AIRPORT_MAP_FALLBACK_CENTER,
  deferUntilFocal = false,
  loadingOverlayActive = false,
  loadingOverlayVariant = "airport",
  loadingOverlayCallsign = "",
  loadingOverlaySources = {},
  immersiveModeActive = false,
  immersivePhase = "",
  immersiveLocalMinutes = null,
  userLocation = null,
  userLocationPulseIntervalMs = null,
  userLocationPulseBeat = null,
  children = null,
}: Record<string, any>) {
  const { locale } = useI18n();
  const groundRadiusNm =
    focalRangeRings === false ? null : (focalRangeRings?.intervalNm || 3);
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const sizeObs = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [leafletZoom, setLeafletZoom] = useState(zoom);
  const [loadingOverlayPlayback, setLoadingOverlayPlayback] = useState({
    visible: true,
    exiting: false,
  });
  const [currentTheme, setCurrentTheme] = useState(() => resolveCurrentTheme());
  const focalCenter = useMemo(
    () => resolveAirportMapFocalCenter({ lat, lon }),
    [lat, lon],
  );
  const initialCenter = useMemo(
    () =>
      resolveAirportMapInitialCenter({
        focalCenter,
        fallbackCenter,
        deferUntilFocal,
      }),
    [deferUntilFocal, fallbackCenter, focalCenter],
  );
  const canInitializeMap = Boolean(initialCenter);

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
    if (!mapEl.current || mapRef.current || !initialCenter) return undefined;
    const map = L.map(mapEl.current, {
      center: [initialCenter.lat, initialCenter.lon],
      zoom,
      zoomControl: false,
      attributionControl: false,
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
      map.setView(targetCenter, zoom, {
        animate: false,
      });
    };

    setOffsetAwareView();
    const transitionSettleTimer = window.setTimeout(setOffsetAwareView, 320);

    return () => {
      window.clearTimeout(transitionSettleTimer);
    };
  }, [floatingSidebarAware, focalCenter, followsCenter, zoom]);

  // Clicks on the map background (not on an aircraft marker) clear the
  // selection so the user can drop "trace mode" without targeting an
  // explicit element. Aircraft markers stop event propagation in their own
  // container click handler, so this listener only fires on bare tiles.
  useEffect(() => {
    if (!mapInstance) return undefined;
    const handleMapClick = () => {
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
      nearbyAirports,
      zoom,
    });
  }, [
    aircraft,
    icao,
    lat,
    lon,
    nearbyAirports,
    zoom,
  ]);
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
    immersiveModeActive,
  });
  const renderAircraft3DOverlay = shouldRenderAircraft3DOverlay({
    immersiveModeActive,
  });
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
    airspacesEnabled: !immersiveModeActive && showAirspaces,
    navaidsEnabled:
      !immersiveModeActive && showNavaidMarkers && !useNavaidCountTiles,
    navaidCountsEnabled:
      !immersiveModeActive && showNavaidMarkers && useNavaidCountTiles,
    refreshKey: contextTileRefreshKey,
  });
  const renderedAirspaces = useMemo(() => {
    if (immersiveModeActive) return [];
    if (!contextTileOverlays) return airspaces;
    const seen = new Set();
    return [...airspaces, ...contextTiles.airspaces].filter((item) => {
      const key = item?.id || item?.name;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [airspaces, contextTileOverlays, contextTiles.airspaces, immersiveModeActive]);
  const renderedNavaids = useMemo(() => {
    if (immersiveModeActive) return [];
    if (!contextTileOverlays) return nearbyNavaids;
    const seen = new Set();
    return [...nearbyNavaids, ...contextTiles.navaids].filter((item) => {
      const key = item?.id || `${item?.ident}:${item?.lat}:${item?.lon}`;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [contextTileOverlays, contextTiles.navaids, immersiveModeActive, nearbyNavaids]);
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
  const mapStyleTheme = immersiveModeActive ? "immersive" : currentTheme;
  const showBaseMapLabels = immersiveModeActive ? false : showMapLabels;
  const runwayAnnotationVisibility = resolveRunwayAnnotationVisibility({
    immersiveModeActive,
    immersiveLocalMinutes,
    immersivePhase,
    showRunwayBeams,
  });
  const nearbyAirportLayerDisplay = resolveNearbyAirportLayerDisplay({
    nearbyAirports,
    immersiveModeActive,
  });
  const loadingOverlayState = useResolvedMapLoadingOverlay({
    mapReady: Boolean(mapInstance),
    variant: loadingOverlayVariant,
    active: loadingOverlayActive,
    sources: loadingOverlaySources,
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

  return (
    <div className="relative h-full w-full bg-atc-bg">
      <div
        ref={mapEl}
        className="airport-map-surface h-full w-full"
        aria-hidden={!mapVisible}
        style={{
          opacity: mapVisible ? 1 : 0,
          pointerEvents: mapVisible ? undefined : "none",
        }}
      />

      {mapInstance && (
        <MapContext.Provider value={mapInstance}>
          <MapTileLayers
            theme={mapStyleTheme}
            locale={locale}
            showLabels={showBaseMapLabels}
            selectionActive={selectionActive}
            immersiveLocalMinutes={immersiveLocalMinutes}
          />
          <AirspaceLayer
            airspaces={renderedAirspaces}
            visible={!immersiveModeActive && showAirspaces}
            showBoundaryLabels={!fullTraceContext}
            selectedAirspaceId={selectedAirspaceId}
            onSelectAirspace={onSelectAirspace}
          />
          {icao && !immersiveModeActive && (
            <AirportMarker
              lat={lat}
              lon={lon}
              icao={icao}
              airport={airport}
              aircraft={aircraft}
              zoom={zoom}
              groundRadiusNm={groundRadiusNm}
              candidateWatchingSpotCount={
                showCandidateWatchingSpots ? candidateWatchingSpotCount : 0
              }
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
            visible={
              !immersiveModeActive && showNavaidMarkers && !useNavaidCountTiles
            }
            selectedNavaidKey={selectedNavaidKey}
            onSelectNavaid={onSelectNavaid}
          />
          <NavaidCountLayer
            counts={contextTiles.navaidCounts}
            theme={currentTheme}
            visible={
              !immersiveModeActive && showNavaidMarkers && useNavaidCountTiles
            }
          />
          <RunwayAnnotationLayer
            runwayMap={runwayMap}
            theme={immersiveModeActive ? "night" : currentTheme}
            zoom={zoom}
            showBeams={runwayAnnotationVisibility.showBeams}
            showBadges={runwayAnnotationVisibility.showBadges}
          />
          <CandidateWatchingSpotsLayer
            enabled={!immersiveModeActive && showCandidateWatchingSpots}
            spots={candidateWatchingSpots}
            zoom={zoom}
            selectedSpotId={selectedCandidateWatchingSpotId}
            onSelectSpot={onSelectCandidateWatchingSpot}
          />
          {renderSelectedAircraftTrace && (
            <SelectedAircraftTrace theme={currentTheme} />
          )}
          {!immersiveModeActive && <MapRangeLegend />}
          <UserLocationMarker
            location={userLocation}
            pulseIntervalMs={userLocationPulseIntervalMs}
            pulseBeat={userLocationPulseBeat}
          />
          {children}
          {renderAircraft3DOverlay && (
            <Aircraft3DOverlay
              aircraft={visibleAircraft}
              selectedAircraftId={selectedAircraftId}
              immersiveModeActive={immersiveModeActive}
              immersivePhase={immersivePhase}
              immersiveLocalMinutes={immersiveLocalMinutes}
              mapInstance={mapInstance}
              trafficFilter={trafficFilter}
              typeFilter={typeFilter}
              altitudeLevel={altitudeLevel}
            />
          )}
          {visibleAircraft.map((ac) => (
            <AircraftPosition
              key={getAircraftIdentity(ac)}
              aircraft={ac}
              theme={currentTheme}
              matchesFilters={aircraftMatchesFilters(ac, {
                trafficFilter,
                typeFilter,
                altitudeLevel,
              })}
              selected={getAircraftIdentity(ac) === selectedAircraftId}
              selectionActive={selectionActive}
              traceActive={renderSelectedAircraftTrace}
              immersiveModeActive={immersiveModeActive}
              immersivePhase={immersivePhase}
              threeDimensionalOverlayActive={renderAircraft3DOverlay}
              forceSilhouette={
                Boolean(focalAircraftId) &&
                getAircraftIdentity(ac) === focalAircraftId
              }
              onSelectAircraft={onSelectAircraft}
            />
          ))}
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
