"use client";

import Link from "next/link";
import { Info, Monitor, Moon, Search, Sun } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { HOME_AIRPORT_COUNTRY } from "../../config/homeAirportDirectory.js";
import { airportDirectoryClient } from "../../services/airportDirectory.js";
import { airportSubtitle } from "../../utils/airport.js";
import {
  THEME_DARK,
  THEME_LIGHT,
  THEME_SYSTEM,
  applyThemePreference,
  initThemePreference,
  nextTheme,
  writeStoredTheme,
} from "../../utils/theme.js";
import { Badge } from "../ui/badge.jsx";
import { Button } from "../ui/button.jsx";
import { Input } from "../ui/input.jsx";
import BackgroundRays from "../effects/BackgroundRays.jsx";
import Logo from "../brand/Logo.jsx";

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
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [themePreference, setThemePreference] = useState(THEME_SYSTEM);
  const activeRequestId = useRef(0);
  const mediaQueryList = useRef(null);

  useEffect(() => {
    mediaQueryList.current = window.matchMedia("(prefers-color-scheme: dark)");
    setThemePreference(
      initThemePreference({ mediaQueryList: mediaQueryList.current }).preference,
    );
    const listener = () => {
      if (themePreference === THEME_SYSTEM) {
        applyThemePreference({
          theme: THEME_SYSTEM,
          mediaQueryList: mediaQueryList.current,
        });
      }
    };
    mediaQueryList.current.addEventListener("change", listener);
    return () => mediaQueryList.current?.removeEventListener("change", listener);
  }, [themePreference]);

  const themeTitle = useMemo(() => {
    if (themePreference === THEME_LIGHT) return "Theme: Light (click to switch)";
    if (themePreference === THEME_DARK) return "Theme: Dark (click to switch)";
    return "Theme: System (click to switch)";
  }, [themePreference]);

  const ThemeIcon =
    themePreference === THEME_LIGHT
      ? Sun
      : themePreference === THEME_DARK
        ? Moon
        : Monitor;

  const cycleTheme = () => {
    const next = nextTheme(themePreference);
    setThemePreference(next);
    writeStoredTheme(next);
    applyThemePreference({ theme: next, mediaQueryList: mediaQueryList.current });
  };

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
          setSearchError(err?.message || "Airport directory is unavailable right now");
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

  return (
    <div className="search-screen min-h-screen text-atc-text">
      <BackgroundRays />
      <main className="grid min-h-screen place-items-start px-5 py-6 sm:place-items-center sm:p-10 lg:p-14">
        <section className="w-full max-w-[860px]">
          <div className="mb-4 flex items-center justify-between gap-2.5 font-mono text-[11px] uppercase tracking-[1.4px] text-atc-dim">
            <div className="flex items-center gap-2.5">
              <Logo size={20} className="text-atc-text" />
              <span className="text-atc-text">ADSBao</span>
              <span className="text-atc-orange">/</span>
              <span>Airport search</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                asChild
                variant="atcChip"
                size="sm"
                className="theme-chip gap-1.5 text-[12px] capitalize tracking-[0.2px]"
              >
                <Link href="/about" title="About ADSBao">
                  <Info className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>About</span>
                </Link>
              </Button>
              <Button
                type="button"
                variant="atcChip"
                size="sm"
                className="theme-chip gap-1.5 text-[12px] capitalize tracking-[0.2px]"
                title={themeTitle}
                onClick={cycleTheme}
              >
                <ThemeIcon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{themePreference}</span>
              </Button>
            </div>
          </div>

          <form
            onSubmit={doSearch}
            className={`search-input flex h-auto w-full items-center gap-3 px-4 py-4 text-atc-text transition-[border-color,box-shadow] duration-150 sm:gap-3.5 sm:px-5 sm:py-5 ${
              focused
                ? "border-atc-orange/70 shadow-[0_30px_100px_rgba(0,0,0,0.42),0_0_0_1px_rgba(36,65,100,0.18)_inset]"
                : ""
            }`}
          >
            <Search className="h-5 w-5 shrink-0 text-atc-orange" />
            <Input
              value={q}
              autoFocus
              onChange={(event) => setQ(event.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className="flex-1 p-0 text-lg font-extrabold tracking-normal text-atc-text sm:text-xl"
              placeholder="Search by ICAO, IATA, city, or airport name"
            />
            <kbd className="search-kbd hidden shrink-0 items-center rounded-[var(--atc-radius-control)] px-2 py-1 font-mono text-[10px] uppercase tracking-[1px] text-atc-dim sm:inline-flex">
              {searchLoading ? "..." : "enter"}
            </kbd>
          </form>

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
        </section>
      </main>
    </div>
  );
}

function SearchResults({ q, rows, loading, error, countLabel, onOpen }) {
  return (
    <div className="mt-5">
      <div className="flex items-center justify-between border-b border-atc-line pb-2.5 font-mono text-[10px] uppercase tracking-[1.5px] text-atc-dim">
        <span>Search results</span>
        <span>{countLabel}</span>
      </div>

      {loading && !rows.length ? (
        <div className="py-7 text-center font-mono text-xs tracking-[0.6px] text-atc-dim">
          Searching airports...
        </div>
      ) : error ? (
        <div className="py-7 text-center font-mono text-xs tracking-[0.6px] text-atc-dim">
          {error}
        </div>
      ) : !rows.length ? (
        <div className="py-7 text-center font-mono text-xs tracking-[0.6px] text-atc-dim">
          No airport matched &quot;{q.trim()}&quot;.
        </div>
      ) : (
        <div className="mt-2.5 grid gap-2">
          {rows.map((airport) => (
            <AirportRow key={airport.icao || airport.code || airport.name} airport={airport} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  );
}

function FeaturedAirports({ onOpen }) {
  return (
    <div className="mt-5">
      <div className="flex items-center justify-between border-b border-atc-line pb-2.5 font-mono text-[10px] uppercase tracking-[1.5px] text-atc-dim">
        <span>Featured airports</span>
        <span>{featuredAirports.length}</span>
      </div>

      <div className="mt-2.5 grid gap-2">
        {featuredAirports.map((airport, index) => (
          <AirportRow
            key={airport.icao}
            airport={airport}
            onOpen={onOpen}
            featured={index === 0}
          />
        ))}
      </div>
    </div>
  );
}

function AirportRow({ airport, onOpen, featured = false }) {
  return (
    <Button
      type="button"
      variant="atcRow"
      size="auto"
      className={`search-row grid w-full grid-cols-[62px_minmax(0,1fr)] gap-4 px-4 py-3.5 normal-case sm:grid-cols-[86px_minmax(0,1fr)_auto] ${
        featured ? "search-row--featured" : ""
      }`}
      onClick={() => onOpen(airport)}
    >
      <span className="font-mono text-[24px] font-bold leading-[0.9] tracking-[0.02em] text-atc-orange sm:text-[28px]">
        {airport.iata || airport.icao || airport.code}
      </span>
      <span className="min-w-0">
        <strong className="block truncate text-[17px] font-extrabold tracking-normal text-atc-text">
          {airport.name}
        </strong>
        <small className="mt-0.5 block truncate text-[13px] text-atc-dim">
          {featured
            ? `${airport.city} · ${airport.country}`
            : airportSubtitle(airport)}
        </small>
      </span>
      <Badge variant="atcCode" className="hidden sm:inline-flex">
        {airport.icao || airport.code || "-"}
      </Badge>
    </Button>
  );
}
