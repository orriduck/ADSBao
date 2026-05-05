"use client";

import { AIRCRAFT_COLORS } from "../../constants/aircraft.js";

export default function AircraftTable({ aircraft = [] }) {
  const sorted = [...aircraft].sort((a, b) => {
    const aAlt = Number(a.altitude) || 0;
    const bAlt = Number(b.altitude) || 0;
    return bAlt - aAlt;
  });

  return (
    <div className="pb-8">
      <div className="flex items-baseline justify-between px-6 pt-6 pb-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-atc-faint">
          Aircraft
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-atc-dim">
          {aircraft.length} nearby
        </div>
      </div>

      <div className="grid grid-cols-[16px_minmax(0,1fr)_56px_56px] items-center gap-3 border-y border-[var(--atc-line)] px-6 py-2 font-mono text-[9px] uppercase tracking-[0.2em] text-atc-faint">
        <span aria-hidden="true" />
        <span>Callsign / Route</span>
        <span className="text-right">GS</span>
        <span className="text-right">ALT</span>
      </div>

      {sorted.length === 0 ? (
        <div className="px-6 py-10 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-atc-faint">
          No aircraft in range
        </div>
      ) : (
        <ul className="divide-y divide-[var(--atc-line)]">
          {sorted.map((a) => (
            <AircraftRow
              key={`${a.icao24 || a.callsign || "anon"}-${a.callsign || ""}`}
              aircraft={a}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function AircraftRow({ aircraft }) {
  const movement = aircraft.onGround
    ? "ground"
    : aircraft.movement || "unknown";
  const dotColor = AIRCRAFT_COLORS[movement] || AIRCRAFT_COLORS.unknown;
  const callsign = aircraft.callsign?.trim() || aircraft.icao24 || "—";
  const route =
    aircraft.flightRouteLabel ||
    (aircraft.onGround ? "On ground" : "Track unknown");
  const gs = formatGS(aircraft.velocity);
  const alt = formatAlt(aircraft.altitude, aircraft.onGround);

  return (
    <li className="grid grid-cols-[16px_minmax(0,1fr)_56px_56px] items-center gap-3 px-6 py-3 transition-colors hover:bg-[color-mix(in_oklab,var(--atc-elev)_55%,transparent)]">
      <span
        className="block h-1.5 w-1.5 rounded-full justify-self-start"
        style={{ background: dotColor }}
        aria-hidden="true"
      />
      <div className="min-w-0">
        <div className="font-mono text-[12.5px] font-semibold tracking-[0.04em] text-atc-text">
          {callsign}
        </div>
        <div className="mt-0.5 truncate text-[11.5px] text-atc-dim">
          {route}
        </div>
      </div>
      <div className="text-right font-mono text-[12.5px] font-semibold tabular-nums text-atc-text">
        {gs}
      </div>
      <div className="text-right font-mono text-[12.5px] font-semibold tabular-nums text-atc-text">
        {alt}
      </div>
    </li>
  );
}

function formatGS(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return Math.round(n).toString();
}

function formatAlt(value, onGround) {
  if (onGround) return "GND";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  if (n < 1000) return Math.round(n).toString();
  return `${(n / 1000).toFixed(1)}k`;
}
