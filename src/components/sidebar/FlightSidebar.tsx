/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import NumberFlow from "@number-flow/react";
import AircraftTable from "./AircraftTable";
import SidebarIdentityHero from "./SidebarIdentityHero";
import { SidebarMetricCard, SidebarMetricGrid } from "./SidebarMetric";
import SidebarShell from "./SidebarShell";
import {
  formatFlightRouteLabel,
  getFlightRouteAirlineIconUrl,
} from "@/utils/flightRouteDisplay";
import { getAircraftPositionSourceBadge } from "@/features/aviation/sourceDisplayModel";
import {
  formatFlightTelemetryMetric,
  resolveTrackDirectionTranslationKey,
} from "@/features/aircraft/tracking/flightTelemetryDisplayModel";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { toFiniteNumber } from "@/utils/math";

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
}) {
  const isMobileOverlay = Boolean(onClose);
  const displayCallsign =
    (aircraft?.callsign || callsign || "").trim() || "—";
  const hex = aircraft?.icao24 ? aircraft.icao24.toUpperCase() : "";
  const type = (aircraft?.type || "").trim().toUpperCase();
  const category = (aircraft?.category || "").trim().toUpperCase();
  const route = formatFlightRouteLabel(aircraft?.flightRoute) || "";
  const airlineIconUrl = getFlightRouteAirlineIconUrl(aircraft?.flightRoute);
  const speed = toFiniteNumber(aircraft?.velocity);
  const altitude = toFiniteNumber(aircraft?.altitude);
  const vs = toFiniteNumber(aircraft?.baroRate);
  const track = toFiniteNumber(aircraft?.track);
  const onGround = Boolean(aircraft?.onGround);
  const positionSourceBadge = getAircraftPositionSourceBadge(
    aircraft?.positionQuality,
  );

  const header = (
    <>
      <FlightIdentity
        callsign={displayCallsign}
        type={type}
        category={category}
        route={route}
        airlineIconUrl={airlineIconUrl}
        positionSourceBadge={positionSourceBadge}
      />
      <FlightTelemetryGrid
        speed={speed}
        altitude={altitude}
        vs={vs}
        track={track}
        onGround={onGround}
        hex={hex}
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
    >
      {showNearbyList ? (
        <AircraftTable
          aircraft={nearbyAircraft}
          airports={nearbyAirports}
          focusLat={focusLat}
          focusLon={focusLon}
          selectedAircraftId={selectedAircraftId}
          selectedAirportIcao={selectedAirportIcao}
          onSelectAircraft={onSelectAircraft}
          onSelectAirport={onSelectAirport}
          fill={!isMobileOverlay}
        />
      ) : null}
    </SidebarShell>
  );
}

function FlightIdentity({
  callsign,
  type,
  category,
  route,
  airlineIconUrl,
  positionSourceBadge,
}) {
  const { t } = useI18n();
  return (
    <SidebarIdentityHero label={t("sidebar.tracking")} code={callsign}>
      {(type || category) && (
        <div className="mt-2 flex items-baseline gap-2">
          {type && (
            <span
              className="notranslate font-mono text-[13px] font-semibold italic text-atc-text"
              translate="no"
            >
              {type}
            </span>
          )}
          {category && (
            <span
              className="notranslate endf-chip"
              translate="no"
            >
              <span>{category}</span>
            </span>
          )}
        </div>
      )}
      {route ? (
        <div
          className="notranslate mt-2 flex items-center gap-2 font-mono text-[12px] tracking-[0.04em] text-atc-dim"
          translate="no"
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
        <div className="notranslate mt-2 inline-flex items-center rounded-[3px] border border-atc-line px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-normal text-atc-dim" translate="no">
          {positionSourceBadge}
        </div>
      ) : null}
    </SidebarIdentityHero>
  );
}

function FlightTelemetryGrid({ speed, altitude, vs, track, onGround, hex }) {
  const { t } = useI18n();
  // Local "highlighted metric" state — clicking any card toggles its
  // active state so the user can pin a metric the same way the airport
  // page pins WEATHER vs FLIGHTS. Click an already-active card to
  // deselect.
  const [activeMetric, setActiveMetric] = useState(null);
  const toggle = (id) =>
    setActiveMetric((current) => (current === id ? null : id));
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
    alternate: activeMetric === "vs",
  });
  const trackDirectionKey = resolveTrackDirectionTranslationKey(track);

  return (
    <SidebarMetricGrid label={t("sidebar.flightTelemetry")}>
      <SidebarMetricCard
        label={t("metrics.speed")}
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
        active={activeMetric === "speed"}
        onClick={() => toggle("speed")}
      />
      <SidebarMetricCard
        label={t("metrics.altitude")}
        value={
          onGround
            ? t("aircraft.gnd")
            : altitudeDisplay
              ? (
                  <MetricNumberFlow
                    value={altitudeDisplay.value}
                    suffix={altitudeDisplay.suffix}
                  />
                )
              : "—"
        }
        active={activeMetric === "altitude"}
        onClick={() => toggle("altitude")}
      />
      <SidebarMetricCard
        label={t("metrics.verticalSpeed")}
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
        active={activeMetric === "vs"}
        onClick={() => toggle("vs")}
      />
      <SidebarMetricCard
        label={t("metrics.track")}
        value={
          track != null ? (
            activeMetric === "track" ? (
              trackDirectionKey ? t(trackDirectionKey) : "—"
            ) : (
              <MetricNumberFlow
                value={Math.round(track)}
                suffix="°"
                suffixPosition="sup"
              />
            )
          ) : (
            "—"
          )
        }
        active={activeMetric === "track"}
        onClick={() => toggle("track")}
        valueTranslate={activeMetric === "track"}
      />
      {hex && (
        <>
          <SidebarMetricCard
            label={t("metrics.icao24")}
            value={hex}
            active={activeMetric === "hex"}
            onClick={() => toggle("hex")}
            valueSize="compact"
          />
          <SidebarMetricCard
            label={t("metrics.flightPhase")}
            value={
              onGround
                ? t("aircraft.ground")
                : altitude != null
                  ? t("aircraft.airborne")
                  : "—"
            }
            active={activeMetric === "status"}
            onClick={() => toggle("status")}
            valueSize="compact"
            valueTranslate
          />
        </>
      )}
    </SidebarMetricGrid>
  );
}

function MetricNumberFlow({ value, suffix, format, suffixPosition = "sub" }) {
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
