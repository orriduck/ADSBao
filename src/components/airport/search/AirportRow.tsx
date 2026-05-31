"use client";

import { airportDisplayName, airportSubtitle } from "@/utils/airport";
import { useI18n } from "@/features/app-shell/i18n/useI18n";

export default function AirportRow({
  airport,
  onOpen,
  featured = false,
}) {
  const { locale } = useI18n();

  return (
    <li>
      <button
        type="button"
        className={`search-airport-row group endf-underline -mx-6 grid w-[calc(100%+3rem)] grid-cols-[72px_minmax(0,1fr)] items-center gap-3 px-6 py-3 text-left transition-colors hover:bg-[color-mix(in_oklab,var(--atc-elev)_55%,transparent)] ${
          featured ? "endf-row-featured" : ""
        }`}
        onClick={() => onOpen(airport)}
      >
        <span className="endf-tab endf-tab--code">
          <span>{airport.iata || airport.icao || airport.code}</span>
        </span>
        <span className="min-w-0">
          <strong className="block truncate text-[13px] font-semibold text-atc-text">
            {airportDisplayName(airport, locale)}
          </strong>
          <small className="mt-0.5 block truncate text-[11.5px] text-atc-dim">
            {airportSubtitle(airport, locale)}
          </small>
        </span>
      </button>
    </li>
  );
}
