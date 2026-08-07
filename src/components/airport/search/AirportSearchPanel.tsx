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
        className="search-input mx-5 mb-3 flex-none flex items-center gap-2 px-3 py-1.5"
      >
        <Search className="h-3.5 w-3.5 shrink-0 text-atc-dim" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-6 min-w-0 flex-1 p-0 text-[calc(11px*var(--sb-body-scale))] font-semibold tracking-normal text-atc-text"
          placeholder={t("search.placeholder")}
        />
        <kbd className="atc-chip hidden shrink-0 sm:inline-flex">
          <span>{loading ? "..." : t("search.enter")}</span>
        </kbd>
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
