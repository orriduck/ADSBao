import { Search } from "lucide-react";
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
  const {
    query,
    setQuery,
    rows,
    discoveryTopics,
    staticDiscoveryAirports,
    loading,
    error,
    statusCode,
    searchCycle,
  } = useAirportSearch();
  const countLabel = loading
    ? t("search.resultCountLoading")
    : t(rows.length === 1 ? "search.resultCountOne" : "search.resultCountMany", {
        count: rows.length,
      });

  const openAirport = (airport) => {
    onOpenAirport(createAirportSelection(airport));
  };

  const trackingCallsign = resolveTrackableCallsign({
    query,
    rows,
    staticAirports: staticDiscoveryAirports,
  });

  const doSearch = (event) => {
    event.preventDefault();
    const destination = resolveHomeSearchDestination({
      query,
      rows,
      staticAirports: staticDiscoveryAirports,
    });
    if (destination?.type === "airport") openAirport(destination.airport);
    if (destination?.type === "aircraft") onTrackFlight?.(destination.callsign);
  };

  return (
    <>
      <form
        onSubmit={doSearch}
        className="search-input home-wayfinding-search flex min-h-11 flex-none items-stretch gap-0 p-0"
      >
        <span className="flex w-9 shrink-0 items-center justify-center bg-[var(--home-wayfinding-neutral-rail)] text-[var(--home-wayfinding-neutral-rail-fg)]">
          <Search className="size-[16px] stroke-[1.8]" aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 items-center bg-[var(--home-wayfinding-content)] px-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-7 min-w-0 flex-1 p-0 text-[calc(11px*var(--sb-body-scale))] font-semibold tracking-normal text-atc-text"
            placeholder={t("search.placeholder")}
          />
          <kbd className="hidden shrink-0 font-code text-[calc(8px*var(--sb-body-scale))] text-atc-faint sm:inline-flex">
            <span>{loading ? "..." : t("search.enter")}</span>
          </kbd>
        </span>
      </form>

      <div className="flex flex-none flex-col">
        {query.trim() ? (
          <AirportSearchResults
            query={query}
            rows={rows}
            loading={loading}
            error={error}
            statusCode={statusCode}
            searchCycle={searchCycle}
            countLabel={countLabel}
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
