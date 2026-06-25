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
  } = useAirportSearch();
  const countLabel = loading
    ? t("search.resultCountLoading")
    : t(rows.length === 1 ? "search.resultCountOne" : "search.resultCountMany", {
        count: rows.length,
      });

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
        className="search-input mx-5 mb-3 flex-none flex items-center gap-2 px-3 py-1.5"
      >
        <Search className="h-3.5 w-3.5 shrink-0 text-atc-orange" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-6 min-w-0 flex-1 p-0 text-[11px] font-semibold tracking-normal text-atc-text"
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
