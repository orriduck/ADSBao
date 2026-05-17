"use client";

import { useState } from "react";
import NumberFlow from "@number-flow/react";
import AircraftTable from "./AircraftTable";
import SidebarIdentityHero from "./SidebarIdentityHero";
import { SidebarMetricCard, SidebarMetricGrid } from "./SidebarMetric";
import SidebarShell from "./SidebarShell";
import { formatFlightRouteLabel } from "@/utils/flightRouteDisplay.js";
import { toFiniteNumber } from "@/utils/math.js";

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
  feedSource = "",
  lastUpdated = null,
  onBack,
  onClose = null,
}) {
  const isMobileOverlay = Boolean(onClose);
  const displayCallsign =
    (aircraft?.callsign || callsign || "").trim() || "—";
  const hex = aircraft?.icao24 ? aircraft.icao24.toUpperCase() : "";
  const type = (aircraft?.type || "").trim().toUpperCase();
  const category = (aircraft?.category || "").trim().toUpperCase();
  const route = formatFlightRouteLabel(aircraft?.flightRoute) || "";
  const speed = toFiniteNumber(aircraft?.velocity);
  const altitude = toFiniteNumber(aircraft?.altitude);
  const vs = toFiniteNumber(aircraft?.baroRate);
  const track = toFiniteNumber(aircraft?.track);
  const onGround = Boolean(aircraft?.onGround);

  const header = (
    <>
      <FlightIdentity
        callsign={displayCallsign}
        type={type}
        category={category}
        route={route}
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
      onBack={onBack}
      onClose={onClose}
      header={header}
    >
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
    </SidebarShell>
  );
}

function FlightIdentity({ callsign, type, category, route }) {
  return (
    <SidebarIdentityHero label="Tracking" code={callsign}>
      {(type || category) && (
        <div className="mt-2 flex items-baseline gap-2">
          {type && (
            <span
              translate="no"
              className="notranslate font-mono text-[13px] font-semibold italic text-atc-text"
            >
              {type}
            </span>
          )}
          {category && (
            <span
              translate="no"
              className="notranslate font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-atc-faint"
            >
              {category}
            </span>
          )}
        </div>
      )}
      {route ? (
        <div className="mt-2 font-mono text-[12px] tracking-[0.04em] text-atc-dim">
          {route}
        </div>
      ) : null}
    </SidebarIdentityHero>
  );
}

function FlightTelemetryGrid({ speed, altitude, vs, track, onGround, hex }) {
  // Local "highlighted metric" state — clicking any card toggles its
  // active state so the user can pin a metric the same way the airport
  // page pins WEATHER vs FLIGHTS. Click an already-active card to
  // deselect.
  const [activeMetric, setActiveMetric] = useState(null);
  const toggle = (id) =>
    setActiveMetric((current) => (current === id ? null : id));

  return (
    <SidebarMetricGrid label="Flight telemetry">
      <SidebarMetricCard
        label="Speed"
        value={
          speed != null ? (
            <NumberFlow value={Math.round(speed)} />
          ) : (
            "—"
          )
        }
        unit={speed != null ? "kt" : ""}
        active={activeMetric === "speed"}
        onClick={() => toggle("speed")}
      />
      <SidebarMetricCard
        label="Altitude"
        value={
          onGround
            ? "GND"
            : altitude != null
              ? <NumberFlow value={Math.round(altitude)} />
              : "—"
        }
        unit={onGround ? "" : altitude != null ? "ft" : ""}
        active={activeMetric === "altitude"}
        onClick={() => toggle("altitude")}
      />
      <SidebarMetricCard
        label="V/S"
        value={
          vs != null ? (
            <NumberFlow
              value={Math.round(vs)}
              format={{ signDisplay: "exceptZero" }}
            />
          ) : (
            "—"
          )
        }
        unit={vs != null ? "fpm" : ""}
        active={activeMetric === "vs"}
        onClick={() => toggle("vs")}
      />
      <SidebarMetricCard
        label="Heading"
        value={track != null ? <NumberFlow value={Math.round(track)} /> : "—"}
        unit={track != null ? "deg" : ""}
        active={activeMetric === "track"}
        onClick={() => toggle("track")}
      />
      {hex && (
        <>
          <SidebarMetricCard
            label="ICAO24"
            value={<span translate="no" className="notranslate">{hex}</span>}
            active={activeMetric === "hex"}
            onClick={() => toggle("hex")}
          />
          <SidebarMetricCard
            label="Status"
            value={onGround ? "GND" : altitude != null ? "AIR" : "—"}
            active={activeMetric === "status"}
            onClick={() => toggle("status")}
          />
        </>
      )}
    </SidebarMetricGrid>
  );
}
