// Product release history rendered by `/changelog`. This is the
// source of truth — keep new releases here instead of editing a
// markdown file. Each release has a `kind` ("feat" | "patch" |
// "breaking"), a one-line `summary`, and a small set of high-level
// `highlights` bullets. Keep entries terse — the long-form story
// belongs in the PR.

export const CHANGELOG = [
  {
    version: "v2.6.4",
    kind: "patch",
    title: "Railway home shell restore",
    summary:
      "The migrated Railway frontend now renders the home page inside the intended dither shell again.",
    highlights: [
      "Restored the Vite root route to the same dither page shell used before the Railway cutover",
      "Kept airport detail pages on the full-screen map explorer route",
      "Verified the custom domains keep serving from Railway after removing the old Vercel project and domain record",
    ],
  },
  {
    version: "v2.6.3",
    kind: "patch",
    title: "Railway single-service runtime",
    summary:
      "ADSBao now builds as a Vite React app served by the Railway Go data-service with same-origin API and WebSocket traffic.",
    highlights: [
      "Removed the Next.js and Vercel runtime from the production app and switched the frontend scripts to Vite",
      "Moved SPA static serving, realtime auth, feature flags, provider proxy routes, and WebSocket traffic behind one Go service",
      "Updated Railway Docker/config-as-code and browser env naming to the Vite/Railway deployment path",
    ],
  },
  {
    version: "v2.6.2",
    kind: "patch",
    title: "URL-first provider logs",
    summary:
      "New Relic log messages now show the called URL, query parameters, error, and duration in one compact line.",
    highlights: [
      "Changed data-service external request logs to use status-prefixed provider URLs with optional query params and error details",
      "Changed Vercel proxy logs to show the requested API path, query params, status error, and duration",
      "Kept provider, source, route, status class, and duration fields queryable as structured New Relic attributes",
    ],
  },
  {
    version: "v2.6.1",
    kind: "patch",
    title: "Readable observability logs",
    summary:
      "New Relic logs now expose provider, route, status, result, and latency directly in the message column.",
    highlights: [
      "Expanded data-service external request logs with readable provider, endpoint, result, status class, and duration details",
      "Expanded Vercel proxy logs with route, source, attempt chain, status class, and duration details",
      "Added snake_case New Relic fields so Logs and NRQL views can show latency and status columns without dotted-field friction",
    ],
  },
  {
    version: "v2.6.0",
    kind: "feat",
    title: "New Relic observability",
    summary:
      "ADSBao now emits richer New Relic telemetry across the realtime data-service and Vercel proxy routes.",
    highlights: [
      "Added New Relic APM transactions for the Go data-service HTTP surface and background provider polling",
      "Recorded external provider requests as structured logs, custom events, custom metrics, and latency summaries",
      "Connected Vercel proxy routes to New Relic Metric API and Log API telemetry for route latency and provider errors",
    ],
  },
  {
    version: "v2.5.1",
    kind: "patch",
    title: "Toolbar and tracking polish",
    summary:
      "Map toolbars are more consistent across desktop and mobile, and precise callsign tracking recovers from empty provider responses.",
    highlights: [
      "Reworked map range controls into a shared Far, Medium, and Near menu with tracking-specific trace views",
      "Kept settings, screen wake lock, language, and theme controls consistent across map and mobile sidebar surfaces",
      "Fixed realtime callsign provider fallback so oceanic flights like DAL58 can resolve from airplanes.live when adsb.lol is empty",
    ],
  },
  {
    version: "v2.5.0",
    kind: "feat",
    title: "Realtime data service",
    summary:
      "Live traffic now runs through ADSBao's realtime data service with app-owned persistence.",
    highlights: [
      "Moved live map traffic behind a Railway data-service deployment with WebSocket updates for airport and nearby views",
      "Migrated app persistence to Railway Postgres so static airport augmentation and user settings share one app-owned database",
      "Tightened realtime channel boundaries around public traffic and selected-aircraft tracking while keeping internal route-cache work private",
    ],
  },
  {
    version: "v2.4.4",
    kind: "patch",
    title: "Full airport names",
    summary:
      "Airport names now render in full instead of OpenAIP's truncated, all-caps form.",
    highlights: [
      "Restored an OurAirports name table to override OpenAIP's ~40-character truncated names",
      "Airport headers and nearby lists show full mixed-case names (e.g. \"Boston Logan International Airport\")",
      "Backfills the city label when OpenAIP leaves it blank",
    ],
  },
  {
    version: "v2.4.3",
    kind: "patch",
    title: "Manrope typography",
    summary:
      "ADSBao now uses Manrope across the app for a cleaner, more confident transport-product voice.",
    highlights: [
      "Global font stack switches to Manrope with Noto Sans SC retained for Chinese text",
      "Logo, Open Graph image, and display titles use preset normal tracking instead of custom spacing",
    ],
  },
  {
    version: "v2.4.2",
    kind: "patch",
    title: "Browse lists & toolbar polish",
    summary:
      "Static-page browse lists and page toolbars now share the same tidy liquid-glass patterns.",
    highlights: [
      "Home, about, mechanism, and changelog lists use aligned rows with frosted hover and glass active states",
      "Static-page toolbars reuse the airport detail toolbar tone and sizing",
    ],
  },
  {
    version: "v2.4.1",
    kind: "patch",
    title: "Liquid glass polish",
    summary:
      "More controls, cards, and menus now match the liquid-glass system with cleaner motion and focus states.",
    highlights: [
      "Hourly forecast, tomorrow card, and home search adopt the shared glass material",
      "Interactive glass cards get smoother hover and press motion with reduced-motion support",
      "Menus, tooltips, focus rings, and standard basemap tone were cleaned up",
    ],
  },
  {
    version: "v2.4.0",
    kind: "feat",
    title: "Liquid glass redesign",
    summary:
      "ADSBao's floating surfaces were rebuilt around a two-material liquid-glass system.",
    highlights: [
      "Selected states use one shared glass capsule across cards, filters, settings, and toolbars",
      "Resting tiles and toolbar pills use a bright frosted material with luminous rims",
      "DESIGN.md and shared tokens now define the material system for future UI work",
    ],
  },
  {
    version: "v2.3.1",
    kind: "patch",
    title: "Hydration stability, list row polish & flight tracking resilience",
    summary:
      "Hydration, list-row feedback, and flight tracking fallbacks are more stable.",
    highlights: [
      "Skeleton loading and hydration gates reduce layout flicker",
      "Static-page list rows get unified hover feedback",
      "Flight tracking falls back to fresher nearby data and per-provider timeouts",
    ],
  },
  {
    version: "v2.3.0",
    kind: "feat",
    title: "Screen wake lock & status bar polish",
    summary:
      "The map toolbar can keep the screen awake, and the source status bar is easier to scan.",
    highlights: [
      "Wake lock toggle prevents screen sleep during spotting sessions",
      "Status bar shows keep-awake state inline with source badges",
      "Source text transitions are smoother and stay single-line",
    ],
  },
  {
    version: "v2.2.1",
    kind: "patch",
    title: "Standard map detail boost & GSAP animation layer",
    summary:
      "The standard base map now shows buildings, water bodies, parks, and roads with visible contrast — the dark theme no longer hides geography. GSAP powers entrance animations, card interactions, and staggered list reveals across the entire app.",
    highlights: [
      "Standard base layer renders buildings, water, landuse (parks/forests), and roads at visible grey tones on dark theme",
      "GSAP-driven page shell entrance, card hover/press spring interactions, and staggered list animations",
      "Bright OSM style replaces positron for light theme — 119 layers of geographic detail",
    ],
  },
  {
    version: "v2.2.0",
    kind: "feat",
    title: "Hourly forecast, locale fixes & near-me weather",
    summary:
      "Local weather gets a 6-hour forecast grid and next-day card. Simplified Chinese place names are consistently simplified. Near-me mode shows only weather. Desktop uses one-shot geolocation with a manual refresh.",
    highlights: [
      "Local weather: 3×2 hourly forecast grid with MetricCard-style tap interaction, plus a Tomorrow summary card",
      "Simplified Chinese: OSM semicolon-delimited name variants are stripped; trad→simp converter no longer corrupts already-simplified text",
      "Near-me mode: weather panel shows only the forecast (no METAR / rules / pressure / wiki); weather card is clickable",
      "Desktop near-me: one-shot geolocation instead of continuous watch, with a refresh button and last-fix timestamp",
      "Altitude prefix (FL) in preview cards now matches the unit typography so the row aligns cleanly",
    ],
  },
  {
    version: "v2.1.0",
    kind: "feat",
    title: "Near-me explorer + Plane Hunter polish",
    summary:
      "A new /here page mirrors the airport detail experience but centered on the user's location, with live position tracking. Plane Hunter gets a simpler native source picker and a tighter map template.",
    highlights: [
      "/here: live aircraft, nearby airports, and airspaces around your current position; auto-refreshes as you move",
      "Sidebar hero shows your actual city / state / country via reverse geocoding",
      "Plane Hunter capture simplified to a native camera / library picker; map template now ~1 NM radius",
      "Misc UI fixes — preview card slides in directionally, long aircraft types no longer overlap the callsign, route line only appears with FlightAware",
    ],
  },
  {
    version: "v2.0.0",
    kind: "breaking",
    title: "Plane Hunter mode goes GA",
    summary:
      "Plane Hunter ships as a two-step capture studio that bakes the chosen template into a shareable PNG. A new Maps template overlays an OSM tile of your location.",
    highlights: [
      "Two-step flow — shoot the photo, then compose with templates and share / save / copy",
      "Touch devices hand off to the OS camera or photo library",
      "New Maps template centers an OSM tile on your location with the aircraft when it's in view",
      "Feature flag removed — Plane Hunter is on for every signed-in user",
    ],
  },
  {
    version: "v1.13.1",
    kind: "patch",
    title: "Toolbar opacity polish",
    summary:
      "Floating toolbar pills sit on a more opaque surface so they stay legible against busy map backdrops on both themes.",
    highlights: [
      "Toolbar surface tightened across home dock, sidebar overlay, and map control rail",
    ],
  },
  {
    version: "v1.13.0",
    kind: "feat",
    title: "Bottom-floating mobile toolbar + device-aware settings",
    summary:
      "Mobile gets a single bottom-pinned toolbar across every page, and signed-in users keep separate desktop and mobile map preferences.",
    highlights: [
      "Mobile toolbar floats at the bottom center on every page",
      "Per-device map preferences for signed-in users",
      "High-altitude overflights no longer hidden by the approach-mask rule",
    ],
  },
  {
    version: "v1.12.0",
    kind: "feat",
    title: "Map readability + badge polish",
    summary:
      "Quieter terrain palette and a unified badge system with collision-aware stacking.",
    highlights: [
      "Calmer hillshade terrain in both themes",
      "Collision-aware airport / navaid badges with leader lines",
      "Click cycles through overlapping airspaces",
    ],
  },
  {
    version: "v1.11.1",
    kind: "patch",
    title: "Map UI polish",
    summary:
      "Tightens airspace readability, full-trace framing, mobile scrolling, and compact metric cards.",
    highlights: [
      "Inward airspace edge markings + cleaner full-trace boundary labels",
      "Mobile static pages keep panel-scoped scroll",
    ],
  },
  {
    version: "v1.11.0",
    kind: "feat",
    title: "Full-trace nav count badges",
    summary:
      "Long routes stay readable — dense low-zoom navaid labels collapse into cached count badges.",
    highlights: [
      "Aggregate navaid count tiles at low zoom",
      "Detailed labels return at the existing zoom threshold",
    ],
  },
  {
    version: "v1.10.0",
    kind: "feat",
    title: "Airport facilities + sidebar polish",
    summary:
      "OurAirports facility data joins OpenAIP for better ATC frequency and nearby navaid coverage.",
    highlights: [
      "Restored ATC frequency + navaid coverage via OurAirports",
      "Dedicated ATC and spotting panels in the airport sidebar",
    ],
  },
  {
    version: "v1.9.0",
    kind: "feat",
    title: "Watcher Mode candidate photo spots",
    summary:
      "Watcher Mode generates and renders runway-aligned candidate plane-watching spots for the focused airport.",
    highlights: [
      "Candidate spots from runway alignment + OpenStreetMap data",
      "Clickable camera markers + previews with OSM attribution",
    ],
  },
  {
    version: "v1.8.4",
    kind: "patch",
    title: "Airport zoom declutter",
    summary:
      "Airport map zoom levels share one feature configuration for labels, range rings, and surface-traffic suppression.",
    highlights: ["Unified zoom-level feature config"],
  },
  {
    version: "v1.8.3",
    kind: "patch",
    title: "Mechanism + navigation polish",
    summary:
      "Mechanism returns to the same dithered shell as Home / About; top nav preserves the active locale.",
    highlights: [
      "Mechanism page back on the Home/About background",
      "Locale survives Home / About / Mechanism / Changelog navigation",
    ],
  },
  {
    version: "v1.8.1",
    kind: "patch",
    title: "Aircraft type labels + airspace entry polish",
    summary:
      "Previews and filters prefer friendly aircraft names; the default airspace layer fades in on first load.",
    highlights: [
      "Friendly aircraft names; ICAO codes demoted to secondary",
      "Airspace overlays stagger-fade in",
    ],
  },
  {
    version: "v1.8.0",
    kind: "feat",
    title: "Airport airspace overlays",
    summary:
      "Airport maps render OpenAIP airspaces directly with translucent fills, labeled boundaries, clickable previews, and persisted layer toggles.",
    highlights: [
      "OpenAIP-style airspaces on airport maps with click-to-preview",
      "Map layer toggles persist in the browser",
    ],
  },
  {
    version: "v1.7.0",
    kind: "feat",
    title: "OpenAIP directory migration",
    summary:
      "Airport search and detail context now use OpenAIP as the primary aviation directory.",
    highlights: [
      "Search, details, frequencies, navaids, airspaces moved to OpenAIP",
      "Postgres-backed runway threshold geometry retained for accurate overlays",
    ],
  },
  {
    version: "v1.6.0",
    kind: "feat",
    title: "Virtualized nearby list + TanStack Query",
    summary:
      "Sidebar nearby list windows through a virtualizer with animated digit metrics; TanStack Query starts handling client-side data fetching.",
    highlights: [
      "Windowed nearby list (aircraft + airports) with NumberFlow digits",
      "Page-level z-index unified into named tier tokens",
      "TanStack Query mounted in the app shell",
    ],
  },
  {
    version: "v1.5.0",
    kind: "feat",
    title: "Tracking stability + map label optimization",
    summary:
      "Flight tracking separates live, fallback, stale, and missing position states. Route overlays and map labels stay clearer.",
    highlights: [
      "Explicit position states for tracked flights",
      "Predicted route arcs render as dashed lines",
      "Map place labels follow the selected app language",
    ],
  },
  {
    version: "v1.4.0",
    kind: "feat",
    title: "Account sign-in + cleaner lost-signal",
    summary:
      "Sign in from the map toolbar or nav menu. The lost-signal modal now retries silently in the background.",
    highlights: [
      "Account sign-in via the toolbar avatar",
      "Silent background retry once the feed is back",
    ],
  },
  {
    version: "v1.3.0",
    kind: "feat",
    title: "adsbdb routes + community feedback + complete runway map",
    summary:
      "Route lookups move to api.adsbdb.com, users can submit temporary route corrections, and the runway map now renders every runway from OpenAIP.",
    highlights: [
      "Route data source switched to api.adsbdb.com",
      "12 h community route overrides marked with `*`",
      "Complete OpenAIP-sourced runway map (incl. VFR-only runways)",
    ],
  },
  {
    version: "v1.2.1",
    kind: "patch",
    title: "Track button opens in a new tab",
    summary:
      "Preview-card Track action is now a real link so right-click → Open in New Tab works.",
    highlights: ["Track switched to <Link>"],
  },
  {
    version: "v1.2.0",
    kind: "feat",
    title: "Themed approach + nose beam + scale bar polish",
    summary:
      "Theme-aware runway approach visualization, dark-theme aircraft nose beam, always-on scale bar, and themed toasts.",
    highlights: [
      "Approach: dark = glowing wedge, light = dashed extended centerline",
      "Always-on scale bar with theme-aware backdrop",
    ],
  },
  {
    version: "v1.1.0",
    kind: "feat",
    title: "Distance rings + scale bar",
    summary:
      "Concentric distance rings on the airport page and an adaptive scale bar at approach zoom; nearby searches unified to a 40 NM radius.",
    highlights: [
      "Airport page: rings every 3 NM out to 30 NM",
      "Scale bar in the bottom-left at approach zoom",
    ],
  },
  {
    version: "v1.0.0",
    kind: "feat",
    title: "Persistent tracking + nav menu",
    summary:
      "Trace persists across refresh, a lost-signal overlay handles drops, and there's a new /changelog page.",
    highlights: [
      "12 h tracking session anchor + 24 h local trace cache",
      "Lost-signal overlay with keep / retry / back-home",
      "New /changelog page",
    ],
  },
  {
    version: "v0.12.0",
    kind: "feat",
    title: "Aircraft tracking page + polymorphic explorer",
    summary:
      "/aircraft/[callsign] route with a polymorphic sidebar + preview, fit-to-trace, and multi-provider failover.",
    highlights: [
      "/aircraft/[callsign] mirrors the airport layout",
      "Polymorphic preview card (aircraft + airport)",
      "Route renamed /[icao] → /airport/[icao]",
    ],
  },
  {
    version: "v0.11.0",
    kind: "feat",
    title: "Selected-aircraft trace + revalidation",
    summary:
      "Focused-aircraft live trace polyline, route revalidation via AeroDataBox, and ADS-B provider failover.",
    highlights: [
      "Gradient trace polyline with fade-in label cards",
      "ADS-B failover on 5xx / 429 / timeout",
    ],
  },
  {
    version: "v0.10.0",
    kind: "feat",
    title: "Global airport data + richer silhouettes",
    summary:
      "OpenAIP-backed global airport search, 178 ICAO-type silhouettes, and country flags on the home rows and airport headers.",
    highlights: [
      "OpenAIP backs /api/search and /api/airport/[ident]",
      "178 aircraft silhouettes ship in-repo",
    ],
  },
  {
    version: "v0.9.0",
    kind: "feat",
    title: "Navy tracking console redesign",
    summary:
      "Sidebar + map layout, callsign-first traffic table, deep navy palette, and aircraft silhouette markers.",
    highlights: [
      "400 px desktop sidebar alongside a full-height map",
      "Aircraft silhouette markers driven by ICAO type",
    ],
  },
  {
    version: "v0.8.0",
    kind: "feat",
    title: "Next.js Vercel refactor",
    summary:
      "Rebuilt the app from Vue 3 / Vite to React on the Next.js App Router.",
    highlights: [
      "React on the Next.js App Router",
      "Vercel Analytics + Speed Insights via Next integrations",
    ],
  },
  {
    version: "v0.7.1",
    kind: "patch",
    title: "Map and mobile polish",
    summary:
      "Polling guards, mobile sheet refinements, and ADS-B merge fixes.",
    highlights: ["Start aircraft polling only after coordinates load"],
  },
  {
    version: "v0.7.0",
    kind: "feat",
    title: "Flight route + traffic context",
    summary:
      "Airport-aware route labels, route lookup, and dual-range ADS-B polling.",
    highlights: [
      "Airport-aware flight route labels",
      "Dual-range polling (wide 20 NM + close 3 NM)",
    ],
  },
  {
    version: "v0.6.0",
    kind: "feat",
    title: "Vercel observability + production routing",
    summary:
      "Web Analytics, Speed Insights, and hardened proxy + upstream logging.",
    highlights: [
      "Web Analytics + Speed Insights",
      "Hardened proxy parsing against upstream HTML / errors",
    ],
  },
  {
    version: "v0.5.0",
    kind: "feat",
    title: "Vercel-first web architecture",
    summary:
      "Vercel deploy config, same-origin proxies, Electron + Homebrew dropped.",
    highlights: [
      "Same-origin proxies for METAR + ADS-B upstreams",
      "Removed Electron and Homebrew cask pipelines",
    ],
  },
  {
    version: "v0.4.0",
    kind: "breaking",
    title: "ADSBao web pivot",
    summary:
      "Renamed to ADSBao and repositioned as an airport explorer; dropped LiveATC UI, player, and transcription scope.",
    highlights: [
      "Project renamed to ADSBao",
      "Removed legacy LiveATC frontend + backend",
    ],
  },
];
