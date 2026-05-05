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
  lastUpdated = null,
  onBack,
  onClose = null,
}) {
  return (
    <div className="flex h-full flex-col border-r border-atc-line-strong bg-atc-bg">
      <div className="flex h-11 flex-none items-center justify-between border-b border-atc-line-strong px-6 gap-4">
        <button
          type="button"
          onClick={onBack}
          className="font-mono text-[10px] uppercase tracking-[0.22em] text-atc-faint transition-colors hover:text-atc-text"
        >
          ← ADSBao
        </button>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[10px] uppercase tracking-[0.22em] text-atc-faint transition-colors hover:text-atc-text"
          >
            Map →
          </button>
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-atc-dim">
            {formatUpdated(lastUpdated)}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
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
        <AircraftTable aircraft={aircraft} />
      </div>
    </div>
  );
}

function formatUpdated(date) {
  if (!date) return "Live · syncing";
  return `Live · ${date.toLocaleTimeString([], {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })}`;
}
