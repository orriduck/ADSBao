import { useState } from "react";
import { Camera, ExternalLink, RadioTower } from "lucide-react";
import AircraftTable from "./AircraftTable";
import AirportIdentity from "./AirportIdentity";
import FlightRadar24Link from "./FlightRadar24Link";
import SidebarShell from "./SidebarShell";
import SidebarViewSwitch from "./SidebarViewSwitch";
import {
  SidebarLoadingContent,
  SidebarLoadingHeader,
} from "./SidebarLoadingSkeleton";
import WeatherBriefingStack from "./WeatherBriefingStack";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useLocalWeather } from "@/hooks/useLocalWeather";
import { useStablePlaceWeatherCoords } from "@/hooks/useStablePlaceWeatherCoords";

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
  loadingStatus = "",
  aircraftLoading = false,
  // When true the explorer is centered on the user (not an airport).
  // The identity hero swaps to a "Your location" header and the
  // metric cards collapse to weather + nearby traffic.
  nearMe = false,
  nearMeSelfSpeedMps = null,
  nearMeSelfAltitudeMeters = null,
  nearMeSelfHeadingDeg = null,
  nearMeRefresh,
  onSelectAircraft,
  onSelectAirport,
  onSelectCandidateWatchingSpot,
  onOpenSpotting,
  onBack,
  onMap = null,
  onClose = null,
  mobileToolbar = null,
  fillAircraftList = true,
  loading = false,
}) {
  const { t, locale } = useI18n();
  const [activeView, setActiveView] = useState("traffic");
  const atcFrequencies = Array.isArray(frequencies) ? frequencies : [];
  const spottingSpots = Array.isArray(candidateWatchingSpots)
    ? candidateWatchingSpots
    : [];
  const weatherFocusLat = nearMe ? placeLat ?? lat : lat;
  const weatherFocusLon = nearMe ? placeLon ?? lon : lon;
  const stableWeatherCoords = useStablePlaceWeatherCoords(
    weatherFocusLat,
    weatherFocusLon,
    { enabled: nearMe, language: locale },
  );
  const localWeatherCoords = nearMe
    ? stableWeatherCoords
    : { lat: weatherFocusLat, lon: weatherFocusLon };
  const { weather: localWeather, loading: localWeatherLoading } = useLocalWeather(
    localWeatherCoords.lat,
    localWeatherCoords.lon,
  );
  const flightRadarIcao = String(icao || "").trim().toLowerCase();
  // Here has no airport ICAO, and therefore no provider link. Do not pass an
  // empty React element as a footer: SidebarViewSwitch uses footer presence to
  // select its joined-card layout, which would otherwise add an unnecessary
  // clipping wrapper around Here's metrics.
  const flightRadarFooter = flightRadarIcao ? (
    <FlightRadar24Link
      identifier={flightRadarIcao.toUpperCase()}
      subject="airport"
      flightAwareHref={`https://www.flightaware.com/live/airport/${encodeURIComponent(flightRadarIcao.toUpperCase())}`}
      flightRadarHref={`https://www.flightradar24.com/airport/${encodeURIComponent(flightRadarIcao)}`}
    />
  ) : null;

  const handleSpottingView = () => {
    const previousView = activeView;
    setActiveView("spotting");
    onOpenSpotting?.(previousView);
  };

  const header = loading ? (
    <SidebarLoadingHeader variant="airport" />
  ) : (
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
        localWeather={localWeather}
        localWeatherLoading={localWeatherLoading}
        aircraft={aircraft}
        nearbyAirportCount={airports.length}
        frequencies={atcFrequencies}
        candidateSpotCount={spottingSpots.length}
        onOpenSpotting={handleSpottingView}
        nearMe={nearMe}
        nearMeSelfSpeedMps={nearMeSelfSpeedMps}
        nearMeSelfAltitudeMeters={nearMeSelfAltitudeMeters}
        nearMeSelfHeadingDeg={nearMeSelfHeadingDeg}
        footer={flightRadarFooter}
      />
    </>
  );
  const activeViewContent =
    activeView === "weather" || activeView === "flightRules" ? (
      <WeatherBriefingStack
        metar={metar}
        metarRaw={metarRaw}
        metarLoading={metarLoading}
        localWeather={localWeather}
        localWeatherLoading={localWeatherLoading}
        view={activeView === "weather" ? "local" : "metar"}
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
        movementFilter="all"
        onSelectAircraft={onSelectAircraft}
        onSelectAirport={onSelectAirport}
        fill={fillAircraftList}
        aircraftLoading={aircraftLoading}
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
      mobileToolbar={mobileToolbar}
    >
      <div
        key={activeView}
        className={
          // The whole sidebar is ONE scroll region (owned by the shell panel),
          // so this content area never owns a nested scroll: it flows at its
          // natural height and the panel scrolls. The traffic list still
          // windows — it virtualizes against the shared panel scroll element
          // (see VirtualNearbyList). Same on desktop and the mobile overlay.
          "airport-sidebar-content app-panel-transition flex min-h-0 flex-1 flex-col overflow-visible"
        }
      >
        {loading ? <SidebarLoadingContent /> : activeViewContent}
      </div>
    </SidebarShell>
  );
}

