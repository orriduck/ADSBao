"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import AircraftTable from "./AircraftTable";
import AirportIdentity from "./AirportIdentity";
import SidebarViewSwitch from "./SidebarViewSwitch";
import WeatherBriefingStack from "./WeatherBriefingStack";
import RequestPulseDots from "@/components/ui/RequestPulseDots";

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
  selectedAircraftId = "",
  lastUpdated = null,
  feedStatus = "live",
  feedSource = "",
  onSelectAircraft,
  onBack,
  onClose = null,
}) {
  const isMobileOverlay = Boolean(onClose);
  const updatedLabel = formatUpdated(lastUpdated);
  const [activeView, setActiveView] = useState("traffic");

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
          className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-normal text-atc-faint transition-colors hover:text-atc-text"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>ADSBao</span>
        </button>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-normal text-atc-faint transition-colors hover:text-atc-text"
          >
            <span>Map</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : (
          <span
            className={`airport-feed-status airport-feed-status--${feedStatus} inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-normal text-atc-dim tabular-nums`}
          >
            {feedSource ? (
              <span className="airport-feed-status__source">{feedSource}</span>
            ) : null}
            <RequestPulseDots ariaLabel="Live feed" />
            {updatedLabel ? <span key={updatedLabel}>{updatedLabel}</span> : null}
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
          <SidebarViewSwitch
            activeView={activeView}
            onViewChange={setActiveView}
            metar={metar}
            aircraftCount={aircraft.length}
          />
        </div>
        <div
          className={
            isMobileOverlay
              ? "flex-none overflow-visible"
              : "flex-1 overflow-y-auto"
          }
        >
          {activeView === "briefing" ? (
            <WeatherBriefingStack
              icao={icao}
              iata={iata}
              name={name}
              city={city}
              country={country}
              metar={metar}
              metarRaw={metarRaw}
              metarLoading={metarLoading}
              metarError={metarError}
              airportCode={iata || icao}
              airportLat={lat}
              airportLon={lon}
            />
          ) : (
            <AircraftTable
              aircraft={aircraft}
              selectedAircraftId={selectedAircraftId}
              onSelectAircraft={onSelectAircraft}
              fill={!isMobileOverlay}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function formatUpdated(date) {
  if (!date) return "";
  return date.toLocaleTimeString([], {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
