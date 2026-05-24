"use client";

import { Search } from "lucide-react";
import DitherPageShell from "../../app-shell/DitherPageShell.jsx";
import NavMenu from "../../navigation/NavMenu.jsx";
import ThemeToggle from "../../app-shell/ThemeToggle.jsx";
import { useThemePreference } from "@/features/app-shell/useThemePreference.js";
import { Input } from "@/components/ui/input.jsx";
import {
  createAirportSelection,
  resolveSubmittedAirport,
} from "@/features/airport/search/airportSearchModel.js";
import {
  AirportSearchResults,
  FeaturedAirports,
} from "./AirportSearchResults.jsx";
import { useAirportSearch } from "@/features/airport/search/useAirportSearch.js";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";

export default function AirportSearchPanel({ onOpenAirport }) {
  const { t } = useI18n();
  const { themePreference, themeTitle, themeIconKey, cycleTheme } =
    useThemePreference();
  const {
    query,
    setQuery,
    rows,
    featuredAirports,
    featuredAirportItems,
    locationStatus,
    requestNearestAirport,
    loading,
    error,
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
      featuredAirports,
    });
    if (airport) openAirport(airport);
  };

  const renderThemeToggle = (className) => (
    <ThemeToggle
      className={className}
      iconKey={themeIconKey}
      preference={themePreference}
      title={themeTitle}
      onClick={cycleTheme}
    />
  );

  return (
    <DitherPageShell
      className="search-screen"

      mobileLeft={<NavMenu variant="mobile" />}
      footerLeft={<NavMenu />}
      renderThemeToggle={renderThemeToggle}
    >
      <form
        onSubmit={doSearch}
        className="flex-none mx-6 flex items-center gap-3 border-b border-[var(--atc-line)] py-3.5"
      >
        <Search className="h-5 w-5 shrink-0 text-atc-orange" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="flex-1 p-0 text-base font-semibold tracking-normal text-atc-text"
          placeholder={t("search.placeholder")}
        />
        <kbd className="endf-chip hidden shrink-0 sm:inline-flex">
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
            countLabel={countLabel}
            onOpen={openAirport}
          />
        ) : (
          <FeaturedAirports
            airports={featuredAirports}
            items={featuredAirportItems}
            locationStatus={locationStatus}
            onRequestLocation={requestNearestAirport}
            onOpen={openAirport}
          />
        )}
      </div>
    </DitherPageShell>
  );
}
