"use client";

import { TowerControl } from "lucide-react";
import NumberFlow from "@number-flow/react";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { airportCityName, airportDisplayName } from "@/utils/airport";
import { countryName } from "@/utils/flag";

// Airport equivalent of AircraftRow — same column rhythm so an
// "airports & aircraft" mixed list reads as one coherent table.
// Left: ICAO · IATA / city + country. Right: DIST and ELEV (in place of
// the aircraft row's GS / ALT).
export default function AirportRow({
  airport,
  airportId,
  selected,
  onSelectAirport,
}) {
  const { locale } = useI18n();
  const icao = airport?.icao || "";
  const iata = airport?.iata || "";
  const code = iata && iata !== icao ? `${iata} · ${icao}` : icao || "—";
  const city = airportCityName(airport?.city, locale);
  const country = countryName(airport?.country, locale) || airport?.country || "";
  const placeText =
    [city, country].filter(Boolean).join(", ") ||
    airportDisplayName(airport, locale);
  const dist = toFiniteNumber(airport?.distanceNm);
  const elevation = toFiniteNumber(airport?.elevationFt);

  return (
    <button
      type="button"
      className={`aircraft-table-card aircraft-table-row-grid endf-industrial-row grid w-full grid-cols-[18px_minmax(0,1fr)_48px_54px] items-center gap-2 px-[var(--airport-sidebar-inset)] text-left transition-[background,color] hover:bg-[color-mix(in_oklab,var(--atc-elev)_55%,transparent)] sm:grid-cols-[18px_minmax(0,1fr)_54px_70px] sm:gap-3 ${
        selected ? "endf-row-active" : ""
      }`}
      aria-pressed={selected}
      onClick={() => airportId && onSelectAirport?.(airportId)}
    >
      <span aria-hidden="true" className="endf-row-glyph">
        <TowerControl size={13} strokeWidth={2.4} />
      </span>
      <div className="aircraft-table-identity aircraft-table-identity--solo min-w-0">
        <span
          className="aircraft-table-callsign airport-sidebar-display-mono notranslate truncate text-[12px] font-semibold text-atc-text"
          translate="no"
        >
          {code}
        </span>
        {placeText ? (
          <span className="truncate text-[9.5px] text-atc-dim">{placeText}</span>
        ) : null}
      </div>
      <div className="aircraft-table-cell aircraft-table-cell--distance text-right font-mono text-[12px] font-semibold text-atc-text">
        {dist == null ? (
          <span>—</span>
        ) : (
          <NumberWithUnit
            value={dist}
            unit="NM"
            format={{ maximumFractionDigits: 1, minimumFractionDigits: 1 }}
          />
        )}
      </div>
      <div className="aircraft-table-cell aircraft-table-cell--altitude text-right font-mono text-[12px] font-semibold text-atc-text">
        {elevation == null ? (
          <span>—</span>
        ) : (
          <NumberWithUnit value={Math.round(elevation)} unit="FT" />
        )}
      </div>
    </button>
  );
}

// Mirrors AircraftRow.NumberWithUnit — virtualization bounds the instance
// count, so NumberFlow's digit-level animation is affordable here too.
function NumberWithUnit({ value, unit, format }) {
  return (
    <span className="grid w-full grid-cols-[minmax(0,1fr)_var(--aircraft-table-unit-width,14px)] items-baseline gap-x-0.5 tabular-nums">
      <NumberFlow
        value={value}
        format={format}
        className="block min-w-0 text-right"
      />
      <sub
        className="aircraft-table-unit notranslate relative top-[0.22em] block text-left text-[7px] font-semibold leading-none text-atc-dim"
        translate="no"
      >
        {unit}
      </sub>
    </span>
  );
}

function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
