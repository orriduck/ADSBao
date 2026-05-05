"use client";

import Link from "next/link";
import { Info, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { HOME_AIRPORT_COUNTRY } from "../../config/homeAirportDirectory.js";
import DitherPageShell from "../../features/app-shell/DitherPageShell.jsx";
import ThemeToggle from "../../features/app-shell/ThemeToggle.jsx";
import { useThemePreference } from "../../features/app-shell/useThemePreference.js";
import { airportDirectoryClient } from "../../services/airportDirectory.js";
import { airportSubtitle } from "../../utils/airport.js";
import { Input } from "../ui/input.jsx";

const featuredAirports = [
  {
    icao: "KBOS",
    iata: "BOS",
    name: "Boston Logan International Airport",
    city: "Boston",
    country: "US",
    lat: 42.3656,
    lon: -71.0096,
    type: "large_airport",
    type_label: "Large Airport",
  },
  {
    icao: "KLAX",
    iata: "LAX",
    name: "Los Angeles International Airport",
    city: "Los Angeles",
    country: "US",
    lat: 33.9425,
    lon: -118.4081,
    type: "large_airport",
    type_label: "Large Airport",
  },
  {
    icao: "KJFK",
    iata: "JFK",
    name: "John F. Kennedy International Airport",
    city: "New York",
    country: "US",
    lat: 40.6413,
    lon: -73.7781,
    type: "large_airport",
    type_label: "Large Airport",
  },
  {
    icao: "KORD",
    iata: "ORD",
    name: "Chicago O'Hare International Airport",
    city: "Chicago",
    country: "US",
    lat: 41.9742,
    lon: -87.9073,
    type: "large_airport",
    type_label: "Large Airport",
  },
  {
    icao: "KSFO",
    iata: "SFO",
    name: "San Francisco International Airport",
    city: "San Francisco",
    country: "US",
    lat: 37.6213,
    lon: -122.379,
    type: "large_airport",
    type_label: "Large Airport",
  },
  {
    icao: "KSEA",
    iata: "SEA",
    name: "Seattle-Tacoma International Airport",
    city: "Seattle",
    country: "US",
    lat: 47.4502,
    lon: -122.3088,
    type: "large_airport",
    type_label: "Large Airport",
  },
];

export default function SearchScreen({ onOpenAirport }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const { themePreference, themeTitle, themeIconKey, cycleTheme } =
    useThemePreference();
  const activeRequestId = useRef(0);

  const searchRows = useMemo(() => {
    const query = q.trim().toUpperCase();
    if (!query) return [];
    const matchesFeatured = featuredAirports.filter((airport) =>
      [airport.icao, airport.iata, airport.name, airport.city, airport.country]
        .join(" ")
        .toUpperCase()
        .includes(query),
    );
    const seen = new Set();
    return [...matchesFeatured, ...results].filter((airport) => {
      const key = String(airport.icao || airport.code || airport.name || "")
        .trim()
        .toUpperCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [q, results]);

  const resultCountLabel = searchLoading
    ? "loading"
    : `${searchRows.length} result${searchRows.length === 1 ? "" : "s"}`;

  useEffect(() => {
    const timer = setTimeout(
      async () => {
        const trimmed = q.trim();
        const requestId = ++activeRequestId.current;
        if (!trimmed) {
          setResults([]);
          setSearchLoading(false);
          setSearchError(null);
          return;
        }
        setSearchLoading(true);
        setSearchError(null);
        try {
          const payload = await airportDirectoryClient.loadAirports({
            query: trimmed,
            country: HOME_AIRPORT_COUNTRY,
            kind: "all",
            limit: 12,
          });
          if (requestId !== activeRequestId.current) return;
          setResults(payload.airports || []);
        } catch (err) {
          if (requestId !== activeRequestId.current) return;
          console.error("Airport search failed", err);
          setResults([]);
          setSearchError(
            err?.message || "Airport directory is unavailable right now",
          );
        } finally {
          if (requestId === activeRequestId.current) setSearchLoading(false);
        }
      },
      q.trim() ? 220 : 0,
    );
    return () => clearTimeout(timer);
  }, [q]);

  const openAirport = (airport) => {
    onOpenAirport({
      code: airport.icao || airport.code,
      icao: airport.icao || airport.code,
      iata: airport.iata || airport.code,
      name: airport.name || airport.code,
      city: airport.city || "",
      country: airport.country || "",
      lat: airport.lat ?? null,
      lon: airport.lon ?? null,
      type: airport.type || "",
      type_label: airport.type_label || "",
    });
  };

  const doSearch = (event) => {
    event.preventDefault();
    const normalized = q.trim().toUpperCase();
    if (!normalized) return;
    const exact = [...searchRows, ...featuredAirports].find((airport) => {
      const icao = String(airport.icao || "").toUpperCase();
      const iata = String(airport.iata || "").toUpperCase();
      const code = String(airport.code || "").toUpperCase();
      return normalized === icao || normalized === iata || normalized === code;
    });
    openAirport(exact || searchRows[0]);
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
      className="font-mono text-[10px] uppercase tracking-[0.14em] text-atc-faint transition-colors hover:text-atc-text flex items-center gap-1.5"
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
          value={q}
          onChange={(event) => setQ(event.target.value)}
          className="flex-1 p-0 text-base font-semibold tracking-normal text-atc-text"
          placeholder="Search ICAO, IATA, city, or name"
        />
        <kbd className="hidden shrink-0 items-center px-2 py-1 font-mono text-[10px] uppercase tracking-[0.04em] text-atc-dim sm:inline-flex">
          {searchLoading ? "..." : "enter"}
        </kbd>
      </form>

      <div className="flex-1 overflow-y-auto">
        {q.trim() ? (
          <SearchResults
            q={q}
            rows={searchRows}
            loading={searchLoading}
            error={searchError}
            countLabel={resultCountLabel}
            onOpen={openAirport}
          />
        ) : (
          <FeaturedAirports onOpen={openAirport} />
        )}
      </div>
    </DitherPageShell>
  );
}

function SearchResults({ q, rows, loading, error, countLabel, onOpen }) {
  return (
    <>
      <div className="px-6 pt-5 pb-3">
        <div className="flex items-baseline justify-between border-b border-[var(--atc-line)] pb-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-atc-faint">
          <span>Search results</span>
          <span className="tracking-[0.18em] text-atc-dim">{countLabel}</span>
        </div>
      </div>

      {loading && !rows.length ? (
        <div className="px-6 py-7 text-center font-mono text-xs tracking-[0.6px] text-atc-dim">
          Searching airports...
        </div>
      ) : error ? (
        <div className="px-6 py-7 text-center font-mono text-xs tracking-[0.6px] text-atc-dim">
          {error}
        </div>
      ) : !rows.length ? (
        <div className="px-6 py-7 text-center font-mono text-xs tracking-[0.6px] text-atc-dim">
          No airport matched &quot;{q.trim()}&quot;.
        </div>
      ) : (
        <ul className="px-6 divide-y divide-[var(--atc-line)]">
          {rows.map((airport) => (
            <AirportRow
              key={airport.icao || airport.code || airport.name}
              airport={airport}
              onOpen={onOpen}
            />
          ))}
        </ul>
      )}
    </>
  );
}

function FeaturedAirports({ onOpen }) {
  return (
    <>
      <div className="px-6 pt-5 pb-3">
        <div className="flex items-baseline justify-between border-b border-[var(--atc-line)] pb-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-atc-faint">
          <span>Featured airports</span>
          <span className="tracking-[0.18em] text-atc-dim">
            {featuredAirports.length}
          </span>
        </div>
      </div>

      <ul className="px-6 divide-y divide-[var(--atc-line)]">
        {featuredAirports.map((airport) => (
          <AirportRow key={airport.icao} airport={airport} onOpen={onOpen} />
        ))}
      </ul>
    </>
  );
}

function AirportRow({ airport, onOpen }) {
  return (
    <li>
      <button
        type="button"
        className="-mx-6 grid w-[calc(100%+3rem)] grid-cols-[56px_minmax(0,1fr)] items-center gap-3 px-6 py-3 text-left transition-colors hover:bg-[color-mix(in_oklab,var(--atc-elev)_55%,transparent)]"
        onClick={() => onOpen(airport)}
      >
        <span className="font-mono text-[16px] font-bold leading-[1] tracking-[0.02em] text-atc-orange">
          {airport.iata || airport.icao || airport.code}
        </span>
        <span className="min-w-0">
          <strong className="block truncate text-[13px] font-semibold text-atc-text">
            {airport.name}
          </strong>
          <small className="mt-0.5 block truncate text-[11.5px] text-atc-dim">
            {airportSubtitle(airport)}
          </small>
        </span>
      </button>
    </li>
  );
}
