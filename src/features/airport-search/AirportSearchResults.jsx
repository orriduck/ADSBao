"use client";

import AirportRow from "./AirportRow.jsx";

export function AirportSearchResults({
  query,
  rows,
  loading,
  error,
  countLabel,
  onOpen,
}) {
  return (
    <>
      <div className="px-6 pt-5 pb-3">
        <div className="flex items-baseline justify-between border-b border-[var(--atc-line)] pb-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-atc-faint">
          <span>Search results</span>
          <span className="tracking-[0.18em] text-atc-dim">{countLabel}</span>
        </div>
      </div>

      {loading && !rows.length ? (
        <div className="px-6 py-7 text-center font-mono text-xs tracking-[0.6px] text-atc-dim">
          Searching airports...
        </div>
      ) : error ? (
        <div className="px-6 py-7 text-center font-mono text-xs tracking-[0.6px] text-atc-dim">
          {error}
        </div>
      ) : !rows.length ? (
        <div className="px-6 py-7 text-center font-mono text-xs tracking-[0.6px] text-atc-dim">
          No airport matched &quot;{query.trim()}&quot;.
        </div>
      ) : (
        <ul className="px-6 divide-y divide-[var(--atc-line)]">
          {rows.map((airport) => (
            <AirportRow
              key={airport.icao || airport.code || airport.name}
              airport={airport}
              onOpen={onOpen}
            />
          ))}
        </ul>
      )}
    </>
  );
}

export function FeaturedAirports({ airports, onOpen }) {
  return (
    <>
      <div className="px-6 pt-5 pb-3">
        <div className="flex items-baseline justify-between border-b border-[var(--atc-line)] pb-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-atc-faint">
          <span>Featured airports</span>
          <span className="tracking-[0.18em] text-atc-dim">
            {airports.length}
          </span>
        </div>
      </div>

      <ul className="px-6 divide-y divide-[var(--atc-line)]">
        {airports.map((airport) => (
          <AirportRow key={airport.icao} airport={airport} onOpen={onOpen} />
        ))}
      </ul>
    </>
  );
}
