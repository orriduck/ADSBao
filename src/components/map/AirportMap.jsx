"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { MapContext } from "./MapContext.js";
import MapTileLayers from "./MapTileLayers.jsx";
import AreaMarker from "./AreaMarker.jsx";
import AirportMarker from "./AirportMarker.jsx";
import NearbyAirportLayer from "./NearbyAirportLayer.jsx";
import GroundStatsCounter from "./GroundStatsCounter.jsx";
import AircraftPosition from "./AircraftPosition.jsx";
import SelectedAircraftTrace from "./SelectedAircraftTrace.jsx";
import RunwayAnnotationLayer from "./RunwayAnnotationLayer.jsx";
import ProcedureSegmentLayer from "./ProcedureSegmentLayer.jsx";
import { AIRPORT_MAP_FALLBACK_CENTER } from "../../config/airportMap.js";
import MapAttribution from "./MapAttribution.jsx";
import MapLoadingState from "./MapLoadingState.jsx";
import { getAircraftIdentity } from "../../features/airport/context/airportContextUiModel.js";
import { aircraftMatchesFilters } from "../../features/aircraft/filters/aircraftFilters.js";
import {
  getMapOverlayTheme,
  getVisibleAircraft,
  resolveDocumentTheme,
} from "../../features/airport/map/airportMapModel.js";

const resolveCurrentTheme = () =>
  typeof document !== "undefined"
    ? resolveDocumentTheme(document.documentElement)
    : "dark";

export default function AirportMap({
  icao = "",
  lat = 0,
  lon = 0,
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
  onSelectAircraft,
  onSelectAirport,
  onRevalidateRoute,
  runwayMap = null,
  runwayProcedures = null,
  procedureFixLabelRunwayProcedures = runwayProcedures,
  showProcedureFixLabels = false,
  focalRangeRings = null,
  nearbyRangeRings = null,
  children = null,
}) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const sizeObs = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [currentTheme, setCurrentTheme] = useState(() => resolveCurrentTheme());

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
    if (!mapEl.current || mapRef.current) return undefined;
    const map = L.map(mapEl.current, {
      center: [
        lat || AIRPORT_MAP_FALLBACK_CENTER.lat,
        lon || AIRPORT_MAP_FALLBACK_CENTER.lon,
      ],
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
    });
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
  }, []);

  // followsCenter controls whether the map re-centers on every poll.
  // After "fit to trace" the caller flips this to false so the map
  // stays anchored to the trace bounds even though the aircraft keeps
  // moving; clicking a preset zoom flips it back to true upstream.
  useEffect(() => {
    if (mapRef.current && lat && lon && followsCenter) {
      mapRef.current.setView([lat, lon], zoom);
    }
  }, [lat, lon, zoom, followsCenter]);

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
    });
  }, [aircraft, icao, lat, lon, nearbyAirports, zoom]);
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

  return (
    <div className="relative h-full w-full bg-atc-bg">
      <div ref={mapEl} className="h-full w-full" />

      {mapInstance && (
        <MapContext.Provider value={mapInstance}>
          <MapTileLayers
            theme={currentTheme}
            showLabels={showMapLabels}
            selectionActive={selectionActive}
          />
          <AreaMarker
            lat={lat}
            lon={lon}
            zoom={zoom}
            theme={currentTheme}
            ringIntervalNm={focalRangeRings?.intervalNm}
            ringMaxNm={focalRangeRings?.maxNm}
          />
          {icao && (
            <AirportMarker
              lat={lat}
              lon={lon}
              icao={icao}
              airport={airport}
            />
          )}
          <NearbyAirportLayer
            airports={nearbyAirports}
            theme={currentTheme}
            zoom={zoom}
            selectedIcao={selectedAirportIcao}
            onSelectAirport={onSelectAirport}
            ringIntervalNm={nearbyRangeRings?.intervalNm}
            ringMaxNm={nearbyRangeRings?.maxNm}
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
          {icao && (
            <GroundStatsCounter
              lat={lat}
              lon={lon}
              zoom={zoom}
              icao={icao}
              aircraft={aircraft}
            />
          )}
          <SelectedAircraftTrace theme={currentTheme} />
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
              onRevalidateRoute={onRevalidateRoute}
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

      {!mapInstance && <MapLoadingState />}
    </div>
  );
}
