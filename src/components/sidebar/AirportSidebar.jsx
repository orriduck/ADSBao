"use client";

import AircraftTable from "./AircraftTable";
import AirportIdentity from "./AirportIdentity";
import StatsStrip from "./StatsStrip";
import WeatherCarousel from "./WeatherCarousel";

export default function AirportSidebar({
  icao = "",
  iata = "",
  name = "",
  city = "",
  country = "",
  lat = 0,
  lon = 0,
  metar = null,
  metarRaw = "",
  metarLoading = false,
  metarError = null,
  aircraft = [],
  altitudeFocus = "all",
  showAirspaceContext = true,
  selectedAircraftId = "",
  lastUpdated = null,
  feedStatus = "live",
  onSelectAircraft,
  onBack,
  onClose = null,
}) {
  const isMobileOverlay = Boolean(onClose);
  const updatedLabel = formatUpdated(lastUpdated, feedStatus);

  return (
    <div
      className={`airport-sidebar-panel flex h-full flex-col border-r border-atc-line-strong bg-atc-bg ${
        isMobileOverlay ? "airport-sidebar-panel--mobile" : ""
      }`}
    >
      <div className="sticky top-0 z-20 flex h-11 flex-none items-center justify-between gap-4 border-b border-atc-line-strong bg-atc-bg px-6">
        <button
          type="button"
          onClick={onBack}
          className="font-mono text-[10px] uppercase tracking-[0.14em] text-atc-faint transition-colors hover:text-atc-text"
        >
          ← ADSBao
        </button>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-atc-faint transition-colors hover:text-atc-text"
          >
            Map →
          </button>
        ) : (
          <span
            key={updatedLabel}
            className={`airport-feed-status airport-feed-status--${feedStatus} font-mono text-[10px] uppercase tracking-[0.12em] text-atc-dim`}
          >
            {updatedLabel}
          </span>
        )}
      </div>

      <div
        className={
          isMobileOverlay
            ? "flex flex-none flex-col overflow-visible"
            : "flex flex-1 flex-col overflow-hidden"
        }
      >
        <div className="flex-none">
          <AirportIdentity
            icao={icao}
            iata={iata}
            name={name}
            city={city}
            country={country}
            lat={lat}
            lon={lon}
          />
          <StatsStrip metar={metar} aircraftCount={aircraft.length} />
          <WeatherCarousel
            metar={metar}
            metarRaw={metarRaw}
            metarLoading={metarLoading}
            metarError={metarError}
            airportCode={iata || icao}
            airportLat={lat}
            airportLon={lon}
          />
        </div>
        <div
          className={
            isMobileOverlay
              ? "flex-none overflow-visible"
              : "flex-1 overflow-y-auto"
          }
        >
          <AircraftTable
            aircraft={aircraft}
            altitudeFocus={altitudeFocus}
            showAirspaceContext={showAirspaceContext}
            selectedAircraftId={selectedAircraftId}
            onSelectAircraft={onSelectAircraft}
            fill={!isMobileOverlay}
          />
        </div>
      </div>
    </div>
  );
}

function formatUpdated(date, feedStatus = "live") {
  const label = feedStatus === "infer" ? "Infer" : "Live";
  if (!date) return `${label} · syncing`;
  return `${label} · ${date.toLocaleTimeString([], {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })}`;
}
