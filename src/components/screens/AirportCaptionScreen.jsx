"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { PanelLeft } from "lucide-react";
import AirportSidebar from "../sidebar/AirportSidebar";
import MapControlBar from "../ui/MapControlBar";
import Orb from "../ui/Orb";
import { useAircraftPositions } from "../../hooks/useAircraftPositions.js";
import { useFlightRoutes } from "../../hooks/useFlightRoutes.js";
import { useMetar } from "../../hooks/useMetar.js";
import { resolveMovement } from "../../utils/aircraftMovement.js";
import { AIRPORT_FALLBACKS, COORDS } from "../../data/airportFallbacks.js";
import { ZOOM_APPROACH } from "../../utils/airportMapDisplay.js";
import { formatLocalFlightRouteLabel } from "../../utils/flightRouteDisplay.js";
import {
  getAirportSidebarMode,
  getAirportSidebarOpenForMode,
} from "../../utils/sidebarDisplay.js";

const AirportMap = dynamic(() => import("../map/AirportMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-atc-bg font-mono text-[11px] uppercase tracking-[0.2em] text-atc-faint">
      Loading map…
    </div>
  ),
});

const ADSB_LOADING_FADE_MS = 1100;

export default function AirportCaptionScreen({
  icao = "",
  airport = null,
  onBack,
}) {
  const previousSidebarMode = useRef(null);
  const [sidebarMode, setSidebarMode] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mapZoom, setMapZoom] = useState(ZOOM_APPROACH);
  const [showMapLabels, setShowMapLabels] = useState(true);
  const [showTelemetry, setShowTelemetry] = useState(true);
  const isMobile = sidebarMode === "mobile";

  useEffect(() => {
    const syncSidebarMode = () => {
      setSidebarMode(getAirportSidebarMode(window.innerWidth));
    };

    syncSidebarMode();
    window.addEventListener("resize", syncSidebarMode);

    return () => window.removeEventListener("resize", syncSidebarMode);
  }, []);

  useEffect(() => {
    if (!sidebarMode || previousSidebarMode.current === sidebarMode) return;

    previousSidebarMode.current = sidebarMode;
    setSidebarOpen(getAirportSidebarOpenForMode(sidebarMode));
  }, [sidebarMode]);

  const normalizedIcao = String(airport?.icao || icao || "").toUpperCase();
  const airportFallback = AIRPORT_FALLBACKS[normalizedIcao] || null;
  const airportCodeLabel =
    airport?.iata || airportFallback?.iata || normalizedIcao;
  const airportName =
    airport?.name || airportFallback?.name || normalizedIcao || "Airport";
  const airportCity = airport?.city || airportFallback?.city || "";
  const airportCountry = airport?.country || airportFallback?.country || "";
  const airportLat = COORDS[normalizedIcao]?.[0] || airport?.lat || 0;
  const airportLon = COORDS[normalizedIcao]?.[1] || airport?.lon || 0;

  const {
    raw: metarRaw,
    parsed: metar,
    loading: metarLoading,
    error: metarError,
  } = useMetar(normalizedIcao);
  const {
    aircraft,
    initialLoading: aircraftInitialLoading,
    lastUpdated,
  } = useAircraftPositions(normalizedIcao, airportLat, airportLon);
  const { routesByCallsign } = useFlightRoutes(aircraft);

  const aircraftWithRoutes = useMemo(
    () =>
      aircraft.map((item) => {
        const key = normalizeCallsign(item.callsign);
        const route = routesByCallsign[key] || null;
        const localAirport = { iata: airportCodeLabel, icao: normalizedIcao };
        const movement = resolveMovement(
          route,
          normalizedIcao,
          airportCodeLabel,
        );
        return {
          ...item,
          flightRoute: route,
          movement,
          flightRouteLabel: formatLocalFlightRouteLabel(
            route,
            localAirport,
            movement,
          ),
        };
      }),
    [aircraft, routesByCallsign, airportCodeLabel, normalizedIcao],
  );

  const sidebarProps = {
    icao: normalizedIcao,
    iata: airportCodeLabel,
    name: airportName,
    city: airportCity,
    country: airportCountry,
    lat: airportLat,
    lon: airportLon,
    metar,
    metarRaw,
    metarLoading,
    metarError,
    aircraft: aircraftWithRoutes,
    lastUpdated,
    onBack,
  };

  return (
    <div className="flex h-dvh overflow-hidden font-sans text-atc-text">
      {/* Desktop sidebar — inline, width transitions between 25rem and 0 */}
      {!isMobile && (
        <div
          className="shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out"
          style={{ width: sidebarOpen ? "25rem" : "0" }}
        >
          <div className="h-full w-[25rem]">
            <AirportSidebar {...sidebarProps} />
          </div>
        </div>
      )}

      {/* Map area */}
      <div className="relative min-w-0 flex-1 overflow-hidden bg-atc-bg">
        {!(isMobile && sidebarOpen) && (
          <div
            className={`airport-map-menu ${
              isMobile
                ? "airport-map-menu--mobile"
                : "airport-map-menu--desktop"
            }`}
          >
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              className="airport-map-menu-toggle"
              aria-label="Toggle sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </button>

            <MapControlBar
              activeZoom={mapZoom}
              showMapLabels={showMapLabels}
              showTelemetry={showTelemetry}
              onZoom={setMapZoom}
              onToggleMapLabels={() => setShowMapLabels((v) => !v)}
              onToggleTelemetry={() => setShowTelemetry((v) => !v)}
            />
          </div>
        )}

        <AirportMap
          icao={normalizedIcao}
          lat={airportLat}
          lon={airportLon}
          zoom={mapZoom}
          accent="var(--atc-accent)"
          aircraft={aircraftWithRoutes}
          airport={airport}
          showMapLabels={showMapLabels}
          showTelemetry={showTelemetry}
        />
        <AircraftDataLoadingOverlay active={aircraftInitialLoading} />

        {/* Mobile sidebar — full-width overlay on top of map */}
        {isMobile && sidebarOpen && (
          <div className="absolute inset-0 z-[1100]">
            <AirportSidebar
              {...sidebarProps}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

const normalizeCallsign = (callsign) =>
  String(callsign || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

function AircraftDataLoadingOverlay({ active }) {
  const [visible, setVisible] = useState(active);
  const [exiting, setExiting] = useState(false);
  const [isLightTheme, setIsLightTheme] = useState(false);

  useEffect(() => {
    const syncTheme = () => {
      setIsLightTheme(
        document.documentElement.getAttribute("data-theme") !== "dark",
      );
    };
    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let fadeTimer;

    if (active) {
      setVisible(true);
      setExiting(false);
      return undefined;
    }

    if (visible) {
      setExiting(true);
      fadeTimer = window.setTimeout(() => {
        setVisible(false);
        setExiting(false);
      }, ADSB_LOADING_FADE_MS);
    }

    return () => {
      if (fadeTimer) window.clearTimeout(fadeTimer);
    };
  }, [active, visible]);

  return (
    <div
      className={`adsb-loading-overlay ${exiting ? "is-exiting" : ""}`}
      aria-label="Loading ADS-B aircraft data"
      aria-hidden={!visible}
      onAnimationEnd={(event) => {
        if (event.currentTarget !== event.target || !exiting) return;
        setVisible(false);
        setExiting(false);
      }}
      role="status"
      style={{ display: visible ? undefined : "none" }}
    >
      <div className="adsb-loading-orb-shell" aria-hidden="true">
        <Orb
          backgroundColor={isLightTheme ? "#ffffff" : "#05070b"}
          color1={isLightTheme ? "#244164" : "#8fb7d6"}
          color2={isLightTheme ? "#6f8fab" : "#c7e0f5"}
          color3={isLightTheme ? "#d9e7f2" : "#244164"}
          forceHoverState={false}
          hoverIntensity={0}
          hue={0}
          rotateOnHover
        />
      </div>
      <div className="adsb-loading-status">
        <span>adsb.lol</span>
        <strong>SYNCING TRAFFIC</strong>
      </div>
    </div>
  );
}
