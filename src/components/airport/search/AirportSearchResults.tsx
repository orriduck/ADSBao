import MatrixLoader from "@/components/loading/MatrixLoader";
import { ChevronRight, Radar, SearchX } from "lucide-react";
import AirportRow from "./AirportRow";
import { AirportListRow } from "./AirportListRow";
import { useI18n } from "@/features/app-shell/i18n/useI18n";

// Designed state for the search column — a quiet glyph over a primary line and
// a faint supporting line, framed by whitespace rather than left bare. Shared
// by the loading / error / no-result branches so each reads as a deliberate
// state, not an afterthought.
function SearchState({ icon, title, detail = null }) {
  return (
    <div role="status" className="flex flex-col items-center gap-2.5 px-4 py-10 text-center">
      <span
        aria-hidden="true"
        className="flex size-9 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--atc-text)_6%,transparent)] text-atc-faint"
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
  countLabel,
  onRetry,
  onClear,
  onOpen,
  onPrefetch,
  trackingCallsign = "",
  onTrackFlight,
}) {
  const { t } = useI18n();
  const hasResults = Boolean(trackingCallsign || rows.length);

  return (
    <div className="dither-content-stack flex flex-col">
      <section
        className="airport-search-results dither-section-flow min-w-0"
        aria-labelledby="airport-search-results-heading"
      >
        <div className="home-wayfinding-results-head">
          <span
            aria-hidden="true"
            data-motion-kind="radar"
            data-motion-rail="true"
            className="home-wayfinding-results-icon"
          >
            <Radar className="wayfinding-rail-glyph" />
          </span>
          <div className="atc-section-head min-w-0">
            <span id="airport-search-results-heading" className="atc-kicker">
              {t("search.searchResults")}
            </span>
            <span id="home-search-status" role="status" aria-live="polite" className="flex items-center gap-2">
              <span className="atc-section-head__count">
                {error ? t("search.searchAirportsError") : countLabel}
              </span>
            </span>
          </div>
        </div>

        {loading && !hasResults ? (
          <SearchState
            icon={<MatrixLoader />}
            title={t("search.searchingAirports")}
          />
        ) : error && !hasResults ? (
          <SearchState
            icon={<SearchX size={17} strokeWidth={2} />}
            title={t("search.searchAirportsError")}
            detail={t("search.errorHint")}
          />
        ) : !hasResults ? (
          <SearchState
            icon={<Radar size={17} strokeWidth={2} />}
            title={t("search.noAirportMatched", { query: query.trim() })}
            detail={t("search.emptyHint")}
          />
        ) : (
          <ul className="app-list-motion dither-list flex flex-col gap-0">
            {trackingCallsign ? (
              <li>
                <AirportListRow
                  as="button"
                  data-search-result="true"
                  pill={t("search.trackFlightPill")}
                  railMotionKind="code"
                  title={t("search.trackFlight", { callsign: trackingCallsign })}
                  subtitle={t("search.trackFlightHint")}
                  trailing={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
                  onClick={() => onTrackFlight?.(trackingCallsign)}
                />
              </li>
            ) : null}
            {rows.map((airport, index) => (
              <AirportRow
                key={airport.icao || airport.code || airport.name}
                airport={airport}
                motionOrder={Math.min(index, 5)}
                searchResult
                onOpen={onOpen}
                onPrefetch={onPrefetch}
              />
            ))}
          </ul>
        )}
        {!loading && (error || !hasResults) ? (
          <div className="soft-search-recovery">
            {error ? <button type="button" className="soft-button" onClick={onRetry}>{t("search.retry")}</button> : null}
            <button type="button" className="soft-button" onClick={onClear}>{t("search.browse")}</button>
          </div>
        ) : null}
        {hasResults ? <p className="soft-search-keyboard-hint">{t("search.keyboardHint")}</p> : null}
      </section>
    </div>
  );
}
