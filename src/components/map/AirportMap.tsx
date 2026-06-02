"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { MapContext } from "./MapContext";
import MapTileLayers from "./MapTileLayers";
import AirportMarker from "./AirportMarker";
import MapRangeLegend from "./MapRangeLegend";
import AirspaceLayer from "./AirspaceLayer";
import NearbyAirportLayer from "./NearbyAirportLayer";
import NavaidLabelLayer from "./NavaidLabelLayer";
import AircraftPosition from "./AircraftPosition";
import UserLocationMarker from "./UserLocationMarker";
import SelectedAircraftTrace from "./SelectedAircraftTrace";
import RunwayAnnotationLayer from "./RunwayAnnotationLayer";
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
  resolveAirportMapFocalCenter,
  resolveDocumentTheme,
} from "../../features/airport/map/airportMapModel";
import {
  resolveMapLoadingPresentation,
  resolveMapSurfaceVisibility,
} from "../../features/aircraft/positions/aircraftLoadingOverlayModel";
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
  zoom = 13,
  aircraft = [],
  nearbyAirports = [],
  nearbyNavaids = [],
  airspaces = [],
  airport = null,
  showMapLabels = false,
  showRunwayBeams = true,
  showNavaidMarkers = false,
  showAirspaces = true,
  trafficFilter = "all",
  typeFilter = "all",
  altitudeLevel = "all",
  selectedAircraftId = "",
  selectedAirportIcao = "",
  selectedNavaidKey = "",
  selectedAirspaceId = "",
  focalAircraftId = "",
  followsCenter = true,
  floatingSidebarAware = false,
  onSelectAircraft,
  onSelectAirport,
  onSelectNavaid,
  onSelectAirspace,
  runwayMap = null,
  focalRangeRings = null,
  fallbackCenter = AIRPORT_MAP_FALLBACK_CENTER,
  deferUntilFocal = false,
  loadingOverlayActive = false,
  loadingOverlayVariant = "airport",
  loadingOverlayCallsign = "",
  loadingOverlaySources = {},
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
    selectedAircraftId,
    selectedAirportIcao,
    selectedNavaidKey,
    selectedAirspaceId,
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

  const overlayTheme = getMapOverlayTheme(currentTheme);
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
            theme={currentTheme}
            locale={locale}
            showLabels={showMapLabels}
            selectionActive={selectionActive}
          />
          <AirspaceLayer
            airspaces={airspaces}
            visible={showAirspaces}
            selectedAirspaceId={selectedAirspaceId}
            onSelectAirspace={onSelectAirspace}
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
            airports={nearbyAirports}
            theme={currentTheme}
            zoom={zoom}
            selectedIcao={selectedAirportIcao}
            onSelectAirport={onSelectAirport}
            showRunwayBadges={false}
          />
          <NavaidLabelLayer
            navaids={nearbyNavaids}
            theme={currentTheme}
            visible={showNavaidMarkers}
            selectedNavaidKey={selectedNavaidKey}
            onSelectNavaid={onSelectNavaid}
          />
          <RunwayAnnotationLayer
            runwayMap={runwayMap}
            theme={currentTheme}
            zoom={zoom}
            showBeams={showRunwayBeams}
            showBadges
          />
          <SelectedAircraftTrace theme={currentTheme} />
          <MapRangeLegend />
          <UserLocationMarker
            location={userLocation}
            pulseIntervalMs={userLocationPulseIntervalMs}
            pulseBeat={userLocationPulseBeat}
          />
          {children}
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
              traceActive={selectionActive}
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
