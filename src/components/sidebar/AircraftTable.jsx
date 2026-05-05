"use client";

import NumberFlow from "@number-flow/react";

export default function AircraftTable({ aircraft = [], fill = true }) {
  const sorted = [...aircraft].sort((a, b) => {
    const aAlt = Number(a.altitude) || 0;
    const bAlt = Number(b.altitude) || 0;
    return bAlt - aAlt;
  });

  return (
    <div className={`flex flex-col ${fill ? "h-full" : ""}`}>
      <div className="flex-none">
        <div className="flex items-baseline justify-between px-6 pt-6 pb-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-atc-faint">
            Aircraft
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-atc-dim">
            <NumberFlow value={aircraft.length} suffix=" nearby" />
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_72px_92px] items-center gap-3 border-y border-[var(--atc-line)] px-6 py-2 font-mono text-[9px] uppercase tracking-[0.2em] text-atc-faint">
          <span>Callsign / Route</span>
          <span className="text-right">GS</span>
          <span className="text-right">ALT</span>
        </div>
      </div>

      <div className={fill ? "flex-1 overflow-y-auto" : "overflow-visible"}>
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
    </div>
  );
}

function AircraftRow({ aircraft }) {
  const callsign = aircraft.callsign?.trim() || aircraft.icao24 || "—";
  const route =
    aircraft.flightRouteLabel ||
    (aircraft.onGround ? "On ground" : "Track unknown");
  const gsValue = toNumber(aircraft.velocity);
  const altValue = toNumber(aircraft.altitude);

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_72px_92px] items-center gap-3 px-6 py-3 transition-colors hover:bg-[color-mix(in_oklab,var(--atc-elev)_55%,transparent)]">
      <div className="min-w-0">
        <div className="font-mono text-[12.5px] font-semibold tracking-[0.04em] text-atc-text">
          {callsign}
        </div>
        <div className="mt-0.5 truncate text-[11.5px] text-atc-dim">
          {route}
        </div>
      </div>
      <div className="text-right font-mono text-[12.5px] font-semibold text-atc-text">
        {gsValue == null ? (
          <span>—</span>
        ) : (
          <NumberWithUnit value={Math.round(gsValue)} unit="KT" />
        )}
      </div>
      <div className="text-right font-mono text-[12.5px] font-semibold text-atc-text">
        {aircraft.onGround ? (
          <span>GND</span>
        ) : altValue == null ? (
          <span>—</span>
        ) : (
          <NumberWithUnit value={Math.round(altValue)} unit="FT" />
        )}
      </div>
    </li>
  );
}

function NumberWithUnit({ value, unit }) {
  return (
    <span className="inline-flex items-baseline justify-end gap-0.5 tabular-nums">
      <NumberFlow value={value} />
      <sub className="relative top-[0.22em] text-[7px] font-semibold leading-none tracking-[0.08em] text-atc-dim">
        {unit}
      </sub>
    </span>
  );
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
