import { useRef } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  createAirportSelection,
  resolveHomeSearchDestination,
  resolveTrackableCallsign,
} from "@/features/airport/search/airportSearchModel";
import { AirportSearchResults } from "./AirportSearchResults";
import AirportDiscoveryPanel from "./AirportDiscoveryPanel";
import { useAirportSearch } from "@/features/airport/search/useAirportSearch";
import { useI18n } from "@/features/app-shell/i18n/useI18n";

export default function AirportSearchPanel({
  onOpenAirport,
  onPrefetchAirport,
  onTrackFlight,
}) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const {
    query,
    setQuery,
    rows,
    discoveryTopics,
    staticDiscoveryAirports,
    loading,
    error,
    retry,
  } = useAirportSearch();

  const openAirport = (airport) => {
    onOpenAirport(createAirportSelection(airport));
  };

  const resolvedTrackingCallsign = resolveTrackableCallsign({
    query,
    rows,
    staticAirports: staticDiscoveryAirports,
  });

  // Wait for the directory before interpreting an alphabetic city/registration.
  const trackingCallsign = loading && /^[A-Z]+$/.test(resolvedTrackingCallsign)
    ? "" : resolvedTrackingCallsign;
  const resultCount = rows.length + (trackingCallsign ? 1 : 0);
  const countLabel = loading ? t("search.resultCountLoading")
    : t(resultCount === 1 ? "search.resultCountOne" : "search.resultCountMany", { count: resultCount });
  const clearSearch = () => {
    setQuery("");
    inputRef.current?.focus();
  };
  const resultButtons = () => Array.from(
    resultsRef.current?.querySelectorAll<HTMLButtonElement>("[data-search-result]") || [],
  );
  const navigateResults = (event) => {
    if (event.nativeEvent.isComposing) return;
    const buttons = resultButtons();
    const index = buttons.indexOf(event.target);
    if (event.key === "Escape") {
      event.preventDefault();
      inputRef.current?.focus();
    } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) && index >= 0) {
      event.preventDefault();
      if (event.key === "ArrowUp" && index === 0) inputRef.current?.focus();
      else buttons[event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1
        : Math.min(buttons.length - 1, index + (event.key === "ArrowDown" ? 1 : -1))]?.focus();
    }
  };

  const doSearch = (event) => {
    event.preventDefault();
    if (event.nativeEvent.isComposing) return;
    const destination = resolveHomeSearchDestination({
      query,
      rows,
      staticAirports: staticDiscoveryAirports,
    });
    if (destination?.type === "airport") openAirport(destination.airport);
    if (destination?.type === "aircraft" && trackingCallsign) onTrackFlight?.(destination.callsign);
  };

  return (
    <>
      <form
        role="search"
        aria-label={t("search.placeholder")}
        onSubmit={doSearch}
        className="search-input home-wayfinding-search flex min-h-11 flex-none items-stretch gap-0 p-0"
      >
        <span
          data-motion-kind="search"
          data-motion-rail="true"
          className="flex w-9 shrink-0 items-center justify-center bg-[var(--home-wayfinding-neutral-rail)] text-[var(--home-wayfinding-neutral-rail-fg)]"
        >
          <Search className="wayfinding-rail-glyph size-[16px] stroke-[1.8]" aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 items-center bg-[var(--home-wayfinding-content)] px-3">
          <Input
            ref={inputRef}
            type="search"
            aria-label={t("search.placeholder")}
            aria-controls="home-search-results"
            aria-describedby={query.trim() ? "home-search-status" : undefined}
            enterKeyHint="search"
            autoComplete="off"
            spellCheck={false}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              if (event.key === "ArrowDown") {
                event.preventDefault();
                resultButtons()[0]?.focus();
              } else if (event.key === "Escape" && query) {
                event.preventDefault();
                clearSearch();
              }
            }}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-7 min-w-0 flex-1 p-0 text-[calc(11px*var(--sb-body-scale))] font-semibold tracking-normal text-atc-text"
            placeholder={t("search.placeholder")}
          />
          {query ? (
            <button type="button" className="soft-search-clear" aria-label={t("search.clear")} onClick={clearSearch}>
              <X size={16} aria-hidden="true" />
            </button>
          ) : null}
        </span>
      </form>

      <div id="home-search-results" ref={resultsRef} onKeyDown={navigateResults} className="flex flex-none flex-col">
        {query.trim() ? (
          <AirportSearchResults
            query={query}
            rows={rows}
            loading={loading}
            error={error}
            countLabel={countLabel}
            onRetry={() => { retry(); inputRef.current?.focus(); }}
            onClear={clearSearch}
            onOpen={openAirport}
            onPrefetch={onPrefetchAirport}
            trackingCallsign={trackingCallsign}
            onTrackFlight={onTrackFlight}
          />
        ) : (
          <AirportDiscoveryPanel
            topics={discoveryTopics}
            onOpen={openAirport}
            onPrefetch={onPrefetchAirport}
          />
        )}
      </div>
    </>
  );
}
