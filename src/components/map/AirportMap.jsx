"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { MapContext } from "./MapContext.js";
import MapTileLayers from "./MapTileLayers.jsx";
import AreaMarker, { AIRPORT_AREA_RADIUS_NM } from "./AreaMarker.jsx";
import AirportMarker from "./AirportMarker.jsx";
import GroundStatsCounter from "./GroundStatsCounter.jsx";
import AircraftPosition from "./AircraftPosition.jsx";
import { ZOOM_APPROACH } from "../../utils/airportMapDisplay.js";
import { AIRCRAFT_COLORS } from "../../constants/aircraft.js";
import { getDistanceNm } from "../../utils/aircraftTrafficIntent.js";

const trafficLegend = [
  { id: "departure", label: "DEP", color: AIRCRAFT_COLORS.departure },
  { id: "unknown", label: "UNKN", color: AIRCRAFT_COLORS.unknown },
  { id: "arrival", label: "ARR", color: AIRCRAFT_COLORS.arrival },
];

const resolveCurrentTheme = () =>
  typeof document !== "undefined" &&
  document.documentElement.getAttribute("data-theme") === "light"
    ? "light"
    : "dark";

export default function AirportMap({
  icao = "",
  lat = 0,
  lon = 0,
  zoom = 13,
  accent = "var(--atc-accent)",
  aircraft = [],
  airport = null,
  showMapLabels = true,
  showTelemetry = true,
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
      center: [lat || 33.9416, lon || -118.4085],
      zoom,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      dragging: false,
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

  const atApproachZoom = Number(zoom) === ZOOM_APPROACH;
  const visibleAircraft = useMemo(() => {
    return aircraft.filter((ac) => {
      if (ac.lat == null || ac.lon == null) return false;
      if (!atApproachZoom) return true;
      const distNm = getDistanceNm(lat, lon, ac.lat, ac.lon);
      return distNm == null || distNm > AIRPORT_AREA_RADIUS_NM;
    });
  }, [aircraft, atApproachZoom, lat, lon]);

  const latStr = lat
    ? `${Math.abs(lat).toFixed(2)}${lat >= 0 ? "N" : "S"}`
    : "";
  const lonStr = lon
    ? `${Math.abs(lon).toFixed(2)}${lon >= 0 ? "E" : "W"}`
    : "";
  const mapLabelShadowColor =
    currentTheme === "light" ? "rgba(250,249,245,0.95)" : "#041a38";
  const mapAttributionColor =
    currentTheme === "light" ? "rgba(14,26,43,0.45)" : "rgba(245,247,250,0.3)";

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
          <GroundStatsCounter
            lat={lat}
            lon={lon}
            zoom={zoom}
            icao={icao}
            aircraft={aircraft}
          />
          {visibleAircraft.map((ac) => (
            <AircraftPosition
              key={ac.icao24}
              aircraft={ac}
              theme={currentTheme}
              showTelemetry={showTelemetry}
            />
          ))}
        </MapContext.Provider>
      )}

      {mapInstance && (
        <>
          <div
            className="pointer-events-none absolute left-3.5 top-[56px] font-mono text-[10px] font-semibold tracking-[2px]"
            style={{
              color: accent,
              textShadow: `0 0 6px ${mapLabelShadowColor}`,
            }}
          >
            * {icao} / {latStr} {lonStr}
          </div>
          <div
            className="pointer-events-none absolute bottom-3 right-3 whitespace-nowrap font-sans text-[9px]"
            style={{
              color: mapAttributionColor,
              textShadow: `0 0 6px ${mapLabelShadowColor}`,
            }}
          >
            OpenStreetMap / CartoDB
          </div>
          <div className="map-traffic-legend pointer-events-none absolute right-3 top-[168px] flex max-w-[calc(100%-24px)] flex-wrap gap-2 rounded px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.8px]">
            {trafficLegend.map((item) => (
              <span key={item.id} className="inline-flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background: item.color,
                    boxShadow: `0 0 6px ${item.color}`,
                  }}
                />
                {item.label}
              </span>
            ))}
          </div>
        </>
      )}

      {!mapInstance && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-atc-card">
          <div className="font-mono text-[11px] tracking-widest text-atc-faint">
            LOADING MAP...
          </div>
        </div>
      )}
    </div>
  );
}
