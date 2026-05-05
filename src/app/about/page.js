import Link from "next/link";
import { ArrowUpRight, Github } from "lucide-react";
import { Badge } from "../../components/ui/badge.jsx";
import BackgroundRays from "../../components/effects/BackgroundRays.jsx";
import Logo from "../../components/brand/Logo.jsx";

export const metadata = {
  title: "About · ADSBao",
};

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
    description: "Live observations and decoded sky conditions for each airport.",
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
    description: "Callsign-to-route lookup for origin and destination airports.",
    host: "adsbdb.com",
    href: "https://www.adsbdb.com/",
  },
  {
    glyph: "WX",
    title: "Open-Meteo Current Weather",
    description: "Local temperature, wind, and conditions for the airport area.",
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

export default function AboutPage() {
  return (
    <div className="about-screen min-h-screen text-atc-text">
      <BackgroundRays />
      <main className="mx-auto flex min-h-screen w-full max-w-[920px] flex-col px-5 pb-16 pt-7 sm:px-10 sm:pt-10 lg:px-14">
        <div className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[1.4px] text-atc-dim">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-atc-text transition-colors hover:text-atc-orange"
          >
            <Logo size={20} />
            <span>ADSBao</span>
          </Link>
          <span className="text-atc-orange">/</span>
          <span>About</span>
        </div>

        <header className="about-hero relative mt-8 overflow-hidden rounded-[var(--atc-radius-panel)] border border-atc-line bg-atc-card px-6 py-7 sm:mt-12 sm:px-8 sm:py-9">
          <div className="flex flex-col gap-3 font-mono text-[10px] uppercase tracking-[1.6px] text-atc-faint sm:flex-row sm:items-center sm:gap-4">
            <span className="inline-flex items-center gap-2 text-atc-orange">
              <span className="h-1.5 w-1.5 rounded-full bg-atc-orange shadow-[0_0_8px_var(--atc-orange)]" />
              RUNWAY 0.8.0
            </span>
            <span className="hidden text-atc-line-strong sm:inline">·</span>
            <span>FLIGHT PROGRESS STRIP</span>
            <span className="hidden text-atc-line-strong sm:inline">·</span>
            <span>BUILT FOR THE WEB</span>
          </div>

          <h1 className="about-title mt-4 leading-[0.85] tracking-[-0.02em]">
            <span className="font-extrabold">ADSB</span>
            <span className="font-extrabold italic text-atc-orange">ao</span>
          </h1>

          <p className="mt-5 max-w-[560px] text-[14px] leading-relaxed text-atc-text/85 sm:text-[15px]">
            An airport explorer that stitches together live ATC weather, nearby
            ADS-B traffic, and reference cartography into one quiet console.
            Built to feel like reading a flight progress strip — at a glance,
            no clutter.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--atc-radius-control)] border border-atc-line bg-atc-line text-left sm:grid-cols-4">
            {buildMeta.map((item) => (
              <div
                key={item.label}
                className="flex min-w-0 flex-col gap-0.5 bg-atc-card px-3 py-2.5"
              >
                <span className="font-mono text-[9px] uppercase tracking-[1.6px] text-atc-faint">
                  {item.label}
                </span>
                <span className="truncate text-[12px] font-semibold text-atc-text">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </header>

        <section className="mt-12 sm:mt-16">
          <div className="flex items-end justify-between gap-4 border-b border-atc-line pb-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[1.6px] text-atc-faint">
                Frequencies
              </div>
              <h2 className="mt-1 text-[24px] font-bold leading-[1.1] tracking-[-0.01em] text-atc-text sm:text-[28px]">
                Data sources
              </h2>
            </div>
            <Badge variant="atcCode" className="hidden sm:inline-flex">
              {dataSources.length} feeds
            </Badge>
          </div>

          <ol className="mt-3 grid gap-2">
            {dataSources.map((source, index) => (
              <li key={source.glyph}>
                <a
                  href={source.href}
                  target="_blank"
                  rel="noreferrer"
                  className="about-source group grid w-full grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 rounded-[var(--atc-radius-control)] border border-atc-line bg-atc-card px-3.5 py-3 transition-colors hover:border-atc-line-strong hover:bg-atc-elev sm:grid-cols-[92px_minmax(0,1fr)_auto] sm:px-4 sm:py-3.5"
                >
                  <span className="flex flex-col gap-0.5">
                    <span className="font-mono text-[9px] uppercase tracking-[1.6px] text-atc-faint">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="font-mono text-[16px] font-bold leading-[1] tracking-[0.02em] text-atc-orange sm:text-[18px]">
                      {source.glyph}
                    </span>
                  </span>
                  <span className="min-w-0">
                    <strong className="block truncate text-[13px] font-extrabold text-atc-text sm:text-[14px]">
                      {source.title}
                    </strong>
                    <small className="mt-0.5 block truncate text-[12px] text-atc-dim">
                      {source.description}
                    </small>
                  </span>
                  <span className="hidden items-center gap-2.5 sm:flex">
                    <span className="font-mono text-[10px] uppercase tracking-[1.4px] text-atc-dim transition-colors group-hover:text-atc-text">
                      {source.host}
                    </span>
                    <ArrowUpRight
                      className="h-4 w-4 text-atc-faint transition-colors group-hover:text-atc-orange"
                      aria-hidden="true"
                    />
                  </span>
                  <ArrowUpRight
                    className="h-4 w-4 text-atc-faint transition-colors group-hover:text-atc-orange sm:hidden"
                    aria-hidden="true"
                  />
                </a>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12 sm:mt-16">
          <div className="flex items-end justify-between border-b border-atc-line pb-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[1.6px] text-atc-faint">
                Source
              </div>
              <h2 className="mt-1 text-[24px] font-bold leading-[1.1] tracking-[-0.01em] text-atc-text sm:text-[28px]">
                Repository
              </h2>
            </div>
          </div>
          <a
            href="https://github.com/orriduck/ADSBao"
            target="_blank"
            rel="noreferrer"
            className="about-source group mt-3 flex items-center justify-between gap-3 rounded-[var(--atc-radius-control)] border border-atc-line bg-atc-card px-3.5 py-3 transition-colors hover:border-atc-line-strong hover:bg-atc-elev sm:px-4 sm:py-4"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full border border-atc-line bg-atc-bg text-atc-text">
                <Github className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <div>
                <strong className="block text-[13px] font-extrabold text-atc-text sm:text-[14px]">
                  orriduck / ADSBao
                </strong>
                <small className="mt-0.5 block text-[12px] text-atc-dim">
                  Public source under the MIT License. Issues and PRs welcome.
                </small>
              </div>
            </div>
            <span className="flex items-center gap-2.5">
              <span className="hidden font-mono text-[10px] uppercase tracking-[1.4px] text-atc-dim transition-colors group-hover:text-atc-text sm:inline">
                github.com
              </span>
              <ArrowUpRight
                className="h-4 w-4 text-atc-faint transition-colors group-hover:text-atc-orange"
                aria-hidden="true"
              />
            </span>
          </a>
        </section>

        <footer className="mt-14 flex flex-col gap-2 border-t border-atc-line pt-5 font-mono text-[10px] uppercase tracking-[1.6px] text-atc-faint sm:flex-row sm:items-center sm:justify-between">
          <span>END OF TRANSMISSION · ADSBao 0.8.0</span>
          <span>Map tiles © OpenStreetMap · CartoDB</span>
        </footer>
      </main>
    </div>
  );
}