// Frequencies are inherently a table: role on the left, the channel in mono
// on the right. Ordered by the operational flow a pilot follows on the ground
// and into the air (ATIS → Clearance → Ground → Tower → Approach → Departure).
// The role is inferred from the callsign/description (the raw `type` field is
// not a reliable canonical key across data sources).
const ATC_ROLE_ORDER = [
  "ATIS",
  "Clearance",
  "Ground",
  "Tower",
  "Approach",
  "Departure",
  "CTAF",
  "UNICOM",
  "Gate",
];

const atcRoleRank = (role: string) => {
  const index = ATC_ROLE_ORDER.indexOf(role);
  return index === -1 ? ATC_ROLE_ORDER.length : index;
};

const atcRoleOf = (frequency) =>
  inferFrequencyType(frequency.description) ||
  inferFrequencyType(frequency.callsign) ||
  inferFrequencyType(String(frequency.type || "")) ||
  "";

function AtcFrequencyPanel({ icao = "", frequencies = [] }) {
  const normalizedIcao = String(icao || "").trim().toUpperCase();
  const liveAtcHref = `https://www.liveatc.net/search/?icao=${encodeURIComponent(
    normalizedIcao,
  )}`;
  const rows = [...frequencies]
    .map((frequency) => {
      const frequencyMhz = frequency.frequencyMHz ?? frequency.frequencyMhz;
      const inferredRole = atcRoleOf(frequency);
      const role =
        inferredRole || formatFrequencyType(frequency.type, frequency.description);
      const detail =
        frequency.callsign && frequency.callsign !== role
          ? frequency.callsign
          : frequency.description && frequency.description !== role
            ? frequency.description
            : "";
      return { id: frequency.id, role, inferredRole, detail, frequencyMhz };
    })
    .sort((left, right) => {
      const rank = atcRoleRank(left.inferredRole) - atcRoleRank(right.inferredRole);
      if (rank !== 0) return rank;
      return (left.frequencyMhz ?? 0) - (right.frequencyMhz ?? 0);
    });

  return (
    <div className="atc-wayfinding-panel flex flex-col pb-5">
      <div className="flex items-baseline justify-between border-b border-[var(--airport-wayfinding-divider)] bg-[var(--airport-wayfinding-content)] px-[var(--airport-sidebar-inset)] py-3">
        <h2 className="text-[calc(11px*var(--sb-title-scale))] uppercase tracking-normal text-atc-text">
          ATC Frequencies
        </h2>
        <span className="font-mono text-[calc(9px*var(--sb-body-scale))] uppercase text-atc-faint">
          {frequencies.length} channels
        </span>
      </div>
      {normalizedIcao ? (
        <a
          href={liveAtcHref}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="inline-flex min-h-11 items-center justify-between gap-2 bg-[var(--airport-wayfinding-secondary)] px-[var(--airport-sidebar-inset)] text-[calc(10px*var(--sb-body-scale))] text-[var(--airport-wayfinding-secondary-fg)] transition-opacity hover:opacity-90"
        >
          <span>Search {normalizedIcao} on LiveATC</span>
          <ExternalLink aria-hidden="true" className="size-3.5" strokeWidth={2} />
        </a>
      ) : null}
      {rows.length === 0 ? (
        <div className="flex min-h-20 border-b border-[var(--airport-wayfinding-divider)]">
          <span className="flex w-[var(--airport-wayfinding-rail-width)] shrink-0 items-start justify-center bg-[var(--airport-wayfinding-neutral-rail)] pt-3 text-[var(--airport-wayfinding-neutral-rail-fg)]"><RadioTower className="size-4" /></span>
          <p className="flex flex-1 items-center bg-[var(--airport-wayfinding-content)] px-3 text-[calc(11px*var(--sb-body-scale))] leading-snug text-atc-dim">No published frequencies for this airport.</p>
        </div>
      ) : (
        <div className="app-list-motion atc-freq-table flex flex-col">
          {rows.map((row, index) => (
            <div
              key={row.id || `${row.inferredRole}-${row.frequencyMhz}-${index}`}
              className="flex min-h-[66px] border-b border-[var(--airport-wayfinding-divider)]"
            >
              <span className="flex w-[var(--airport-wayfinding-rail-width)] shrink-0 items-start justify-center bg-[var(--airport-wayfinding-neutral-rail)] pt-3 text-[var(--airport-wayfinding-neutral-rail-fg)]"><RadioTower className="size-4" strokeWidth={1.8} /></span>
              <div className="flex min-w-0 flex-1 items-center justify-between gap-3 bg-[var(--airport-wayfinding-content)] px-3">
                <div className="min-w-0">
                <div className="truncate text-[calc(11.5px*var(--sb-body-scale))] text-atc-text">{row.role}</div>
                {row.detail ? (
                  <div className="truncate text-[calc(9px*var(--sb-body-scale))] uppercase tracking-[0.06em] text-atc-faint">
                    {row.detail}
                  </div>
                ) : null}
              </div>
              <span
                className="notranslate shrink-0 font-mono text-[calc(12.5px*var(--sb-body-scale))] tabular-nums text-atc-text"
                translate="no"
              >
                {formatFrequencyBadge(row.frequencyMhz)}
              </span>
              </div>
            </div>
          ))}
        </div>
      )}
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
    <div className="spotting-wayfinding-panel flex flex-col pb-5">
      <div className="flex items-baseline justify-between border-b border-[var(--airport-wayfinding-divider)] bg-[var(--airport-wayfinding-content)] px-[var(--airport-sidebar-inset)] py-3">
        <h2 className="text-[calc(11px*var(--sb-title-scale))] uppercase tracking-normal text-atc-text">
          {t("watcherMode.cardsTitle")}
        </h2>
        <span className="font-mono text-[calc(9px*var(--sb-body-scale))] uppercase text-atc-faint">
          {t(countKey, { count: spots.length })}
        </span>
      </div>
      {spots.length === 0 ? (
        <div className="flex min-h-20 border-b border-[var(--airport-wayfinding-divider)]">
          <span className="flex w-[var(--airport-wayfinding-rail-width)] shrink-0 items-start justify-center bg-[var(--airport-wayfinding-neutral-rail)] pt-3 text-[var(--airport-wayfinding-neutral-rail-fg)]"><Camera className="size-4" /></span>
          <p className="flex flex-1 items-center bg-[var(--airport-wayfinding-content)] px-3 text-[calc(11px*var(--sb-body-scale))] leading-snug text-atc-dim">{t("watcherMode.empty")}</p>
        </div>
      ) : null}
      <div className="app-list-motion grid grid-cols-1 gap-0">
        {spots.map((spot) => {
          const active = Boolean(selectedSpotId && selectedSpotId === spot.id);
          return (
            <button
              type="button"
              key={spot.id}
              data-active={active ? "true" : undefined}
              onClick={() => onSelectSpot?.(spot.id)}
              className="group flex min-h-[72px] border-b border-[var(--airport-wayfinding-divider)] text-left"
            >
              <span className="flex w-[var(--airport-wayfinding-rail-width)] shrink-0 items-start justify-center bg-[var(--airport-wayfinding-neutral-rail)] pt-3 text-[var(--airport-wayfinding-neutral-rail-fg)] transition-colors group-data-[active=true]:bg-[color-mix(in_oklab,var(--atc-text)_27%,var(--app-frost-tint))]"><Camera className="size-4" strokeWidth={1.8} /></span>
              <div className="flex min-w-0 flex-1 flex-col justify-center bg-[var(--airport-wayfinding-content)] px-3 py-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[calc(10px*var(--sb-body-scale))] uppercase tracking-normal text-atc-text group-data-[active=true]:text-[var(--atc-click-fg)]">
                    {spot.name || spot.title || spot.category || "Spotter location"}
                  </div>
                  <div className="mt-1 text-[calc(10px*var(--sb-body-scale))] text-atc-dim group-data-[active=true]:text-[var(--atc-click-muted)]">
                    {spot.what || spot.category || spot.sourceLabel || "Photo guide"}
                  </div>
                </div>
                {spot.spotNumber ? (
                  <span className="shrink-0 font-mono text-[calc(9px*var(--sb-body-scale))] text-atc-faint group-data-[active=true]:text-[var(--atc-click-muted)]">
                    #{spot.spotNumber}
                  </span>
                ) : null}
              </div>
              {spot.focalLength || spot.when ? (
                <div className="mt-1.5 font-mono text-[calc(8px*var(--sb-body-scale))] uppercase text-atc-faint group-data-[active=true]:text-[var(--atc-click-muted)]">
                  {[spot.focalLength, spot.when].filter(Boolean).join(" · ")}
                </div>
              ) : null}
              </div>
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
