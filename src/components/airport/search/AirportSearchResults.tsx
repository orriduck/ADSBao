"use client";

import AirportRow from "./AirportRow";
import { useI18n } from "@/features/app-shell/i18n/useI18n";

export function AirportSearchResults({
  query,
  rows,
  loading,
  error,
  countLabel,
  onOpen,
}) {
  const { t } = useI18n();

  return (
    <>
      <div className="dither-section-header px-6 pt-5 pb-3">
        <div className="endf-section-head">
          <span className="endf-label">{t("search.searchResults")}</span>
          <span className="endf-section-head__count">{countLabel}</span>
        </div>
      </div>

      {loading && !rows.length ? (
        <div className="px-6 py-7 text-center font-mono text-xs tracking-[0.6px] text-atc-dim">
          {t("search.searchingAirports")}
        </div>
      ) : error ? (
        <div className="px-6 py-7 text-center font-mono text-xs tracking-[0.6px] text-atc-dim">
          {error}
        </div>
      ) : !rows.length ? (
        <div className="px-6 py-7 text-center font-mono text-xs tracking-[0.6px] text-atc-dim">
          {t("search.noAirportMatched", { query: query.trim() })}
        </div>
      ) : (
        <ul className="app-list-motion dither-list px-6 divide-y divide-[var(--atc-line)]">
          {rows.map((airport, index) => (
            <AirportRow
              key={airport.icao || airport.code || airport.name}
              airport={airport}
              motionOrder={Math.min(index, 5)}
              onOpen={onOpen}
            />
          ))}
        </ul>
      )}
    </>
  );
}
