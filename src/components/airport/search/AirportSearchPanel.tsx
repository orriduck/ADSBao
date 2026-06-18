import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  createAirportSelection,
  resolveSubmittedAirport,
} from "@/features/airport/search/airportSearchModel";
import { AirportSearchResults } from "./AirportSearchResults";
import AirportDiscoveryPanel from "./AirportDiscoveryPanel";
import { useAirportSearch } from "@/features/airport/search/useAirportSearch";
import { useI18n } from "@/features/app-shell/i18n/useI18n";

export default function AirportSearchPanel({
  onOpenAirport,
  onPrefetchAirport,
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
    countLabel,
  } = useAirportSearch();

  const openAirport = (airport) => {
    onOpenAirport(createAirportSelection(airport));
  };

  const doSearch = (event) => {
    event.preventDefault();
    const airport = resolveSubmittedAirport({
      query,
      rows,
      staticAirports: staticDiscoveryAirports,
    });
    if (airport) openAirport(airport);
  };

  return (
    <>
      <form
        onSubmit={doSearch}
        className="search-input mx-6 mb-4 flex-none flex items-center gap-3 px-4 py-3"
      >
        <Search className="h-5 w-5 shrink-0 text-atc-orange" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-w-0 flex-1 p-0 text-base font-semibold tracking-normal text-atc-text"
          placeholder={t("search.placeholder")}
        />
        <kbd className="atc-chip hidden shrink-0 sm:inline-flex">
          <span>{loading ? "..." : t("search.enter")}</span>
        </kbd>
      </form>

      <div className="flex-1 overflow-y-auto">
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
