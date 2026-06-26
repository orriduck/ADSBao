import { Loader2, Radar, SearchX } from "lucide-react";
import AirportRow from "./AirportRow";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import AsyncStatusLine from "@/components/ui/AsyncStatusLine";

// Designed state for the search column — a quiet glyph over a primary line and
// a faint supporting line, framed by whitespace rather than left bare. Shared
// by the loading / error / no-result branches so each reads as a deliberate
// state, not an afterthought.
function SearchState({ icon, title, detail = null, spin = false }) {
  return (
    <div className="flex flex-col items-center gap-2.5 px-4 py-10 text-center">
      <span
        aria-hidden="true"
        className={`flex size-9 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--atc-text)_6%,transparent)] text-atc-faint ${
          spin ? "[&>svg]:animate-spin" : ""
        }`}
      >
        {icon}
      </span>
      <span className="fs-title max-w-[24ch] text-atc-dim">{title}</span>
      {detail ? (
        <span className="fs-desc max-w-[28ch] text-atc-faint">{detail}</span>
      ) : null}
    </div>
  );
}

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
              className="text-[calc(9px*var(--sb-body-scale))]"
            />
            <span className="atc-section-head__count">{countLabel}</span>
          </span>
        </div>

        {loading && !rows.length ? (
          <SearchState
            spin
            icon={<Loader2 size={17} strokeWidth={2} />}
            title={t("search.searchingAirports")}
          />
        ) : error ? (
          <SearchState
            icon={<SearchX size={17} strokeWidth={2} />}
            title={t("search.searchAirportsError")}
            detail={error}
          />
        ) : !rows.length ? (
          <SearchState
            icon={<Radar size={17} strokeWidth={2} />}
            title={t("search.noAirportMatched", { query: query.trim() })}
            detail={t("search.discovery.pageDescription")}
          />
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
