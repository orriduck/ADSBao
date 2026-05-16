"use client";

import { airportSubtitle } from "../../../utils/airport.js";

export default function AirportRow({ airport, onOpen }) {
  return (
    <li>
      <button
        type="button"
        className="-mx-6 grid w-[calc(100%+3rem)] grid-cols-[56px_minmax(0,1fr)] items-center gap-3 px-6 py-3 text-left transition-colors hover:bg-[color-mix(in_oklab,var(--atc-elev)_55%,transparent)]"
        onClick={() => onOpen(airport)}
      >
        <span className="font-mono text-[16px] font-bold leading-[1] tracking-[0.02em] text-atc-orange">
          {airport.iata || airport.icao || airport.code}
        </span>
        <span className="min-w-0">
          <strong className="block truncate text-[13px] font-semibold text-atc-text">
            {airport.name}
          </strong>
          <small className="mt-0.5 block truncate text-[11.5px] text-atc-dim">
            {airportSubtitle(airport)}
          </small>
        </span>
      </button>
    </li>
  );
}
