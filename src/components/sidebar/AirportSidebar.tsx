"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import AircraftTable from "./AircraftTable";
import AirportIdentity from "./AirportIdentity";
import SidebarShell from "./SidebarShell";
import SidebarViewSwitch from "./SidebarViewSwitch";
import WeatherBriefingStack from "./WeatherBriefingStack";
import { TextPillListItem } from "@/components/ui/TextPillListItem";
import { ROUTE_PROVIDER } from "@/features/aviation/sourceDisplayModel";

export default function AirportSidebar({
  icao = "",
  iata = "",
  name = "",
  localizedName = "",
  city = "",
  country = "",
  lat = 0,
  lon = 0,
  metar = null,
  metarRaw = "",
  metarLoading = false,
  metarError = null,
  aircraft = [],
  airports = [],
  frequencies = [],
  candidateWatchingSpots = [],
  selectedCandidateWatchingSpotId = "",
  focusLat = null,
  focusLon = null,
  selectedAircraftId = "",
  selectedAirportIcao = "",
  lastUpdated = null,
  feedStatus = "live",
  feedSource = "",
  routeProvider = "",
  loadingStatus = "",
  // When true the explorer is centered on the user (not an airport).
  // The identity hero swaps to a "Your location" header and the
  // weather / spotting / ATC / dep+arr metric cards become
  // read-only "—" placeholders (weather still shows the live temp,
  // but doesn't switch to a briefing view on click).
  nearMe = false,
  onSelectAircraft,
  onSelectAirport,
  onSelectCandidateWatchingSpot,
  onOpenSpotting,
  onBack,
  onMap = null,
  onClose = null,
}) {
  const isMobileOverlay = Boolean(onClose);
  const [activeView, setActiveView] = useState("traffic");
  const atcFrequencies = Array.isArray(frequencies) ? frequencies : [];
  const spottingSpots = Array.isArray(candidateWatchingSpots)
    ? candidateWatchingSpots
    : [];
  const movementFilter =
    routeProvider === ROUTE_PROVIDER.FLIGHTAWARE &&
    (activeView === "departures" || activeView === "arrivals")
      ? activeView
      : "all";

  useEffect(() => {
    if (activeView === "atc" && atcFrequencies.length === 0) {
      setActiveView("traffic");
    }
  }, [activeView, atcFrequencies.length]);

  const handleSpottingView = () => {
    const previousView = activeView;
    setActiveView("spotting");
    onOpenSpotting?.(previousView);
  };

  const header = (
    <>
      <AirportIdentity
        icao={icao}
        iata={iata}
        name={name}
        localizedName={localizedName}
        city={city}
        country={country}
        lat={lat}
        lon={lon}
        nearMe={nearMe}
      />
      <SidebarViewSwitch
        activeView={activeView}
        onViewChange={setActiveView}
        metar={metar}
        aircraft={aircraft}
        routeProvider={routeProvider}
        frequencies={atcFrequencies}
        candidateSpotCount={spottingSpots.length}
        onOpenSpotting={handleSpottingView}
        nearMe={nearMe}
      />
    </>
  );
  const activeViewContent =
    activeView === "briefing" ? (
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
    ) : activeView === "atc" ? (
      <AtcFrequencyPanel icao={icao} frequencies={atcFrequencies} />
    ) : activeView === "spotting" ? (
      <SpottingPanel
        spots={spottingSpots}
        selectedSpotId={selectedCandidateWatchingSpotId}
        onSelectSpot={onSelectCandidateWatchingSpot}
      />
    ) : (
      <AircraftTable
        aircraft={aircraft}
        airports={airports}
        focusLat={focusLat}
        focusLon={focusLon}
        selectedAircraftId={selectedAircraftId}
        selectedAirportIcao={selectedAirportIcao}
        movementFilter={movementFilter}
        onSelectAircraft={onSelectAircraft}
        onSelectAirport={onSelectAirport}
        fill={!isMobileOverlay}
      />
    );

  return (
    <SidebarShell
      variant="airport"
      feedStatus={feedStatus}
      feedSource={feedSource}
      lastUpdated={lastUpdated}
      loadingStatus={loadingStatus}
      onBack={onBack}
      onMap={onMap}
      onClose={onClose}
      header={header}
    >
      <div
        key={`${activeView}:${movementFilter}`}
        className={
          isMobileOverlay
            ? "app-panel-transition"
            : "app-panel-transition flex h-full min-h-0 flex-col"
        }
      >
        {activeViewContent}
      </div>
    </SidebarShell>
  );
}

