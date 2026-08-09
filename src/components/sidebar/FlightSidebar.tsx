import { useState } from "react";
import NumberFlow from "@number-flow/react";
import AircraftTable from "./AircraftTable";
import SidebarIdentityHero from "./SidebarIdentityHero";
import SidebarShell from "./SidebarShell";
import {
  SidebarLoadingContent,
  SidebarLoadingHeader,
} from "./SidebarLoadingSkeleton";
import StatTile from "@/components/ui/StatTile";
import {
  formatFlightRouteLabel,
  getFlightRouteAccuracyNotice,
  getFlightRouteAirlineIconUrl,
} from "@/utils/flightRouteDisplay";
import { getAircraftPositionSourceBadge } from "@/features/aviation/sourceDisplayModel";
import { resolveAircraftDisplayModel } from "@/features/aircraft/aircraftTypeDisplayModel";
import {
  formatFlightTelemetryMetric,
} from "@/features/aircraft/tracking/flightTelemetryDisplayModel";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { toFiniteNumber } from "@/utils/math";
import type { FlightJourneyProgress } from "@/features/aircraft/onboard/flightJourneyProgressModel";

type FlightSidebarRecord = Record<string, any>;

// Sidebar for /aircraft/[callsign]. Shares chrome (SidebarShell), identity
// hero (SidebarIdentityHero), and the stat-card layout (SidebarMetricGrid)
// with the airport sidebar. The only flight-specific piece is the
// FlightIdentity content slot.
export default function FlightSidebar({
  callsign = "",
  aircraft = null,
  nearbyAircraft = [],
  nearbyAirports = [],
  focusLat = null,
  focusLon = null,
  selectedAircraftId = "",
  suppressedAircraftDistanceId = "",
  selectedAirportIcao = "",
  onSelectAircraft,
  onSelectAirport,
  showNearbyList = true,
  feedSource = "",
  lastUpdated = null,
  loadingStatus = "",
  onBack,
  onMap = null,
  onClose = null,
  collapsed = false,
  collapseEnabled = false,
  onCollapse = null,
  onExpand = null,
  mobileToolbar = null,
  fillAircraftList = true,
  onboardMode = false,
  journeyProgress = null,
  trackingRunStatus = "",
  loading = false,
}) {
  const { t } = useI18n();
  const isMobileOverlay = Boolean(onClose);
  const displayCallsign =
    (aircraft?.callsign || callsign || "").trim() || "—";
  const typeDisplay = resolveAircraftDisplayModel(aircraft || {});
  const route = formatFlightRouteLabel(aircraft?.flightRoute) || "";
  const airlineIconUrl = getFlightRouteAirlineIconUrl(aircraft?.flightRoute);
  const routeAccuracyNotice = getFlightRouteAccuracyNotice(aircraft?.flightRoute);
  const speed = toFiniteNumber(aircraft?.velocity);
  const altitude = toFiniteNumber(aircraft?.altitude);
  const vs = toFiniteNumber(aircraft?.baroRate);
  const track = toFiniteNumber(aircraft?.track);
  const onGround = Boolean(aircraft?.onGround);
  const trackingActive =
    trackingRunStatus === "active" || trackingRunStatus === "lost_signal";
  const positionSourceBadge = getAircraftPositionSourceBadge(
    aircraft?.positionQuality,
  );

  const header = loading ? (
    <SidebarLoadingHeader variant="flight" />
  ) : (
    <>
      <FlightIdentity
        callsign={displayCallsign}
        typeDisplay={typeDisplay}
        route={route}
        airlineIconUrl={airlineIconUrl}
        routeAccuracyNotice={routeAccuracyNotice}
        positionSourceBadge={positionSourceBadge}
      />
      {onboardMode && journeyProgress ? (
        <FlightJourneyProgressCard progress={journeyProgress} />
      ) : null}
      <FlightTelemetryGrid
        speed={speed}
        altitude={altitude}
        vs={vs}
        track={track}
        onGround={onGround}
        trackingActive={trackingActive}
      />
    </>
  );

  return (
    <SidebarShell
      variant="flight"
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
      {loading ? (
        <SidebarLoadingContent />
      ) : showNearbyList ? (
        <AircraftTable
          aircraft={nearbyAircraft}
          airports={nearbyAirports}
          focusLat={focusLat}
          focusLon={focusLon}
          selectedAircraftId={selectedAircraftId}
          suppressedAircraftDistanceId={suppressedAircraftDistanceId}
          selectedAirportIcao={selectedAirportIcao}
          suppressSelectedAircraftDistance
          onSelectAircraft={onSelectAircraft}
          onSelectAirport={onSelectAirport}
          fill={fillAircraftList}
        />
      ) : null}
    </SidebarShell>
  );
}

function FlightJourneyProgressCard({
  progress,
}: {
  progress: FlightJourneyProgress;
}) {
  const { t } = useI18n();
  const percent = Math.round(progress.progress * 100);
  return (
    <section className="mx-[var(--airport-sidebar-inset)] mt-3 overflow-hidden rounded-[var(--atc-radius-card)] border border-[var(--app-frost-border)] bg-[var(--atc-control-surface-muted)] p-3 shadow-[var(--atc-control-inset-shadow-subtle)]">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-atc-dim">
          {t("onboard.modeLabel")}
        </span>
        <span className="text-[11px] font-semibold text-atc-text">
          {t(`onboard.phase.${progress.phase}`)}
        </span>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--atc-text)_12%,transparent)]"
        aria-label={t("onboard.progressAria", { percent })}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div
          className="h-full rounded-full bg-atc-text transition-[width] duration-200 ease-out motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
    </section>
  );
}

