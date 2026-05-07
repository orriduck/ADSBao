"use client";

import NumberFlow from "@number-flow/react";
import {
  getAircraftIdentity,
  getContextTagLabel,
  getMovementTagLabel,
  groupAircraftByAirportContext,
  resolveAircraftContextEmphasis,
} from "../../features/airport-context/airportContextUiModel.js";

export default function AircraftTable({
  aircraft = [],
  altitudeFocus = "all",
  showAirspaceContext = true,
  selectedAircraftId = "",
  onSelectAircraft,
  fill = true,
}) {
  const grouped = groupAircraftByAirportContext(aircraft);

  return (
    <div className={`flex flex-col ${fill ? "h-full" : ""}`}>
      <div className="flex-none">
        <div className="flex items-baseline justify-between px-6 pt-4 pb-2.5">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-atc-faint">
            Aircraft
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-atc-dim">
            <NumberFlow value={aircraft.length} suffix=" nearby" />
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_58px_78px] items-center gap-3 border-y border-[var(--atc-line)] px-6 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-atc-faint">
          <span>Callsign / Context</span>
          <span className="text-right">GS</span>
          <span className="text-right">ALT</span>
        </div>
      </div>

      <div className={fill ? "flex-1 overflow-y-auto" : "overflow-visible"}>
        {grouped.length === 0 ? (
          <div className="px-6 py-8 text-center font-mono text-[11px] uppercase tracking-[0.12em] text-atc-faint">
            No aircraft in range
          </div>
        ) : (
          <div>
            {grouped.map((section) => (
              <AircraftContextSection
                key={section.group}
                section={section}
                altitudeFocus={altitudeFocus}
                showAirspaceContext={showAirspaceContext}
                selectedAircraftId={selectedAircraftId}
                onSelectAircraft={onSelectAircraft}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AircraftContextSection({
  section,
  altitudeFocus,
  showAirspaceContext,
  selectedAircraftId,
  onSelectAircraft,
}) {
  return (
    <section className="border-b border-[var(--atc-line)]">
      <div className="sticky top-0 z-10 flex items-baseline justify-between border-b border-[var(--atc-line)] bg-atc-bg/95 px-6 py-2 backdrop-blur-sm">
        <h3 className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-atc-dim">
          {section.group}
        </h3>
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-atc-faint">
          <NumberFlow value={section.aircraft.length} />
        </span>
      </div>

      <ul className="divide-y divide-[var(--atc-line)]">
        {section.aircraft.map((item) => {
          const aircraftId = getAircraftIdentity(item);
          const selected = aircraftId && aircraftId === selectedAircraftId;
          const emphasis = resolveAircraftContextEmphasis({
            aircraft: item,
            altitudeFocus,
            contextEnabled: showAirspaceContext,
            selected,
          });

          return (
            <AircraftRow
              key={`${aircraftId || "anon"}-${item.callsign || ""}`}
              aircraft={item}
              aircraftId={aircraftId}
              emphasis={emphasis}
              selected={selected}
              onSelectAircraft={onSelectAircraft}
            />
          );
        })}
      </ul>
    </section>
  );
}

function AircraftRow({
  aircraft,
  aircraftId,
  emphasis,
  selected,
  onSelectAircraft,
}) {
  const callsign = aircraft.callsign?.trim() || aircraft.icao24 || "-";
  const route =
    aircraft.flightRouteLabel ||
    (aircraft.onGround ? "On ground" : "Track unknown");
  const movementLabel = getMovementTagLabel(aircraft);
  const contextLabel = getContextTagLabel(aircraft);
  const gsValue = toNumber(aircraft.velocity);
  const altValue = toNumber(aircraft.altitude);
  const rowOpacity = selected ? 1 : emphasis.opacity;

  return (
    <li>
      <button
        type="button"
        className={`grid w-full grid-cols-[minmax(0,1fr)_58px_78px] items-center gap-3 px-6 py-2.5 text-left transition-[background,color,opacity] hover:bg-[color-mix(in_oklab,var(--atc-elev)_55%,transparent)] ${
          selected ? "bg-[color-mix(in_oklab,var(--atc-accent)_11%,transparent)]" : ""
        }`}
        style={{ opacity: rowOpacity }}
        aria-pressed={selected}
        onClick={() => aircraftId && onSelectAircraft?.(aircraftId)}
      >
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate font-mono text-[12.5px] font-semibold tracking-[0.02em] text-atc-text">
              {callsign}
            </span>
            {movementLabel && <AircraftTag>{movementLabel}</AircraftTag>}
          </div>
          <div className="mt-1 flex min-w-0 items-center gap-1.5">
            <span className="truncate text-[11px] text-atc-dim">{route}</span>
            <span className="h-1 w-1 flex-none rounded-full bg-[var(--atc-line-strong)]" />
            <span className="flex-none truncate font-mono text-[9.5px] uppercase tracking-[0.08em] text-atc-faint">
              {contextLabel}
            </span>
          </div>
        </div>
        <div className="text-right font-mono text-[12px] font-semibold text-atc-text">
          {gsValue == null ? (
            <span>-</span>
          ) : (
            <NumberWithUnit value={Math.round(gsValue)} unit="KT" />
          )}
        </div>
        <div className="text-right font-mono text-[12px] font-semibold text-atc-text">
          {aircraft.onGround ? (
            <span>GND</span>
          ) : altValue == null ? (
            <span>-</span>
          ) : (
            <NumberWithUnit value={Math.round(altValue)} unit="FT" />
          )}
        </div>
      </button>
    </li>
  );
}

function AircraftTag({ children }) {
  return (
    <span className="flex-none rounded-[4px] border border-[color-mix(in_oklab,var(--atc-accent)_34%,transparent)] bg-[color-mix(in_oklab,var(--atc-accent)_10%,transparent)] px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.08em] text-atc-accent">
      {children}
    </span>
  );
}

function NumberWithUnit({ value, unit }) {
  return (
    <span className="inline-flex items-baseline justify-end gap-0.5 tabular-nums">
      <NumberFlow value={value} />
      <sub className="relative top-[0.22em] text-[7px] font-semibold leading-none tracking-[0.03em] text-atc-dim">
        {unit}
      </sub>
    </span>
  );
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