function AtcFrequencyPanel({ icao = "", frequencies = [] }) {
  const normalizedIcao = String(icao || "").trim().toUpperCase();
  const liveAtcHref = `https://www.liveatc.net/search/?icao=${encodeURIComponent(
    normalizedIcao,
  )}`;

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-[var(--airport-sidebar-inset)] pb-6 pt-2">
      <div className="flex items-baseline justify-between border-b border-atc-line pb-2">
        <h2 className="text-[12px] font-bold uppercase tracking-normal text-atc-text">
          ATC Frequencies
        </h2>
        <span className="font-mono text-[10px] font-semibold uppercase text-atc-faint">
          {frequencies.length} channels
        </span>
      </div>
      {normalizedIcao ? (
        <a
          href={liveAtcHref}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-1 mb-0.5 inline-flex items-center justify-center gap-1.5 rounded-[var(--atc-radius-card)] border border-atc-line bg-atc-card/50 px-3 py-2 text-center text-[11px] font-bold uppercase tracking-normal text-atc-text transition-colors hover:bg-[var(--atc-control-hover-bg)]"
        >
          <span>Search {normalizedIcao} on LiveATC</span>
          <ExternalLink aria-hidden="true" className="size-3.5" strokeWidth={2.3} />
        </a>
      ) : null}
      <div className="app-list-motion grid gap-3">
        {frequencies.map((frequency) => (
          <TextPillListItem
            key={`${frequency.type}-${frequency.frequencyMHz}-${frequency.source}`}
            pill={
              <span className="notranslate" translate="no">
                {formatFrequencyBadge(frequency.frequencyMHz)}
              </span>
            }
            title={formatFrequencyType(frequency.type)}
            subtitle={
              frequency.callsign || frequency.description || "Airport frequency"
            }
            meta={visibleFrequencySources(frequency)
              .map((source) => (
                <span
                  key={source}
                  className="rounded-full border border-atc-line px-2 py-1 font-mono text-[7px] font-semibold uppercase leading-none text-atc-faint"
                >
                  {source}
                </span>
              ))}
          />
        ))}
      </div>
    </div>
  );
}

function SpottingPanel({
  spots = [],
  selectedSpotId = "",
  onSelectSpot,
}) {
  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-[var(--airport-sidebar-inset)] pb-6 pt-2">
      <div className="flex items-baseline justify-between border-b border-atc-line pb-2">
        <h2 className="text-[12px] font-bold uppercase tracking-normal text-atc-text">
          Spotting
        </h2>
        <span className="font-mono text-[10px] font-semibold uppercase text-atc-faint">
          {spots.length} spots
        </span>
      </div>
      <div className="app-list-motion grid gap-2">
        {spots.map((spot) => {
          const active = Boolean(selectedSpotId && selectedSpotId === spot.id);
          return (
            <button
              type="button"
              key={spot.id}
              data-active={active ? "true" : undefined}
              onClick={() => onSelectSpot?.(spot.id)}
              className="group rounded-[var(--atc-radius-card)] border border-atc-line bg-atc-card/70 p-3 text-left transition-colors hover:bg-[var(--atc-control-hover-bg)] data-[active=true]:border-transparent data-[active=true]:bg-[var(--atc-click-bg)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[11px] font-bold uppercase tracking-normal text-atc-text group-data-[active=true]:text-[var(--atc-click-fg)]">
                    {spot.name || spot.category || "Candidate spot"}
                  </div>
                  <div className="mt-1 text-[11px] font-medium text-atc-dim group-data-[active=true]:text-[var(--atc-click-muted)]">
                    {spot.category || "map candidate"}
                  </div>
                </div>
                {Number.isFinite(Number(spot.score)) ? (
                  <span className="shrink-0 font-mono text-[10px] font-semibold text-atc-faint group-data-[active=true]:text-[var(--atc-click-muted)]">
                    {Math.round(Number(spot.score))}
                  </span>
                ) : null}
              </div>
              {spot.runwayAlignment?.end ? (
                <div className="mt-2 font-mono text-[9px] font-semibold uppercase text-atc-faint group-data-[active=true]:text-[var(--atc-click-muted)]">
                  RWY {spot.runwayAlignment.end}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatFrequencyMhz(value) {
  const frequency = Number(value);
  if (!Number.isFinite(frequency)) return "—";
  return frequency.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function formatFrequencyBadge(value) {
  const frequency = Number(value);
  if (!Number.isFinite(frequency)) return "—";
  return frequency.toFixed(3);
}

function formatFrequencyType(value) {
  const text = String(value || "other").replace(/-/g, " ");
  return text.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function visibleFrequencySources(frequency) {
  const sources = (frequency.sources || [frequency.source]).filter(Boolean);
  if (sources.length === 1 && sources[0] === "openaip") return [];
  return sources;
}
