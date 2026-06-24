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
  onPrefetch,
}) {
  const { t } = useI18n();

  return (
    <div className="dither-content-stack flex flex-col">
      <section
        className="dither-section-flow min-w-0"
        aria-labelledby="airport-search-results-heading"
      >
        <div className="atc-section-head">
          <span id="airport-search-results-heading" className="atc-kicker">
            {t("search.searchResults")}
          </span>
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

        {loading && !rows.length ? (
          <div className="py-7 text-center font-mono text-xs tracking-[0.6px] text-atc-dim">
            {t("search.searchingAirports")}
          </div>
        ) : error ? (
          <div className="py-7 text-center font-mono text-xs tracking-[0.6px] text-atc-dim">
            {error}
          </div>
        ) : !rows.length ? (
          <div className="py-7 text-center font-mono text-xs tracking-[0.6px] text-atc-dim">
            {t("search.noAirportMatched", { query: query.trim() })}
          </div>
        ) : (
          <ul className="app-list-motion dither-list mt-3 flex flex-col gap-1">
            {rows.map((airport, index) => (
              <AirportRow
                key={airport.icao || airport.code || airport.name}
                airport={airport}
                motionOrder={Math.min(index, 5)}
                onOpen={onOpen}
                onPrefetch={onPrefetch}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
