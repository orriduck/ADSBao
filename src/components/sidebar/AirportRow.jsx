"use client";

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
  const icao = airport?.icao || "";
  const iata = airport?.iata || "";
  const code = iata && iata !== icao ? `${iata} · ${icao}` : icao || "—";
  const city = airport?.city || "";
  const country = airport?.country || "";
  const placeText = [city, country].filter(Boolean).join(", ") || airport?.name;
  const dist = toFiniteNumber(airport?.distanceNm);
  const elevation = toFiniteNumber(airport?.elevationFt);

  return (
    <button
      type="button"
      className={`aircraft-table-card grid w-full grid-cols-[minmax(0,1fr)_54px_70px] items-center gap-3 px-[var(--airport-sidebar-inset)] text-left transition-[background,color,opacity] hover:bg-[color-mix(in_oklab,var(--atc-elev)_55%,transparent)] ${
        selected ? "bg-[color-mix(in_oklab,var(--atc-accent)_11%,transparent)]" : ""
      }`}
      aria-pressed={selected}
      onClick={() => airportId && onSelectAirport?.(airportId)}
    >
      <div className="aircraft-table-identity aircraft-table-identity--solo min-w-0">
        <span
          translate="no"
          className="notranslate aircraft-table-callsign airport-sidebar-display-mono truncate text-[12px] font-semibold text-atc-text"
        >
          {code}
        </span>
        {placeText ? (
          <span className="truncate text-[9.5px] text-atc-dim">{placeText}</span>
        ) : null}
      </div>
      <div className="text-right font-mono text-[12px] font-semibold text-atc-text">
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
      <div className="text-right font-mono text-[12px] font-semibold text-atc-text">
        {elevation == null ? (
          <span>—</span>
        ) : (
          <NumberWithUnit value={Math.round(elevation)} unit="FT" />
        )}
      </div>
    </button>
  );
}

// See AircraftRow.NumberWithUnit — same reasoning: static text to keep
// the long nearby list from costing framerate on every poll.
function NumberWithUnit({ value, unit, format }) {
  const formatted = new Intl.NumberFormat(undefined, format).format(value);
  return (
    <span className="inline-flex items-baseline justify-end gap-0.5 tabular-nums">
      <span>{formatted}</span>
      <sub className="relative top-[0.22em] text-[7px] font-semibold leading-none text-atc-dim">
        {unit}
      </sub>
    </span>
  );
}

function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
