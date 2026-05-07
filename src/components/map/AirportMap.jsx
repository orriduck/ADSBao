"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { MapContext } from "./MapContext.js";
import MapTileLayers from "./MapTileLayers.jsx";
import AreaMarker from "./AreaMarker.jsx";
import AirportMarker from "./AirportMarker.jsx";
import GroundStatsCounter from "./GroundStatsCounter.jsx";
import AircraftPosition from "./AircraftPosition.jsx";
import RunwayAnnotationLayer from "./RunwayAnnotationLayer.jsx";
import ProcedureSegmentLayer from "./ProcedureSegmentLayer.jsx";
import {
  AIRPORT_MAP_FALLBACK_CENTER,
  AIRPORT_MAP_TRAFFIC_LEGEND,
} from "../../config/airportMap.js";
import MapAttribution from "../../features/airport-map/MapAttribution.jsx";
import MapCoordinateLabel from "../../features/airport-map/MapCoordinateLabel.jsx";
import MapLoadingState from "../../features/airport-map/MapLoadingState.jsx";
import MapTrafficLegend from "../../features/airport-map/MapTrafficLegend.jsx";
import { getAircraftIdentity } from "../../features/airport-context/airportContextUiModel.js";
import {
  formatCoordinateLabel,
  getMapOverlayTheme,
  getVisibleAircraft,
  resolveDocumentTheme,
} from "../../features/airport-map/airportMapModel.js";

const resolveCurrentTheme = () =>
  typeof document !== "undefined"
    ? resolveDocumentTheme(document.documentElement)
    : "dark";

export default function AirportMap({
  icao = "",
  lat = 0,
  lon = 0,
  zoom = 13,
  accent = "var(--atc-accent)",
  aircraft = [],
  airport = null,
  showMapLabels = false,
  showTelemetry = true,
  showRunwayBeams = true,
  showRoutingPointBadges = true,
  showAirspaceContext = true,
  altitudeFocus = "all",
  selectedAircraftId = "",
  onSelectAircraft,
  runwayMap = null,
  runwayProcedures = null,
  procedureFixLabelRunwayProcedures = runwayProcedures,
  showProcedureFixLabels = false,
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

  useEffect(() => {
    if (mapRef.current && lat && lon) {
      mapRef.current.setView([lat, lon], zoom);
    }
  }, [lat, lon, zoom]);

  const visibleAircraft = useMemo(() => {
    return getVisibleAircraft({
      aircraft,
      airportLat: lat,
      airportLon: lon,
      zoom,
    });
  }, [aircraft, lat, lon, zoom]);

  const latitudeLabel = formatCoordinateLabel(lat, "lat");
  const longitudeLabel = formatCoordinateLabel(lon, "lon");
  const overlayTheme = getMapOverlayTheme(currentTheme);

  return (
    <div className="relative h-full w-full bg-atc-bg">
      <div ref={mapEl} className="h-full w-full" />

      {mapInstance && (
        <MapContext.Provider value={mapInstance}>
          <MapTileLayers theme={currentTheme} showLabels={showMapLabels} />
          <AreaMarker
            lat={lat}
            lon={lon}
            zoom={zoom}
            theme={currentTheme}
          />
          <AirportMarker
            lat={lat}
            lon={lon}
            icao={icao}
            airport={airport}
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
          <GroundStatsCounter
            lat={lat}
            lon={lon}
            zoom={zoom}
            icao={icao}
            aircraft={aircraft}
          />
          {visibleAircraft.map((ac) => (
            <AircraftPosition
              key={getAircraftIdentity(ac)}
              aircraft={ac}
              theme={currentTheme}
              showTelemetry={showTelemetry}
              showAirspaceContext={showAirspaceContext}
              altitudeFocus={altitudeFocus}
              selected={getAircraftIdentity(ac) === selectedAircraftId}
              onSelectAircraft={onSelectAircraft}
            />
          ))}
        </MapContext.Provider>
      )}

      {mapInstance && (
        <>
          <MapCoordinateLabel
            icao={icao}
            latitudeLabel={latitudeLabel}
            longitudeLabel={longitudeLabel}
            color={accent}
            shadowColor={overlayTheme.labelShadowColor}
          />
          <MapAttribution
            color={overlayTheme.attributionColor}
            shadowColor={overlayTheme.labelShadowColor}
          />
          <MapTrafficLegend items={AIRPORT_MAP_TRAFFIC_LEGEND} />
        </>
      )}

      {!mapInstance && <MapLoadingState />}
    </div>
  );
}
