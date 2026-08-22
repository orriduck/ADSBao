import { useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp, Compass, Gauge, Minus, Plane, Ruler } from "lucide-react";
import AircraftTable from "./AircraftTable";
import FlightRadar24Link from "./FlightRadar24Link";
import SidebarShell from "./SidebarShell";
import {
  SidebarLoadingContent,
  SidebarLoadingHeader,
} from "./SidebarLoadingSkeleton";
import WayfindingMetric from "@/components/ui/WayfindingMetric";
import WayfindingRail from "@/components/ui/WayfindingRail";
import {
  formatFlightRouteLabel,
  getFlightRouteAccuracyNotice,
  getFlightRouteAirlineIconUrl,
} from "@/utils/flightRouteDisplay";
import { getAircraftPositionSourceBadge } from "@/features/aviation/sourceDisplayModel";
import { resolveAircraftDisplayModel } from "@/features/aircraft/aircraftTypeDisplayModel";
import {
  formatFlightTelemetryMetric,
  resolveTrackDirectionTranslationKey,
  resolveVerticalState,
  resolveVerticalStateTranslationKey,
} from "@/features/aircraft/tracking/flightTelemetryDisplayModel";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { toFiniteNumber } from "@/utils/math";

// Sidebar for /aircraft/[callsign]. It shares the airport page's wayfinding
// grammar while keeping aircraft-specific identity and telemetry content.
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
  mobileToolbar = null,
  fillAircraftList = true,
  trackingRunStatus = "",
  loading = false,
}) {
  const { t } = useI18n();
  const displayCallsign =
    (aircraft?.callsign || callsign || "").trim() || "—";
  const flightRadarCallsign = String(aircraft?.callsign || callsign || "")
    .trim()
    .toUpperCase();
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
        registration={aircraft?.registration}
        icao24={aircraft?.icao24}
        route={route}
        airlineIconUrl={airlineIconUrl}
        routeAccuracyNotice={routeAccuracyNotice}
        positionSourceBadge={positionSourceBadge}
        phase={
          onGround
            ? t("aircraft.ground")
            : altitude != null || trackingActive
              ? t("aircraft.airborne")
              : ""
        }
      />
      <FlightTelemetryGrid
        speed={speed}
        altitude={altitude}
        vs={vs}
        track={track}
        onGround={onGround}
        footer={
          <FlightRadar24Link
            identifier={flightRadarCallsign}
            subject="aircraft"
            flightAwareHref={
              flightRadarCallsign
                ? `https://www.flightaware.com/live/flight/${encodeURIComponent(flightRadarCallsign)}`
                : ""
            }
            flightRadarHref={
              flightRadarCallsign
                ? `https://www.flightradar24.com/${encodeURIComponent(flightRadarCallsign)}`
                : ""
            }
          />
        }
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

function FlightIdentity({
  callsign,
  typeDisplay,
  registration,
  icao24,
  route,
  airlineIconUrl,
  routeAccuracyNotice,
  positionSourceBadge,
  phase,
}) {
  const hasTypeDisplay =
    typeDisplay?.displayName && typeDisplay.displayName !== "N/A";
  const normalizedCallsign = String(callsign || "").trim().toUpperCase();
  const normalizedRegistration = String(registration || "")
    .trim()
    .toUpperCase();
  const secondary = [
    normalizedRegistration && normalizedRegistration !== normalizedCallsign
      ? normalizedRegistration
      : "",
    typeDisplay?.icaoType,
    typeDisplay?.category,
    String(icao24 || "").trim().toUpperCase(),
  ]
    .filter(Boolean)
    .join(" / ");

  return (
    <div className="flight-wayfinding-identity flex min-h-[var(--wayfinding-flight-identity-height)] overflow-hidden">
      <WayfindingRail
        icon={<Plane />}
        inset="hero"
        motionKind="identity"
        tone="primary"
      />
      <div className="flex min-w-0 flex-1 flex-col justify-start bg-[var(--airport-wayfinding-content)] px-[var(--wayfinding-content-inset)] pb-4 pt-[var(--wayfinding-hero-content-top)]">
        <h1
          className="notranslate truncate text-[calc(29px*var(--sb-title-scale))] leading-none tracking-[-0.035em] text-atc-text"
          translate="no"
          title={callsign}
        >
          {callsign}
        </h1>
        {hasTypeDisplay ? (
          <div
            className="mt-3 truncate text-[calc(13px*var(--sb-title-scale))] leading-snug text-atc-text"
            title={typeDisplay.displayName}
          >
            {typeDisplay.displayName}
          </div>
        ) : null}
        {secondary ? (
          <div
            className="notranslate mt-1 truncate text-[calc(10px*var(--sb-body-scale))] leading-snug text-atc-dim"
            translate="no"
            title={secondary}
          >
            {secondary}
          </div>
        ) : null}
        {route || phase || positionSourceBadge ? (
          <div className="mt-2 flex min-w-0 items-center gap-2 text-[calc(10px*var(--sb-body-scale))] leading-snug text-atc-dim">
            {airlineIconUrl ? (
              <img
                src={airlineIconUrl}
                alt=""
                className="aircraft-table-airline-logo"
                loading="lazy"
                decoding="async"
              />
            ) : null}
            <span
              className="notranslate min-w-0 truncate"
              translate="no"
              title={routeAccuracyNotice || route || undefined}
            >
              {[route, phase, positionSourceBadge].filter(Boolean).join("  ·  ")}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FlightTelemetryGrid({
  speed,
  altitude,
  vs,
  track,
  onGround,
  footer = null,
}) {
  const { t } = useI18n();
  const [activeMetric, setActiveMetric] = useState<string | null>(null);
  const toggleMetric = (metric: string) =>
    setActiveMetric((current) => (current === metric ? null : metric));
  const speedDisplay = formatFlightTelemetryMetric({
    metric: "speed",
    value: speed,
    alternate: activeMetric === "speed",
  });
  const altitudeDisplay = formatFlightTelemetryMetric({
    metric: "altitude",
    value: altitude,
    alternate: activeMetric === "altitude",
  });
  const verticalSpeedDisplay = formatFlightTelemetryMetric({
    metric: "verticalSpeed",
    value: vs,
    alternate: activeMetric === "verticalSpeed",
  });
  const trackDirectionKey = resolveTrackDirectionTranslationKey(track);
  const verticalState = resolveVerticalState(verticalSpeedDisplay?.value);
  const verticalIcon =
    verticalState === "climbing" ? (
      <ArrowUp />
    ) : verticalState === "descending" ? (
      <ArrowDown />
    ) : verticalState === "level" ? (
      <ArrowRight />
    ) : (
      <Minus />
    );
  // The rail stays neutral for every live flight state; the icon carries the
  // direction. A blue rail only marks the alternate-unit state when selected,
  // so orange stays reserved for the tracked target / primary action.
  const verticalTone =
    activeMetric === "verticalSpeed" ? "secondary" : "neutral";
  const verticalStateLabel = t(resolveVerticalStateTranslationKey(verticalState));

  return (
    <div className="flight-wayfinding-summary">
      <div className="flight-wayfinding-metrics grid grid-cols-2">
        <WayfindingMetric
          icon={<Gauge />}
          title={t("metrics.speed")}
          value={speedDisplay?.value ?? "—"}
          unit={speedDisplay?.suffix}
          animateValue={Boolean(speedDisplay)}
          active={activeMetric === "speed"}
          tone={activeMetric === "speed" ? "secondary" : "neutral"}
          onClick={() => toggleMetric("speed")}
        />
        <WayfindingMetric
          icon={<Ruler />}
          title={t("metrics.altitude")}
          value={onGround ? t("aircraft.gnd") : altitudeDisplay?.value ?? "—"}
          unit={onGround ? undefined : altitudeDisplay?.suffix}
          animateValue={Boolean(!onGround && altitudeDisplay)}
          active={activeMetric === "altitude"}
          tone={activeMetric === "altitude" ? "secondary" : "neutral"}
          onClick={() => toggleMetric("altitude")}
        />
        <WayfindingMetric
          icon={verticalIcon}
          title={t("metrics.verticalSpeed")}
          value={
            verticalSpeedDisplay ? Math.abs(verticalSpeedDisplay.value) : "—"
          }
          unit={verticalSpeedDisplay?.suffix}
          animateValue={Boolean(verticalSpeedDisplay)}
          active={activeMetric === "verticalSpeed"}
          tone={verticalTone}
          railMotionKind="status"
          strokeReplayKey={verticalState}
          ariaLabel={
            verticalSpeedDisplay == null
              ? t("metrics.verticalSpeed")
              : `${t("metrics.verticalSpeed")}, ${Math.abs(verticalSpeedDisplay.value)} ${verticalSpeedDisplay.suffix}, ${verticalStateLabel}`
          }
          onClick={() => toggleMetric("verticalSpeed")}
        />
        <WayfindingMetric
          icon={<Compass />}
          title={t("metrics.track")}
          value={
            activeMetric === "track" && trackDirectionKey
              ? t(trackDirectionKey)
              : track == null
                ? "—"
                : Math.round(track)
          }
          unit={activeMetric === "track" || track == null ? undefined : "°"}
          animateValue={track != null && activeMetric !== "track"}
          active={activeMetric === "track"}
          tone={activeMetric === "track" ? "secondary" : "neutral"}
          onClick={() => toggleMetric("track")}
        />
      </div>
      {footer}
    </div>
  );
}
