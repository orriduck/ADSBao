"use client";

import Link from "next/link";
import { Info, Search } from "lucide-react";
import DitherPageShell from "../app-shell/DitherPageShell.jsx";
import ThemeToggle from "../app-shell/ThemeToggle.jsx";
import { useThemePreference } from "../app-shell/useThemePreference.js";
import { Input } from "../../components/ui/input.jsx";
import {
  createAirportSelection,
  resolveSubmittedAirport,
} from "./airportSearchModel.js";
import {
  AirportSearchResults,
  FeaturedAirports,
} from "./AirportSearchResults.jsx";
import { useAirportSearch } from "./useAirportSearch.js";

export default function AirportSearchPanel({ onOpenAirport }) {
  const { themePreference, themeTitle, themeIconKey, cycleTheme } =
    useThemePreference();
  const {
    query,
    setQuery,
    rows,
    featuredAirports,
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

  const mobileAboutLink = (
    <Link
      href="/about"
      title="About ADSBao"
      className="mobile-top-nav-link flex items-center gap-1.5"
    >
      <Info className="h-3.5 w-3.5" aria-hidden="true" />
      <span>About</span>
    </Link>
  );

  const footerAboutLink = (
    <Link
      href="/about"
      title="About ADSBao"
      className="font-nav text-[10px] font-semibold uppercase tracking-normal text-atc-faint transition-colors hover:text-atc-text flex items-center gap-1.5"
    >
      <Info className="h-3.5 w-3.5" aria-hidden="true" />
      <span>About</span>
    </Link>
  );

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
      sectionLabel="Airport search"
      mobileLeft={mobileAboutLink}
      footerLeft={footerAboutLink}
      renderThemeToggle={renderThemeToggle}
    >
      <form
        onSubmit={doSearch}
        className="flex-none mx-6 flex items-center gap-3 py-3.5"
      >
        <Search className="h-5 w-5 shrink-0 text-atc-orange" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="flex-1 p-0 text-base font-semibold tracking-normal text-atc-text"
          placeholder="Search ICAO, IATA, city, or name"
        />
        <kbd className="hidden shrink-0 items-center px-2 py-1 font-mono text-[10px] uppercase tracking-[0.04em] text-atc-dim sm:inline-flex">
          {loading ? "..." : "enter"}
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
          <FeaturedAirports airports={featuredAirports} onOpen={openAirport} />
        )}
      </div>
    </DitherPageShell>
  );
}
