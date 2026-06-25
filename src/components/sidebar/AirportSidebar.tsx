import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import AircraftTable from "./AircraftTable";
import AirportIdentity from "./AirportIdentity";
import SidebarShell from "./SidebarShell";
import SidebarViewSwitch from "./SidebarViewSwitch";
import WeatherBriefingStack from "./WeatherBriefingStack";
import { TextPillListItem } from "@/components/ui/TextPillListItem";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
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
  placeLat = null,
  placeLon = null,
  metar = null,
  metarRaw = "",
  metarLoading = false,
  metarError = null,
  metarStatusCode = null,
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
  flightAwareResolved = true,
  loadingStatus = "",
  // When true the explorer is centered on the user (not an airport).
  // The identity hero swaps to a "Your location" header and the
  // metric cards collapse to weather + nearby traffic.
  nearMe = false,
  nearMeRefresh,
  onSelectAircraft,
  onSelectAirport,
  onSelectCandidateWatchingSpot,
  onOpenSpotting,
  onBack,
  onMap = null,
  onClose = null,
  collapsed = false,
  collapseEnabled = false,
  onCollapse = null,
  onExpand = null,
  mobileToolbar = null,
  fillAircraftList = true,
}) {
  const { t } = useI18n();
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
        placeLat={placeLat}
        placeLon={placeLon}
        nearMe={nearMe}
        nearMeRefresh={nearMeRefresh}
      />
      <SidebarViewSwitch
        activeView={activeView}
        onViewChange={setActiveView}
        metar={metar}
        metarLoading={metarLoading}
        aircraft={aircraft}
        routeProvider={routeProvider}
        frequencies={atcFrequencies}
        candidateSpotCount={spottingSpots.length}
        onOpenSpotting={handleSpottingView}
        nearMe={nearMe}
        featureFlagsResolved={flightAwareResolved}
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
        metarStatusCode={metarStatusCode}
        airportCode={iata || icao}
        airportLat={lat}
        airportLon={lon}
        nearMe={nearMe}
      />
    ) : activeView === "atc" ? (
      <AtcFrequencyPanel icao={icao} frequencies={atcFrequencies} />
    ) : activeView === "spotting" ? (
      <SpottingPanel
        spots={spottingSpots}
        selectedSpotId={selectedCandidateWatchingSpotId}
        onSelectSpot={onSelectCandidateWatchingSpot}
        t={t}
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
        fill={fillAircraftList}
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
      collapsed={collapsed}
      collapseEnabled={collapseEnabled}
      onCollapse={onCollapse}
      onExpand={onExpand}
      header={header}
      mobileToolbar={mobileToolbar}
    >
      <div
        key={`${activeView}:${movementFilter}`}
        className={
          isMobileOverlay
            ? // The traffic list owns its own (virtualized) scroll, so the
              // overlay content area clips; every other view (weather / ATC /
              // spotting) scrolls normally so its content is never cut off.
              `airport-sidebar-content app-panel-transition flex min-h-0 flex-1 flex-col ${
                activeView === "traffic" ? "overflow-hidden" : "overflow-y-auto"
              }`
            : "airport-sidebar-content app-panel-transition flex min-h-0 flex-col"
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
    <div className="flex flex-col gap-2 px-[var(--airport-sidebar-inset)] pb-5 pt-1">
      <div className="flex items-baseline justify-between pb-0.5">
        <h2 className="text-[11px] font-bold uppercase tracking-normal text-atc-text">
          ATC Frequencies
        </h2>
        <span className="font-mono text-[9px] font-semibold uppercase text-atc-faint">
          {frequencies.length} channels
        </span>
      </div>
      {normalizedIcao ? (
        <a
          href={liveAtcHref}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="inline-flex items-center justify-between gap-2 px-2 py-1 text-[9.5px] font-semibold uppercase tracking-normal text-atc-dim transition-colors hover:text-atc-text"
        >
          <span>Search {normalizedIcao} on LiveATC</span>
          <ExternalLink aria-hidden="true" className="size-3.5" strokeWidth={2.3} />
        </a>
      ) : null}
      {frequencies.length === 0 ? (
        <p className="app-panel-transition rounded-[var(--atc-radius-card)] border border-[var(--app-frost-border)] bg-[color-mix(in_oklab,var(--app-frost-tint)_22%,transparent)] px-3 py-5 text-center text-[11px] font-medium leading-snug text-atc-dim">
          No published frequencies for this airport.
        </p>
      ) : null}
      <div className="app-list-motion grid gap-1">
        {frequencies.map((frequency, index) => {
          const frequencyMhz = frequency.frequencyMHz ?? frequency.frequencyMhz;
          return (
            <TextPillListItem
              key={frequency.id || `${frequency.type}-${frequencyMhz}-${index}`}
              pill={
                <span className="notranslate" translate="no">
                  {formatFrequencyBadge(frequencyMhz)}
                </span>
              }
              title={
                frequency.callsign ||
                frequency.description ||
                formatFrequencyType(frequency.type)
              }
              subtitle={formatFrequencyType(frequency.type, frequency.description)}
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
          );
        })}
      </div>
    </div>
  );
}