function FlightIdentity({
  callsign,
  typeDisplay,
  route,
  airlineIconUrl,
  routeAccuracyNotice,
  positionSourceBadge,
}) {
  const { t } = useI18n();
  const hasTypeDisplay =
    typeDisplay?.displayName && typeDisplay.displayName !== "N/A";
  const secondary = [typeDisplay?.icaoType, typeDisplay?.category]
    .filter(Boolean)
    .join(" / ");
  return (
    <SidebarIdentityHero label={t("sidebar.tracking")} code={callsign}>
      {hasTypeDisplay && (
        <div className="mt-2 flex min-w-0 items-baseline gap-2">
          <span
            className="notranslate min-w-0 truncate font-mono text-[calc(13px*var(--sb-body-scale))] font-semibold italic text-atc-text"
            translate="no"
            title={typeDisplay.displayName}
          >
            {typeDisplay.displayName}
          </span>
          {secondary && (
            <span
              className="notranslate atc-chip flex-none"
              translate="no"
              title={secondary}
            >
              <span>{secondary}</span>
            </span>
          )}
        </div>
      )}
      {route ? (
        <div
          className="notranslate mt-2 flex items-center gap-2 font-mono text-[calc(12px*var(--sb-body-scale))] tracking-[0.04em] text-atc-dim"
          translate="no"
          title={routeAccuracyNotice || route}
        >
          {airlineIconUrl && (
            <img
              src={airlineIconUrl}
              alt=""
              className="aircraft-table-airline-logo"
              loading="lazy"
              decoding="async"
            />
          )}
          <span>{route}</span>
        </div>
      ) : null}
      {positionSourceBadge ? (
        <div className="notranslate mt-2 inline-flex items-center rounded-[3px] border border-atc-line px-1.5 py-0.5 font-mono text-[calc(10px*var(--sb-body-scale))] font-semibold uppercase tracking-normal text-atc-dim" translate="no">
          {positionSourceBadge}
        </div>
      ) : null}
    </SidebarIdentityHero>
  );
}

function FlightTelemetryGrid({
  speed,
  altitude,
  vs,
  track,
  onGround,
  trackingActive,
}) {
  const { t } = useI18n();
  // Focus only marks the metric the user is reading. It does not alter a
  // value's units or representation, and one metric is always focused.
  const [focusedMetric, setFocusedMetric] = useState("speed");
  const speedDisplay = formatFlightTelemetryMetric({
    metric: "speed",
    value: speed,
  });
  const altitudeDisplay = formatFlightTelemetryMetric({
    metric: "altitude",
    value: altitude,
  });
  const verticalSpeedDisplay = formatFlightTelemetryMetric({
    metric: "verticalSpeed",
    value: vs,
  });

  const altitudeValue = onGround
    ? t("aircraft.gnd")
    : altitudeDisplay
      ? (
          <MetricNumberFlow
            value={altitudeDisplay.value}
            suffix={altitudeDisplay.suffix}
          />
        )
      : "—";
  const trackValue =
    track == null
      ? "—"
      : (
          <MetricNumberFlow
            value={Math.round(track)}
            suffix="°"
            suffixPosition="sup"
          />
        );
  const phaseValue = onGround
    ? t("aircraft.ground")
    : altitude != null || trackingActive
      ? t("aircraft.airborne")
      : "—";

  // Speed occupies the opening row; the remaining four equally sized metrics
  // form two pairs. The orange focus moves between metrics without changing
  // their underlying representation.
  return (
    <div className="px-[var(--airport-sidebar-inset)] pt-3.5">
      <div className="sidebar-hero-stats overflow-hidden">
        <div className="grid grid-cols-2">
          <StatTile
            size="hero"
            className="col-span-2"
            label={t("metrics.speed")}
            active={focusedMetric === "speed"}
            onClick={() => setFocusedMetric("speed")}
            value={
              speedDisplay ? (
                <MetricNumberFlow
                  value={speedDisplay.value}
                  suffix={speedDisplay.suffix}
                />
              ) : (
                "—"
              )
            }
          />
        </div>
        <div className="grid grid-cols-2 border-t border-[var(--app-frost-border)]">
          <StatTile
            label={t("metrics.altitude")}
            active={focusedMetric === "altitude"}
            onClick={() => setFocusedMetric("altitude")}
            value={altitudeValue}
          />
          <StatTile
            label={t("metrics.verticalSpeed")}
            active={focusedMetric === "vs"}
            onClick={() => setFocusedMetric("vs")}
            value={
              verticalSpeedDisplay ? (
                <MetricNumberFlow
                  value={verticalSpeedDisplay.value}
                  format={verticalSpeedDisplay.format}
                  suffix={verticalSpeedDisplay.suffix}
                />
              ) : (
                "—"
              )
            }
          />
        </div>
        <div className="grid grid-cols-2 border-t border-[var(--app-frost-border)]">
          <StatTile
            label={t("metrics.track")}
            active={focusedMetric === "track"}
            onClick={() => setFocusedMetric("track")}
            value={trackValue}
          />
          <StatTile
            label={t("metrics.flightPhase")}
            active={focusedMetric === "status"}
            onClick={() => setFocusedMetric("status")}
            value={phaseValue}
          />
        </div>
      </div>
    </div>
  );
}

function MetricNumberFlow({
  value,
  suffix,
  format,
  suffixPosition = "sub",
}: FlightSidebarRecord) {
  return (
    <NumberFlow
      value={value}
      suffix={suffix}
      format={format}
      className="sidebar-metric-number-flow"
      data-suffix-position={suffixPosition}
    />
  );
}
