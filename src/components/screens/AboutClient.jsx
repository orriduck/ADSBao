"use client";

import Link from "next/link";
import { ArrowUpRight, Github } from "lucide-react";
import DitherPageShell from "../../features/app-shell/DitherPageShell.jsx";
import ThemeToggle from "../../features/app-shell/ThemeToggle.jsx";
import { useThemePreference } from "../../features/app-shell/useThemePreference.js";

const buildMeta = [
  { label: "Version", value: "0.8.0" },
  { label: "Release", value: "Next.js Web" },
  { label: "Stack", value: "React 19 · Next 16 · Leaflet" },
  { label: "Scope", value: "Maps · Weather · Traffic" },
];

const dataSources = [
  {
    glyph: "METAR",
    title: "Aviation Weather METAR",
    description:
      "Live observations and decoded sky conditions for each airport.",
    host: "aviationweather.gov",
    href: "https://aviationweather.gov/data/api/",
  },
  {
    glyph: "ADS-B",
    title: "adsb.lol Aircraft Feed",
    description: "Crowdsourced ADS-B positions used to render nearby traffic.",
    host: "api.adsb.lol",
    href: "https://api.adsb.lol/",
  },
  {
    glyph: "ROUTE",
    title: "adsbdb Flight Routes",
    description:
      "Callsign-to-route lookup for origin and destination airports.",
    host: "adsbdb.com",
    href: "https://www.adsbdb.com/",
  },
  {
    glyph: "WX",
    title: "Open-Meteo Current Weather",
    description:
      "Local temperature, wind, and conditions for the airport area.",
    host: "open-meteo.com",
    href: "https://open-meteo.com/",
  },
  {
    glyph: "DIR",
    title: "Airports API Directory",
    description: "ICAO/IATA directory powering search and resolution.",
    host: "airportsapi.com",
    href: "https://airportsapi.com/",
  },
  {
    glyph: "WIKI",
    title: "Wikipedia Summary",
    description: "First-paragraph summaries for airport context cards.",
    host: "en.wikipedia.org",
    href: "https://en.wikipedia.org/api/rest_v1/",
  },
  {
    glyph: "MAP",
    title: "OpenStreetMap · CartoDB",
    description: "Light and dark base map tiles plus reference labels.",
    host: "cartocdn.com",
    href: "https://carto.com/attributions",
  },
];

export default function AboutClient() {
  const { themePreference, themeTitle, themeIconKey, cycleTheme } =
    useThemePreference();

  const openExternalLink = (event, href) => {
    const opened = window.open(href, "_blank");
    if (!opened) return;
    opened.opener = null;
    event.preventDefault();
  };

  const backLink = (
    <Link
      href="/"
      className="font-mono text-[10px] uppercase tracking-[0.22em] text-atc-faint transition-colors hover:text-atc-text"
    >
      ← ADSBao
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
      sectionLabel="About"
      mobileLeft={
        <Link href="/" className="mobile-top-nav-link">
          ← ADSBao
        </Link>
      }
      footerLeft={backLink}
      footerThemeToggleClassName="font-mono text-[10px] uppercase tracking-[0.22em] text-atc-faint transition-colors hover:text-atc-text flex items-center gap-1.5"
      renderThemeToggle={renderThemeToggle}
    >
      <div className="flex-none grid grid-cols-2 gap-px mx-6 overflow-hidden border border-[var(--atc-line)] bg-[var(--atc-line)]">
        {buildMeta.map((item) => (
          <div
            key={item.label}
            className="flex min-w-0 flex-col gap-0.5 bg-atc-bg px-3 py-2.5"
          >
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-atc-faint">
              {item.label}
            </span>
            <span className="truncate text-[12px] font-semibold text-atc-text">
              {item.value}
            </span>
          </div>
        ))}
      </div>

      <div className="flex-none px-6 pt-6 pb-3">
        <div className="flex items-baseline justify-between border-b border-[var(--atc-line)] pb-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-atc-faint">
          <span>Data sources</span>
          <span className="tracking-[0.18em] text-atc-dim">
            {dataSources.length} feeds
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <ol className="px-6 divide-y divide-[var(--atc-line)]">
          {dataSources.map((source) => (
            <li key={source.glyph}>
              <a
                href={source.href}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => openExternalLink(event, source.href)}
                className="group grid grid-cols-[56px_minmax(0,1fr)] items-center gap-3 py-3 transition-colors hover:bg-[color-mix(in_oklab,var(--atc-elev)_55%,transparent)] -mx-6 px-6"
              >
                <span className="font-mono text-[16px] font-bold leading-[1] tracking-[0.02em] text-atc-orange">
                  {source.glyph}
                </span>
                <span className="min-w-0">
                  <strong className="block truncate text-[13px] font-semibold text-atc-text">
                    {source.title}
                  </strong>
                  <small className="mt-0.5 block truncate text-[11.5px] text-atc-dim">
                    {source.description}
                  </small>
                </span>
              </a>
            </li>
          ))}
        </ol>

        <div className="px-6 pt-6 pb-6">
          <a
            href="https://github.com/orriduck/ADSBao"
            target="_blank"
            rel="noreferrer"
            onClick={(event) =>
              openExternalLink(event, "https://github.com/orriduck/ADSBao")
            }
            className="group flex items-center justify-between gap-3 border border-[var(--atc-line)] px-4 py-3.5 transition-colors hover:border-[var(--atc-line-strong)]"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-full border border-[var(--atc-line)] text-atc-text">
                <Github className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <div>
                <strong className="block text-[13px] font-semibold text-atc-text">
                  orriduck / ADSBao
                </strong>
                <small className="mt-0.5 block text-[11.5px] text-atc-dim">
                  MIT License
                </small>
              </div>
            </div>
            <ArrowUpRight
              className="h-4 w-4 text-atc-faint transition-colors group-hover:text-atc-orange"
              aria-hidden="true"
            />
          </a>
        </div>
      </div>
    </DitherPageShell>
  );
}
