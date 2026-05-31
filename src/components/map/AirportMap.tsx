"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { MapContext } from "./MapContext";
import MapTileLayers from "./MapTileLayers";
import AreaMarker from "./AreaMarker";
import AirportMarker from "./AirportMarker";
import MapRangeLegend from "./MapRangeLegend";
import NearbyAirportLayer from "./NearbyAirportLayer";
import AircraftPosition from "./AircraftPosition";
import SelectedAircraftTrace from "./SelectedAircraftTrace";
import RunwayAnnotationLayer from "./RunwayAnnotationLayer";
import ProcedureSegmentLayer from "./ProcedureSegmentLayer";
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
import { resolveMapLoadingPresentation } from "../../features/aircraft/positions/aircraftLoadingOverlayModel";
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
  airport = null,
  showMapLabels = false,
  showRunwayBeams = true,
  showRoutingPointBadges = true,
  trafficFilter = "all",
  typeFilter = "all",
  altitudeLevel = "all",
  selectedAircraftId = "",
  selectedAirportIcao = "",
  focalAircraftId = "",
  followsCenter = true,
  floatingSidebarAware = false,
  onSelectAircraft,
  onSelectAirport,
  runwayMap = null,
  runwayProcedures = null,
  procedureFixLabelRunwayProcedures = runwayProcedures,
  showProcedureFixLabels = false,
  focalRangeRings = null,
  fallbackCenter = AIRPORT_MAP_FALLBACK_CENTER,
  deferUntilFocal = false,
  loadingOverlayActive = false,
  loadingOverlayVariant = "airport",
  loadingOverlayCallsign = "",
  loadingOverlaySources = {},
  children = null,
}: Record<string, any>) {
  const { locale } = useI18n();
  // Single source of truth for the focal ring bands so AreaMarker,
  // AirportMarker, and the bottom-left legend agree on what to render.
  // Nearby airports intentionally render without range rings.
  const effectiveFocalRings =
    focalRangeRings === false
      ? null
      : focalRangeRings || { intervalNm: 3, maxNm: 30 };
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const sizeObs = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
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
    };
    mapInstance.on("click", handleMapClick);
    return () => {
      mapInstance.off("click", handleMapClick);
    };
  }, [
    mapInstance,
    onSelectAircraft,
    onSelectAirport,
    selectedAircraftId,
    selectedAirportIcao,
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
      groundAreaRadiusNm: effectiveFocalRings?.intervalNm,
    });
  }, [
    aircraft,
    icao,
    lat,
    lon,
    nearbyAirports,
    zoom,
    effectiveFocalRings?.intervalNm,
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
  const loadingOverlayCopy = useMapLoadingOverlayText({
    mode: loadingOverlayState.mode,
    reason: loadingOverlayState.reason,
    variant: loadingOverlayVariant,
    callsign: loadingOverlayCallsign,
  });

  return (
    <div className="relative h-full w-full bg-atc-bg">
      <div ref={mapEl} className="h-full w-full" />

      {mapInstance && (
        <MapContext.Provider value={mapInstance}>
          <MapTileLayers
            theme={currentTheme}
            locale={locale}
            showLabels={showMapLabels}
            selectionActive={selectionActive}
          />
          {effectiveFocalRings && (
            <AreaMarker
              lat={lat}
              lon={lon}
              zoom={zoom}
              theme={currentTheme}
              ringIntervalNm={effectiveFocalRings.intervalNm}
              ringMaxNm={effectiveFocalRings.maxNm}
            />
          )}
          {icao && (
            <AirportMarker
              lat={lat}
              lon={lon}
              icao={icao}
              airport={airport}
              aircraft={aircraft}
              zoom={zoom}
              groundRadiusNm={effectiveFocalRings?.intervalNm}
            />
          )}
          <NearbyAirportLayer
            airports={nearbyAirports}
            theme={currentTheme}
            zoom={zoom}
            selectedIcao={selectedAirportIcao}
            onSelectAirport={onSelectAirport}
            showRunwayBadges={showRoutingPointBadges}
          />
          <ProcedureSegmentLayer
            runwayProcedures={runwayProcedures}
            fixLabelRunwayProcedures={procedureFixLabelRunwayProcedures}
            theme={currentTheme}
            showFixLabels={showProcedureFixLabels && showRoutingPointBadges}
          />
          <RunwayAnnotationLayer
            runwayMap={runwayMap}
            theme={currentTheme}
            zoom={zoom}
            showBeams={showRunwayBeams}
            showBadges={showRoutingPointBadges}
          />
          <SelectedAircraftTrace theme={currentTheme} />
          <MapRangeLegend />
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
        />
      )}

      <MapLoadingOverlay
        active={loadingPresentation.overlayActive}
        sidebarAware={floatingSidebarAware}
        variant={loadingOverlayVariant}
        {...loadingOverlayCopy}
      />
    </div>
  );
}
