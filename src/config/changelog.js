// Product release history rendered by `/changelog`. This is the source
// of truth — keep new releases here instead of editing a markdown file.
// Each release has a `kind` ("feat" | "patch" | "breaking"), a one-line
// `summary`, and an `highlights` array of short bullets. Keep bullets
// terse (one clause); the long-form explanation belongs in the PR.

export const CHANGELOG = [
  {
    version: "v1.0.0",
    kind: "feat",
    title: "Persistent tracking sessions + drop-up nav menu",
    summary:
      "Refresh-safe trace persistence, lost-signal overlay, /changelog page, and a unified sibling-page nav menu.",
    highlights: [
      "12h tracking session anchor + 24h trace cache in localStorage",
      "Full + recent + live trace merge with explicit priority",
      "Lost-signal overlay (keep / retry / back home)",
      "Fit-to-trace returns to the same zoom preset",
      "Sidebar nearby list switches to static digits (framerate)",
      "Drop-up nav menu shared by Home / About / Changelog",
      "New /changelog page (data moved from CHANGELOG.md to JS)",
    ],
  },
  {
    version: "v0.12.0",
    kind: "feat",
    title: "Aircraft tracking page + polymorphic explorer",
    summary:
      "/aircraft/[callsign] route, polymorphic sidebar + preview, fit-to-trace, multi-provider failover.",
    highlights: [
      "/aircraft/[callsign] page mirrors the airport layout",
      "Polymorphic preview card (aircraft + airport variants)",
      "Polymorphic sidebar list with Show filter",
      "Fit-to-trace map control",
      "ADS-B callsign provider race + failover",
      "Cookie-driven theme (no more React 19 warning)",
      "Route rename: /[icao] → /airport/[icao]",
    ],
  },
  {
    version: "v0.11.0",
    kind: "feat",
    title: "Selected-aircraft trace + revalidation",
    summary:
      "Live trace polyline for the focused plane, route revalidation via AeroDataBox, classification fixes.",
    highlights: [
      "Trace polyline with gradient + fade-in label cards",
      "Trail color tracks departure/arrival accent",
      "Click focused marker to revalidate route",
      "UNKNOWN classification when route has no label",
      "ADS-B provider failover (5xx / 429 / timeout)",
    ],
  },
  {
    version: "v0.10.0",
    kind: "feat",
    title: "Global airport data + richer silhouettes",
    summary:
      "OurAirports via Supabase, global search, 178 ICAO-type silhouettes, country flags.",
    highlights: [
      "OurAirports backing /api/search + /api/airport/[ident]",
      "Global runway annotations (FAA CIFP + OurAirports fallback)",
      "178 aircraft silhouettes shipping in-repo",
      "Diversified featured airports (JFK, LHR, HND, …)",
      "Country flag + name on home rows and airport header",
    ],
  },
  {
    version: "v0.9.0",
    kind: "feat",
    title: "Navy tracking console redesign",
    summary:
      "Sidebar + map layout, callsign-first traffic table, deep navy palette, silhouette markers.",
    highlights: [
      "Persistent top nav with ADSBao / Search / About",
      "400px desktop sidebar alongside full-height map",
      "Callsign-first traffic table with route status badges",
      "Aircraft silhouette markers (ICAO type + emitter)",
      "Wake-class size nudge (A1 → 0.90×, A5 → 1.10×)",
    ],
  },
  {
    version: "v0.8.0",
    kind: "feat",
    title: "Next.js Vercel refactor",
    summary: "Rebuilt the app from Vue 3/Vite to React on Next.js App Router.",
    highlights: [
      "React on Next.js App Router",
      "Tailwind CSS v4 + DaisyUI retained",
      "Vercel Analytics + Speed Insights via Next integrations",
      "Vue composables → React hooks",
      "FlightAware route lookup moved to a Route Handler",
    ],
  },
  {
    version: "v0.7.1",
    kind: "patch",
    title: "Map and mobile polish",
    summary: "Polling guards, mobile sheet refinements, ADS-B merge fixes.",
    highlights: [
      "Start aircraft polling only after coordinates load",
      "Refine the mobile airport card sheet",
      "Improve close-range + wide-range ADS-B merge",
    ],
  },
  {
    version: "v0.7.0",
    kind: "feat",
    title: "Flight route + traffic context",
    summary:
      "Airport-aware route labels, FlightAware lookup, dual-range ADS-B polling.",
    highlights: [
      "Airport-aware flight route labels",
      "FlightAware route lookup via Vercel function",
      "Dual-range polling (wide 20 NM + close 3 NM)",
      "Airport context overlays + ground filtering",
    ],
  },
  {
    version: "v0.6.0",
    kind: "feat",
    title: "Vercel observability + production routing",
    summary:
      "Web Analytics, Speed Insights, hardened proxy and upstream logging.",
    highlights: [
      "Vercel Web Analytics + Speed Insights",
      "Runtime logging on upstream data requests",
      "Restored production-safe proxy rewrites",
      "Hardened proxy parsing against upstream HTML/error",
    ],
  },
  {
    version: "v0.5.0",
    kind: "feat",
    title: "Vercel-first web architecture",
    summary:
      "Vercel deploy config, same-origin proxies, dropped Electron + Homebrew.",
    highlights: [
      "Vercel deployment configuration",
      "Browser-first airport directory with client caching",
      "Same-origin proxy paths for METAR + ADS-B upstreams",
      "Removed Electron and Homebrew cask pipelines",
    ],
  },
  {
    version: "v0.4.0",
    kind: "breaking",
    title: "ADSBao web pivot",
    summary:
      "Renamed to ADSBao; dropped LiveATC UI, player, and transcription scope.",
    highlights: [
      "Project renamed to ADSBao",
      "Removed legacy LiveATC frontend + backend",
      "Repositioned as an airport explorer",
    ],
  },
];
