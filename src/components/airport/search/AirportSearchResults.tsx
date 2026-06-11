"use client";

import AirportRow from "./AirportRow";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import AsyncStatusLine from "@/components/ui/AsyncStatusLine";

export function AirportSearchResults({
  query,
  rows,
  loading,
  error,
  statusCode = null,
  searchCycle = 0,
  countLabel,
  onOpen,
}) {
  const { t } = useI18n();

  return (
    <>
      <div className="dither-section-header px-6 pt-5 pb-3">
        <div className="atc-section-head">
          <span className="atc-kicker">{t("search.searchResults")}</span>
          <span className="flex items-center gap-2">
            <AsyncStatusLine
              loading={Boolean(loading)}
              error={error || null}
              statusCode={statusCode}
              cycleKey={`search:${searchCycle}`}
              pendingLabel={t("search.searchingAirports")}
              successLabel={t("search.searchedAirports")}
              errorLabel={t("search.searchAirportsError")}
              className="text-[9px]"
            />
            <span className="atc-section-head__count">{countLabel}</span>
          </span>
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
        <ul className="app-list-motion dither-list flex flex-col gap-1 px-6">
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
