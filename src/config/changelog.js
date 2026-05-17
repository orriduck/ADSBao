// Product release history rendered by `/changelog`. This is the source
// of truth — keep new releases here instead of editing a markdown file.
// Each release lists the version, a short title, and one or more
// sections. Section kinds are open-ended; the panel renders the `label`
// verbatim, so use sentence-case ("Added", "Fixed", "Refactored", …).

export const CHANGELOG = [
  {
    version: "v0.12.0",
    title: "Aircraft tracking page, airport-prefixed routes, polymorphic sidebar/preview",
    sections: [
      {
        label: "Added",
        items: [
          "/aircraft/[callsign] route renders the same layout as the airport detail page — same sidebar shell, nav row, map controls, aircraft list. The page centers the map on the focal aircraft, fetches its trace, and follows it as it moves.",
          "Adaptive ADS-B callsign provider chain: /api/proxy/aircraft/callsign/[callsign] races adsb.lol + airplanes.live, with race-then-stick failover.",
          "Hover/click on a sidebar row pops a unified preview card. The card is polymorphic — aircraft variant (callsign hero, photo, telemetry, Track → /aircraft/[callsign]) or airport variant (IATA · ICAO hero, flag + place, distance + elevation, Track → /airport/[icao]).",
          "Airport markers on the map are clickable on both pages, sharing the same selection state as aircraft.",
          "Sidebar list is polymorphic: aircraft entries appear first (with identity-flipping animations), nearby airports follow. The Show filter (All / Aircraft / Airports) gates which entity types render.",
          "Map control bar gains a Fit to trace button that zooms the map to the bounds of the currently-rendered trace and stops auto-following the focal until the user clicks back to a preset zoom.",
          "Secondary trace (clicked aircraft that isn't the focal) renders at 40% opacity so the URL-tracked focal stays visually dominant.",
          "Flight detail telemetry strip renders GS / ALT / V/S / HEADING / ICAO24 / STATUS as the same stat-card style the airport sidebar uses for WEATHER / FLIGHTS.",
          "Map-label tiles default to ON on the flight detail page so place names give the moving map useful context.",
        ],
      },
      {
        label: "Changed",
        items: [
          "Route rename: airport detail page moved from /[icao] to /airport/[icao]. Flight detail page is /aircraft/[callsign]. Old /KBOS-style URLs are not preserved.",
          "Selection-mode mask lightened — non-selected aircraft go from 28% to 55% opacity, base map tile dim drops from 0.72/0.78 to 0.88/0.92.",
          "Theme detection moved from a client-side boot script to a server-rendered data-theme attribute driven by a `theme` cookie. Eliminates the React 19 script-inside-component console warning.",
        ],
      },
      {
        label: "Refactored",
        items: [
          "Extracted shared explorer primitives — SidebarShell, SidebarIdentityHero, SidebarMetric, ExplorerUiContext, ExplorerMapMenu — and moved them from components/airport/explorer/ to components/explorer/ since both pages consume them.",
          "AirportMap accepts arbitrary children rendered inside MapContext.Provider, so per-page concerns (e.g. MapFitToTraceController on the flight page) can be composed without touching the map shell.",
          "SelectedAircraftTraceContext now exposes a deduplicated traces[] array; SelectedAircraftTrace was split into a thin context-reader + a SingleAircraftTrace renderer that takes trace data as props.",
          "Aircraft + airport preview cards share the same outer AircraftPreviewCard shell; inner AircraftPreviewMetadataCard / AirportPreviewMetadataCard swap based on which entity is selected.",
        ],
      },
      {
        label: "Fixed",
        items: [
          "MapFitToTraceController's leaflet import crashed SSR with `window is not defined`; component is now dynamic-imported with ssr: false.",
          "getVisibleAircraft was silently filtering out the focal aircraft on the flight page. The ground filter is now skipped when there's no actual airport in focus.",
          "Sidebar list rows were collapsing to zero horizontal padding inside the flight sidebar because --airport-sidebar-inset was only declared on .airport-sidebar-panel. The token now lives on .sidebar-shell so both pages get it.",
          "Stat cards' big numbers were selectable on text-click, which the focus highlight made look like a click-state. Cards now have user-select: none and cursor: default by default.",
        ],
      },
    ],
  },
  {
    version: "v0.11.0",
    title: "Selected-aircraft trace, focused revalidation, route consistency",
    sections: [
      {
        label: "Added",
        items: [
          "Selected-aircraft trace renders the last few minutes of the focused plane's path as a Leaflet polyline with an SVG linearGradient core (tail 20% → head 95% opacity) and timestamped fade-in label cards.",
          "When the focused aircraft is DEPARTURE or ARRIVAL, the trail and label accents pick up the same color the marker uses (orange for departures, teal/blue for arrivals).",
          "Clicking an already-focused aircraft marker triggers an AeroDataBox revalidation of its route (?force=aerodatabox, Cache-Control: no-store).",
        ],
      },
      {
        label: "Changed",
        items: [
          "enrichAircraftWithRoutes now ties movement to a renderable flightRouteLabel: if the route is missing either endpoint, the aircraft is classified UNKNOWN instead of being colored DEPARTURE/ARRIVAL with an empty sidebar row.",
          "Map overlays removed: top-left ICAO + coordinate label and right-edge DEP/UNKN/ARR traffic legend are gone — the marker color encoding already communicates this.",
          "Trail label cards hug their content (width: max-content) instead of inheriting the Leaflet divIcon 56-px box, and the latest marker stacks on top via zIndexOffset.",
        ],
      },
      {
        label: "Fixed",
        items: [
          "ADS-B provider failover: proxy now retries against airplanes.live whenever adsb.lol returns 5xx, 429, or times out, with a per-process cool-down so we don't hammer a degraded provider.",
          "Trail and labels no longer briefly flash a previous aircraft's path when switching focus: committedTracePoints resets atomically on aircraftHex change.",
        ],
      },
    ],
  },
  {
    version: "v0.10.0",
    title: "Global airport data layer + richer silhouettes",
    sections: [
      {
        label: "Added",
        items: [
          "OurAirports as the global airport static-data source, persisted in Supabase via a four-table schema (airports, runways, airport_frequencies, navaids) with anon-read / service-role-write RLS.",
          "GET /api/search and GET /api/airport/[ident] — thin Next.js routes over a clean repository → service → API layering with relevance ranking.",
          "Runway annotation overlay works globally: non-US airports fall back to OurAirports runway thresholds when FAA CIFP has no coverage.",
          "Aircraft silhouettes switched to RexKramer1/AircraftShapesSVG — 178 SVGs covering specific ICAO type designators shipping in-repo.",
          "Featured airports diversified to a 10-airport global mix (JFK, LAX, ORD, ATL, LHR, CDG, HND, HKG, DXB, YYZ).",
          "Country flag + full country name on the home row and airport-page header (regional-indicator codepoints + Intl.DisplayNames, zero deps).",
        ],
      },
      {
        label: "Changed",
        items: [
          "Browser-side airportDirectoryClient is now a thin wrapper over /api/search and /api/airport/[ident].",
          "Home page search no longer restricts results to the US.",
          "Aircraft icon route serves SVGs from public/icons/aircraft/ on disk; no runtime dependency on any external icon CDN.",
        ],
      },
      {
        label: "Removed",
        items: [
          "airportsapi.com integration and its legacy airport-directory client package.",
          "The pnpm build:procedures, pnpm import:ourairports, and pnpm icons:aircraft script shortcuts. scripts/build-faa-cifp-procedures.js and scripts/download-aircraft-icons.js deleted.",
        ],
      },
    ],
  },
  {
    version: "v0.9.0",
    title: "Navy tracking console redesign",
    sections: [
      {
        label: "Added",
        items: [
          "Persistent top navigation bar with ADSBao branding, Airports Search, and About links.",
          "Desktop sidebar layout (400px) for airport context alongside full-height Leaflet map.",
          "Callsign-first traffic data table with route status badges (PENDING/LOCAL/ROUTE).",
          "Navy tracking console dark theme palette (#041A38, #244164, #0A2244).",
          "Aircraft type silhouette markers on the map, served same-origin via /api/icons/aircraft/[name] with day-long edge caching.",
          "Marker wake-class scaling: ADS-B emitter A-category drives a uniform size nudge (A1 → 0.90× through A5 → 1.10×).",
          "About page now credits ADS-B Radar (https://adsb-radar.com) for the aircraft icon set.",
        ],
      },
      {
        label: "Changed",
        items: [
          "Redesigned airport operations screen from full-bleed map overlay to sidebar + map layout.",
          "Updated TrafficPanel from summary cards to rich data table with altitude, ground speed, position, and route columns.",
          "Darkened the dark theme with deep navy tones and FlightAware-inspired console aesthetic.",
          "Dark theme accent orange shifted from #FF5A1F to #FF6B35 for better contrast.",
        ],
      },
      {
        label: "Fixed",
        items: [
          "TrafficPanel now receives aircraftWithRoutes (with resolved movement and route labels) instead of raw aircraft data.",
          "Consolidated theme toggle into the global NavBar, removing duplicate from SearchScreen.",
        ],
      },
    ],
  },
  {
    version: "v0.8.0",
    title: "Next.js Vercel refactor",
    sections: [
      {
        label: "Changed",
        items: [
          "Rebuilt the web app from Vue 3/Vite to React on Next.js App Router.",
          "Kept Tailwind CSS v4 and DaisyUI as the styling foundation.",
          "Switched Vercel Analytics and Speed Insights to their Next.js integrations.",
          "Replaced VueBits-derived UI code with React component equivalents.",
        ],
      },
      {
        label: "Moved",
        items: [
          "FlightAware route lookup from a root Vercel function to a Next.js Route Handler under src/app/api.",
          "Vue composables to React hooks while preserving the existing data clients and pure utility tests.",
        ],
      },
    ],
  },
  {
    version: "v0.7.1",
    title: "Map and mobile polish",
    sections: [
      {
        label: "Fixed",
        items: [
          "Start aircraft polling only after airport coordinates are available.",
          "Refine the mobile airport card sheet.",
          "Improve close-range and wide-range ADS-B merge behavior.",
        ],
      },
    ],
  },
  {
    version: "v0.7.0",
    title: "Flight route and traffic context",
    sections: [
      {
        label: "Added",
        items: [
          "Airport-aware flight route labels.",
          "FlightAware-backed route lookup through a Vercel serverless function.",
          "Dual-range ADS-B polling with wide 20 NM context and close 3 NM airport vicinity.",
          "Airport context overlays and ground filtering.",
        ],
      },
      {
        label: "Changed",
        items: [
          "Replaced the older adsbdb route path with a Vercel-hosted FlightAware route lookup.",
          "Removed the static route database and OpenFlights preprocessing.",
        ],
      },
    ],
  },
  {
    version: "v0.6.0",
    title: "Vercel observability and production routing",
    sections: [
      {
        label: "Added",
        items: [
          "Vercel Web Analytics.",
          "Vercel Speed Insights.",
          "Runtime logging coverage for upstream data requests.",
        ],
      },
      {
        label: "Fixed",
        items: [
          "Restored production-safe Vercel proxy rewrites.",
          "Hardened proxy response parsing so upstream HTML/error responses do not break unrelated polling.",
        ],
      },
    ],
  },
  {
    version: "v0.5.0",
    title: "Vercel-first web architecture",
    sections: [
      {
        label: "Added",
        items: [
          "Vercel deployment configuration.",
          "Browser-first airport directory lookup with client caching.",
          "Same-origin proxy paths for browser-blocked METAR and ADS-B upstreams.",
        ],
      },
      {
        label: "Changed",
        items: [
          "Flattened the frontend app into the repository root.",
          "Moved shared constants, airport helpers, math helpers, and fallback airport metadata into reusable modules.",
          "Removed redundant CI once Vercel became the deployment gate.",
        ],
      },
      {
        label: "Removed",
        items: [
          "Electron desktop packaging.",
          "Homebrew cask release pipeline.",
          "One-time migration docs and stale desktop build scripts.",
        ],
      },
    ],
  },
  {
    version: "v0.4.0",
    title: "ADSBao web pivot",
    sections: [
      {
        label: "Breaking",
        items: [
          "Renamed the project to ADSBao.",
          "Removed the legacy LiveATC frontend UI.",
          "Removed the LiveATC player, feed selector, and transcription presentation from the product scope.",
          "Removed legacy backend dependencies.",
        ],
      },
      {
        label: "Changed",
        items: [
          "Repositioned the app as an airport explorer focused on airport lookup, weather context, and nearby traffic visualization.",
        ],
      },
    ],
  },
];
