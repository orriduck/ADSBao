// Product release history rendered by `/changelog`. This is the source
// of truth — keep new releases here instead of editing a markdown file.
// Each release has a `kind` ("feat" | "patch" | "breaking"), a one-line
// `summary`, and an `highlights` array of short bullets. Keep bullets
// terse (one clause); the long-form explanation belongs in the PR.

export const CHANGELOG = [
  {
    version: "v1.9.0",
    kind: "feat",
    title: "Watcher Mode candidate photo spots",
    summary:
      "Watcher Mode now generates and displays OSM-derived candidate photo spots for the focused airport, with runway-aligned static data and conservative preview copy.",
    highlights: [
      "Watcher Mode / 看客模式 defaults candidate watching spots on while other map modes keep them off",
      "KBOS and JFK candidate photo spots load from static JSON generated from runway alignment plus public OpenStreetMap data",
      "Approach and airport zooms add PHOTO SPOT counts to the focal airport badge; detail zoom renders clickable camera markers",
      "Selected candidate spots use the shared preview card surface with OSM attribution and conservative map-derived disclaimers",
      "Candidate marker, badge, and preview transitions run for at least 300ms and respect reduced-motion preferences",
    ],
  },
  {
    version: "v1.8.4",
    kind: "patch",
    title: "Airport zoom declutter tuning",
    summary:
      "Airport map zoom levels now share one feature configuration for runway labels, range labels, nearby runways, and surface-traffic suppression.",
    highlights: [
      "Airport-level runway end labels stay hidden until detail zoom",
      "Nearby airport-surface traffic hides within 3nm at approach zoom and 0.5nm at airport zoom",
      "Zoom-specific map feature toggles now live in one configuration table",
    ],
  },
  {
    version: "v1.8.3",
    kind: "patch",
    title: "Mechanism page and navigation polish",
    summary:
      "Mechanism now uses the same dithered page shell as Home and About, with clearer expandable explanations and locale-safe toolbar navigation.",
    highlights: [
      "Mechanism page returns to the Home/About dither background instead of a synthetic airport map",
      "Mechanism rows match the About list pattern while expanded content explains each system in paragraphs",
      "Top navigation preserves the active locale when moving between Home, About, Mechanism, and Changelog",
      "Dither page titles use safer line-height so Changelog text no longer clips",
    ],
  },
  {
    version: "v1.8.1",
    kind: "patch",
    title: "Aircraft type labels and airspace entry polish",
    summary:
      "Aircraft previews and filters now prefer friendly type names while the default airspace layer animates in on first load.",
    highlights: [
      "Aircraft preview cards show friendly aircraft names with ICAO codes demoted to secondary metadata",
      "Aircraft type filters use the shared aircraft type resolver and match friendly names plus ICAO codes",
      "Category-only aircraft display as Unknown while the filter groups them as All Unclassified",
      "Airspace overlays now stagger-fade in during the initial default load",
    ],
  },
  {
    version: "v1.8.0",
    kind: "feat",
    title: "Airport airspace overlays",
    summary:
      "Airport maps now render OpenAIP airspaces directly on the map with translucent fills, labeled boundaries, clickable preview cards, and persisted layer toggles.",
    highlights: [
      "OpenAIP-style airspace overlays render on airport maps with focus styling and small-airspace hit priority",
      "Danger, restricted, controlled, informational, and unknown airspaces use theme-aware design tokens",
      "Desktop and mobile airspace preview cards show localized type, access rule, class, and vertical limits",
      "Map layer settings for labels, runway beams, navaids, and airspaces persist in the browser",
      "Active sidebar metric and filter tiles keep visible resting borders across light and dark themes",
    ],
  },
  {
    version: "v1.7.0",
    kind: "feat",
    title: "OpenAIP airport directory migration",
    summary:
      "Airport search and detail context now use OpenAIP as the primary aviation directory, with Supabase-backed runway threshold geometry retained for accurate map overlays.",
    highlights: [
      "Airport search, airport details, frequencies, nearby airports, navaids, reporting points, airspaces, and obstacles moved to OpenAIP",
      "Runway map centerlines use imported OurAirports threshold coordinates instead of synthetic OpenAIP centroid geometry",
      "OpenAIP search results without normal ICAO-style airport codes are filtered out before display",
      "About and architecture docs now list OpenAIP plus the narrow OurAirports runway geometry attribution",
    ],
  },
  {
    version: "v1.6.0",
    kind: "feat",
    title: "Nearby list virtualization and data-layer onboarding",
    summary:
      "Sidebar nearby list windows through a virtualizer with animated digit metrics, page-level UI gets unified token-based stacking, and TanStack Query starts handling client-side data fetching.",
    highlights: [
      "Nearby list (aircraft + airports) windows through TanStack Virtual; distance and altitude animate via NumberFlow on every poll tick",
      "Subtle fade-up enter animation for genuinely-new rows; honours prefers-reduced-motion",
      "Pinned aircraft slot styled as a peer of the metric tiles — ink surface with a bottom-up edge glow",
      "Toolbar and sidebar geometry unified across home and detail pages; both center over the content area",
      "Page-level z-index ladder replaced by named tier tokens; Leaflet pane collisions fixed in both desktop and mobile layouts",
      "TanStack Query and DevTools mounted in the app shell; useAirportWiki migrated as the pilot for future data-hook adoption",
      "~15% style.css reduction by migrating small leaf components to inline Tailwind utilities and dropping dead CSS",
    ],
  },
  {
    version: "v1.5.0",
    kind: "feat",
    title: "Tracking stability and map-label optimization",
    summary:
      "Flight tracking now separates live, fallback, stale, and missing position states while route overlays and map labels stay clearer across themes and languages.",
    highlights: [
      "Tracked flights use explicit position states instead of treating every callsign match as live",
      "Fallback positions stay visible without triggering unnecessary lost-signal prompts",
      "Terminal flights keep the last known point visible and stop repeated route lookups",
      "Predicted route arcs render as dashed lines, including their glow layer",
      "Map place labels follow the selected app language",
    ],
  },
  {
    version: "v1.4.0",
    kind: "feat",
    title: "Account sign-in + cleaner lost-signal handling",
    summary:
      "Sign in to your ADSBao account from the map toolbar or nav menu, and the lost-signal modal on a tracked flight now retries silently in the background instead of asking you to retry by hand.",
    highlights: [
      "Account sign-in / sign-up via the avatar control on the flight + airport map toolbars (also reachable from the home / about / changelog nav menu)",
      "Lost-signal modal trimmed to two actions: keep the current view (polling continues silently in the background) or back to home",
      "Live position resumes automatically once the feed is back — no manual retry needed",
    ],
  },
  {
    version: "v1.3.0",
    kind: "feat",
    title: "adsbdb routes + community feedback + complete runway map",
    summary:
      "Route lookups move to api.adsbdb.com, users can submit temporary route corrections, and the airport runway map now renders every runway from OpenAIP.",
    highlights: [
      "Public route provider switched from VRS standing-data to api.adsbdb.com",
      "Community-feedback overrides: `*`-marked user-supplied routes win for 12h",
      "Preview card: inline form on desktop, modal on mobile, with copy that distinguishes 'Suggest the right one' vs 'Suggest correction'",
      "Flight tracking page now fetches and shows the route, and exposes the same feedback affordance",
      "KBOS-class fix: VFR-only runways (09/27, 14/32, 15L/33R) render again — runway map sourced from OpenAIP globally",
      "Mobile flight sidebar is vertically scrollable",
    ],
  },
  {
    version: "v1.2.1",
    kind: "patch",
    title: "Track button opens in a new tab",
    summary:
      "Preview-card Track action switches to an anchor so right-click → Open in New Tab works.",
    highlights: [
      "AircraftPreviewMetadataCard Track → next/link <Link>",
      "AirportPreviewMetadataCard Track → next/link <Link>",
      "Shared .aircraft-preview-card__track-btn rule made anchor-friendly",
      "Restored the missing vertical seam between Type and Alt filter cards",
    ],
  },
  {
    version: "v1.2.0",
    kind: "feat",
    title: "Themed runway approach + aircraft nose beam + scale-bar polish",
    summary:
      "Theme-aware approach visualisation, dark-theme aircraft nose beam, always-on scale bar, and toast theming wired to the app.",
    highlights: [
      "Runway approach abstracted: dark = glowing wedge, light = dashed extended centerline",
      "Aircraft silhouettes get a soft forward nose beam on dark theme",
      "Scale bar always visible with theme-aware backdrop blur",
      "Map zoom presets retuned to 10 / 11 / 13",
      "Toast layer drops below the map toolbar and matches the app theme",
    ],
  },
  {
    version: "v1.1.0",
    kind: "feat",
    title: "Distance rings + map scale bar",
    summary:
      "Concentric distance rings on the airport page, an adaptive scale bar at approach zoom, and a uniform 40nm radius for all nearby searches.",
    highlights: [
      "All nearby-traffic and nearby-airport searches normalized to 40nm",
      "Airport page: focal airport rings every 3nm out to 30nm",
      "Airport page: nearby airports show rings every 3nm out to 10nm",
      "Flight page: single 5nm proximity ring around each nearby airport; focal aircraft rings suppressed",
      "Per-ring distance labels at airport / detail zoom",
      "Scale bar (比例尺) in the bottom-left at approach zoom",
      "Every third ring rendered slightly bolder as a visual anchor",
    ],
  },
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
      "OpenAIP-backed global search, 178 ICAO-type silhouettes, country flags.",
    highlights: [
      "OpenAIP backing /api/search + /api/airport/[ident]",
      "Global OpenAIP runway annotations",
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