function SpottingPanel({
  spots = [],
  selectedSpotId = "",
  onSelectSpot,
  t,
}) {
  const countKey =
    spots.length === 1 ? "watcherMode.countOne" : "watcherMode.countMany";
  return (
    <div className="flex flex-col gap-2 px-[var(--airport-sidebar-inset)] pb-5 pt-1">
      <div className="flex items-baseline justify-between pb-0.5">
        <h2 className="text-[11px] font-bold uppercase tracking-normal text-atc-text">
          {t("watcherMode.cardsTitle")}
        </h2>
        <span className="font-mono text-[9px] font-semibold uppercase text-atc-faint">
          {t(countKey, { count: spots.length })}
        </span>
      </div>
      {spots.length === 0 ? (
        <p className="app-panel-transition rounded-[var(--atc-radius-card)] border border-[var(--app-frost-border)] bg-[color-mix(in_oklab,var(--app-frost-tint)_22%,transparent)] px-3 py-5 text-center text-[11px] font-medium leading-snug text-atc-dim">
          {t("watcherMode.empty")}
        </p>
      ) : null}
      <div className="app-list-motion grid gap-1">
        {spots.map((spot) => {
          const active = Boolean(selectedSpotId && selectedSpotId === spot.id);
          return (
            <button
              type="button"
              key={spot.id}
              data-active={active ? "true" : undefined}
              onClick={() => onSelectSpot?.(spot.id)}
              className="group rounded-[calc(var(--atc-radius-card)_-_2px)] px-2 py-1.5 text-left transition-[background,box-shadow,color] hover:bg-[var(--atc-control-hover-bg)] data-[active=true]:[background:var(--atc-glass-active-bg)] data-[active=true]:text-[var(--atc-click-fg)] data-[active=true]:shadow-[var(--atc-glass-rim-shadow)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[10px] font-bold uppercase tracking-normal text-atc-text group-data-[active=true]:text-[var(--atc-click-fg)]">
                    {spot.name || spot.title || spot.category || "Spotter location"}
                  </div>
                  <div className="mt-1 text-[10px] font-medium text-atc-dim group-data-[active=true]:text-[var(--atc-click-muted)]">
                    {spot.what || spot.category || spot.sourceLabel || "Photo guide"}
                  </div>
                </div>
                {spot.spotNumber ? (
                  <span className="shrink-0 font-mono text-[9px] font-semibold text-atc-faint group-data-[active=true]:text-[var(--atc-click-muted)]">
                    #{spot.spotNumber}
                  </span>
                ) : null}
              </div>
              {spot.focalLength || spot.when ? (
                <div className="mt-1.5 font-mono text-[8px] font-semibold uppercase text-atc-faint group-data-[active=true]:text-[var(--atc-click-muted)]">
                  {[spot.focalLength, spot.when].filter(Boolean).join(" · ")}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatFrequencyBadge(value) {
  const frequency = Number(value);
  if (!Number.isFinite(frequency)) return "—";
  return frequency.toFixed(3);
}

function formatFrequencyType(value, description = "") {
  const inferred = inferFrequencyType(description);
  if (inferred) return inferred;
  if (/^\d+$/.test(String(value || "").trim())) return "Airport frequency";
  const text = String(value || "other").replace(/-/g, " ");
  return text.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function inferFrequencyType(description) {
  const normalized = String(description || "").toUpperCase();
  if (/\bAPP(ROACH)?\b/.test(normalized)) return "Approach";
  if (/\bDEP(ARTURE)?\b/.test(normalized)) return "Departure";
  if (/\bTWR\b|\bTOWER\b/.test(normalized)) return "Tower";
  if (/\bGND\b|\bGROUND\b/.test(normalized)) return "Ground";
  if (/\bCLNC\b|\bCLD\b|\bCLR\b|\bCLEARANCE\b/.test(normalized)) {
    return "Clearance";
  }
  if (/\bATIS\b/.test(normalized)) return "ATIS";
  if (/\bUNICOM\b/.test(normalized)) return "UNICOM";
  if (/\bCTAF\b/.test(normalized)) return "CTAF";
  if (/\bGATE\b/.test(normalized)) return "Gate";
  return "";
}

function visibleFrequencySources(frequency) {
  const sources = (frequency.sources || [frequency.source]).filter(Boolean);
  if (sources.length === 1 && sources[0] === "openaip") return [];
  return sources;
}
