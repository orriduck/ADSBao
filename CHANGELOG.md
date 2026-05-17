# Changelog


## v0.12.0 — Aircraft tracking page, airport-prefixed routes, polymorphic sidebar/preview

### Added
- `/aircraft/[callsign]` route renders the same layout as the airport detail page: same sidebar shell, same nav row, same map controls, same aircraft list. The page centers the map on the focal aircraft, fetches its trace, and follows it as it moves. The focal aircraft renders as a silhouette + callsign on the map regardless of speed/altitude (no slow-traffic dot collapse).
- Adaptive ADS-B callsign provider chain: `/api/proxy/aircraft/callsign/[callsign]` races `adsb.lol` + `airplanes.live`, with race-then-stick failover.
- Hover/click on a sidebar row pops a unified preview card. The card is polymorphic — it renders an aircraft variant (callsign hero, photo, telemetry, Track → `/aircraft/[callsign]`) or an airport variant (`IATA · ICAO` hero, flag + place, distance + elevation, Track → `/airport/[icao]`). Clicking an airport marker on the map opens the same preview.
- Airport markers on the map are now clickable on both pages, sharing the same selection state as aircraft.
- Sidebar list is now polymorphic: aircraft entries appear first (with identity-flipping animations), nearby airports follow. The "Show" filter (All / Aircraft / Airports) gates which entity types render. Column rhythm switched to `Name / Route · Dist · Alt`.
- Map control bar gains a "Fit to trace" button that zooms the map to the bounds of the currently-rendered trace and stops auto-following the focal until the user clicks back to a preset zoom.
- Secondary trace (clicked aircraft that isn't the focal) renders at 40% opacity so the URL-tracked focal stays visually dominant. Trace points cache by `(mode, hex)` so flipping between aircraft doesn't re-pay the recent-trace fetch.
- Flight detail telemetry strip renders GS / ALT / V/S / HEADING / ICAO24 / STATUS as the same stat-card style the airport sidebar uses for WEATHER / FLIGHTS; cards are individually selectable (radio-group style).
- Map-label tiles default to ON on the flight detail page so place names give the moving map useful context.

### Changed
- **Route rename**: airport detail page moved from `/[icao]` to `/airport/[icao]`. The flight detail page is `/aircraft/[callsign]`. Old `/KBOS`-style URLs are not preserved (no automatic redirects).
- Selection-mode mask (when an aircraft or airport is "selected") is lighter than before — non-selected aircraft go from 28% opacity to 55%, and the base map tile dim drops from 0.72/0.78 to 0.88/0.92 so context stays readable.
- Theme detection moved from a client-side boot script to a server-rendered `data-theme` attribute driven by a `theme` cookie. The cookie is set in lockstep with `localStorage` by `useThemePreference`, and the cookie value is read server-side via `next/headers#cookies()` on every render. Eliminates the React 19 "script inside React component" console warning and any flash of unstyled content for users with an explicit preference.

### Refactored
- Extracted shared explorer primitives:
  - `SidebarShell` — outer panel + sticky nav row, used by both `AirportSidebar` and `FlightSidebar`.
  - `SidebarIdentityHero` — label + mono-extrabold code + horizontal rule pattern.
  - `SidebarMetric` (`SidebarMetricGrid` + `SidebarMetricCard`) — two-column stat-card grid, used by both the airport tab strip and the flight telemetry grid.
  - `ExplorerUiContext` / `ExplorerUiProvider` / `useExplorerUi` — moved from `components/airport/explorer/` to `components/explorer/` since both pages consume it. Renamed exports to drop the misleading "airport" prefix.
  - `ExplorerMapMenu` — same move + rename for the sidebar toggle + map control bar wrapper.
- `AirportMap` accepts arbitrary `children` rendered inside `MapContext.Provider`, so per-page concerns (e.g. `MapFitToTraceController` on the flight page) can be composed without touching the map shell.
- `SelectedAircraftTraceContext` now exposes a deduplicated `traces[]` array; `SelectedAircraftTrace` was split into a thin context-reader + a `SingleAircraftTrace` renderer that takes trace data as props, allowing N coexistent traces with independent animation state.
- Aircraft + airport preview cards share the same outer `AircraftPreviewCard` shell — the inner `AircraftPreviewMetadataCard` / `AirportPreviewMetadataCard` swap based on which entity is selected.

### Fixed
- `MapFitToTraceController`'s `leaflet` import crashed SSR with `window is not defined`; the component is now dynamic-imported with `ssr: false`.
- `getVisibleAircraft` was silently filtering out the focal aircraft on the flight page (the focal sits at "the airport's ground area" because the map's airport-center IS the focal). The ground filter is now skipped when there's no actual airport in focus.
- Sidebar list rows were collapsing to zero horizontal padding inside the flight sidebar because `--airport-sidebar-inset` was only declared on `.airport-sidebar-panel`. The token now lives on `.sidebar-shell` so both pages get it.
- React 19 "Encountered a script tag while rendering React component" console warning eliminated (see Changed — cookie-driven theme).
- Stat cards' big numbers were selectable on text-click, which the focus highlight made look like a click-state. Cards now have `user-select: none` and `cursor: default` by default; the interactive variant overrides.


## v0.11.0 — Selected-aircraft trace, focused revalidation, route consistency

### Added
- Selected-aircraft trace renders the last few minutes of the focused plane's path as a Leaflet polyline with an SVG `linearGradient` core (tail 20% → head 95% opacity) and timestamped fade-in label cards. Trail and labels share a `SelectedAircraftTraceProvider` so the focused-flight state lives outside the marker map and survives the periodic ADS-B refresh without tearing down or re-flashing.
- When the focused aircraft is classified as `DEPARTURE` or `ARRIVAL`, the trail and label accents pick up the same color the marker uses — orange for departures, teal/blue for arrivals — instead of the neutral theme accent.
- Clicking an already-focused aircraft marker now triggers an AeroDataBox revalidation of its route (`?force=aerodatabox` on the callsign proxy, `Cache-Control: no-store`) so the user can refresh stale or unresolved routes on demand. The revalidate path only overwrites the route cache when AeroDataBox returns a route with both origin and destination, so a partial response can't clobber a complete VRS entry already in cache.

### Changed
- `enrichAircraftWithRoutes` now ties `movement` to a renderable `flightRouteLabel`: if the route is missing either endpoint (and therefore has no label to render), the aircraft is classified `UNKNOWN` instead of being colored `DEPARTURE`/`ARRIVAL` with an empty sidebar row. This was the source of ENY3573 / GJS4391 showing as orange "departing" markers with no route text.
- Map overlays removed: the top-left ICAO + coordinate label and the right-edge DEP/UNKN/ARR traffic legend are gone. Both were holdovers from the earlier console design that the current marker color encoding already communicates.
- Trail label cards hug their content (`width: max-content`) instead of inheriting the Leaflet `divIcon` 56-px box, and the latest marker stacks on top via `zIndexOffset`. Label re-renders use a stable signature so unchanged labels stay mounted across the 3-second poll instead of fading in every cycle.

### Fixed
- ADS-B provider failover: the proxy now retries against `airplanes.live` whenever `adsb.lol` returns 5xx, 429, or times out, with a per-process cool-down so we don't hammer a degraded provider. The audit log records the exact provider attempted per outgoing request.
- Trail and labels no longer briefly flash a previous aircraft's path when switching focus: `committedTracePoints` resets atomically on `aircraftHex` change and the live-position append is gated on `!loading` so the first frame can't ship a half-resolved geometry.

## v0.10.0 — Global airport data layer + richer silhouettes

### Added
- OurAirports as the global airport static-data source, persisted in Supabase via a four-table schema (`airports`, `runways`, `airport_frequencies`, `navaids`) with anon-read / service-role-write RLS. Refresh via `node --env-file=.env scripts/import-ourairports.js`.
- `GET /api/search` and `GET /api/airport/[ident]` — thin Next.js routes over a clean repository → service → API layering. Search supports ICAO / IATA / name / city / keywords with relevance ranking (exact code → prefix → substring) and ordering that prefers commercial-service airports for substring matches.
- Runway annotation overlay now works globally: for non-US airports the airport map falls back to OurAirports runway thresholds (centerlines, end labels, approach beams) when FAA CIFP has no coverage.
- Aircraft silhouettes switched to `RexKramer1/AircraftShapesSVG` (GPL-3.0, see `public/icons/aircraft/ATTRIBUTION.md`) — 178 SVGs covering specific ICAO type designators (A320, B738, B77W, CRJ9, BCS3, …) shipping in-repo. ADS-B emitter category fallback (A1–A7) maps to representative silhouettes for type-less traffic.
- Featured airports on the home page diversified to a 10-airport global mix (JFK, LAX, ORD, ATL, LHR, CDG, HND, HKG, DXB, YYZ).
- Country flag + full country name on the home row and airport-page header (via regional-indicator codepoints and `Intl.DisplayNames`, zero deps).

### Changed
- Browser-side `airportDirectoryClient` is now a thin wrapper over `/api/search` and `/api/airport/[ident]` — same public surface, the data source moved to Supabase.
- Home page search no longer restricts results to the US.
- Aircraft icon route serves SVGs from `public/icons/aircraft/` on disk with an inline arrow as the final fallback; no runtime dependency on any external icon CDN.

### Removed
- `airportsapi.com` integration and its legacy airport-directory client package.
- The `pnpm build:procedures`, `pnpm import:ourairports`, and `pnpm icons:aircraft` script shortcuts. `scripts/import-ourairports.js` stays (runs via `node --env-file=.env scripts/import-ourairports.js` as the OurAirports backfill); `scripts/build-faa-cifp-procedures.js` and `scripts/download-aircraft-icons.js` deleted entirely since neither output is consumed at runtime.

## v0.9.0 — Navy tracking console redesign

### Added
- Persistent top navigation bar with ADSBao branding, Airports Search, and About links.
- Desktop sidebar layout (400px) for airport context alongside full-height Leaflet map.
- Callsign-first traffic data table with route status badges (PENDING/LOCAL/ROUTE).
- Navy tracking console dark theme palette (#041A38, #244164, #0A2244).
- Aircraft type silhouette markers on the map: ICAO type designators (A320, B738, CRJ9…) and ADS-B emitter categories (A1–A7, B1–B4) resolve to the upstream ADS-B Radar icon set, served same-origin via `/api/icons/aircraft/[name]` with day-long edge caching. Direction-state color encoding is preserved via CSS mask tinting; the arrow / dot fallback still applies for unknown types and slow traffic.
- Marker wake-class scaling: ADS-B emitter A-category drives a uniform size nudge (A1 light → 0.90×, A2 → 0.95×, A3 → 1.00×, A4 → 1.05×, A5 heavy → 1.10×) on both the silhouette and the vector-arrow fallback, so heavies read visibly larger than light traffic without changing the grid.
- About page now credits ADS-B Radar (https://adsb-radar.com) for the aircraft icon set.

### Changed
- Redesigned airport operations screen from full-bleed map overlay to sidebar + map layout.
- Updated TrafficPanel from summary cards to rich data table with altitude, ground speed, position, and route columns.
- Darkened the dark theme with deep navy tones and FlightAware-inspired console aesthetic.
- Dark theme accent orange shifted from #FF5A1F to #FF6B35 for better contrast.

### Fixed
- TrafficPanel now receives aircraftWithRoutes (with resolved movement and route labels) instead of raw aircraft data.
- Consolidated theme toggle into the global NavBar, removing duplicate from SearchScreen.

ADSBao uses product releases for user-visible milestones. Vercel deployments happen on every push to `main`, but a deployment is not automatically a product release.

## v0.8.0 — Next.js Vercel refactor

### Changed
- Rebuilt the web app from Vue 3/Vite to React on Next.js App Router.
- Kept Tailwind CSS v4 and DaisyUI as the styling foundation.
- Switched Vercel Analytics and Speed Insights to their Next.js integrations.
- Replaced VueBits-derived UI code with React component equivalents.

### Moved
- Moved the FlightAware route lookup from a root Vercel function to a Next.js Route Handler under `src/app/api`.
- Moved Vue composables to React hooks while preserving the existing data clients and pure utility tests.

## v0.7.1 — Map and mobile polish

### Fixed
- Start aircraft polling only after airport coordinates are available.
- Refine the mobile airport card sheet.
- Improve close-range and wide-range ADS-B merge behavior.

## v0.7.0 — Flight route and traffic context

### Added
- Airport-aware flight route labels.
- FlightAware-backed route lookup through a Vercel serverless function.
- Dual-range ADS-B polling with wide 20 NM context and close 3 NM airport vicinity.
- Airport context overlays and ground filtering.

### Changed
- Replaced the older adsbdb route path with a Vercel-hosted FlightAware route lookup.
- Removed the static route database and OpenFlights preprocessing.

## v0.6.0 — Vercel observability and production routing

### Added
- Vercel Web Analytics.
- Vercel Speed Insights.
- Runtime logging coverage for upstream data requests.

### Fixed
- Restored production-safe Vercel proxy rewrites.
- Hardened proxy response parsing so upstream HTML/error responses do not break unrelated polling.

## v0.5.0 — Vercel-first web architecture

### Added
- Vercel deployment configuration.
- Browser-first airport directory lookup with client caching.
- Same-origin proxy paths for browser-blocked METAR and ADS-B upstreams.

### Changed
- Flattened the frontend app into the repository root.
- Moved shared constants, airport helpers, math helpers, and fallback airport metadata into reusable modules.
- Removed redundant CI once Vercel became the deployment gate.

### Removed
- Electron desktop packaging.
- Homebrew cask release pipeline.
- One-time migration docs and stale desktop build scripts.

## v0.4.0 — ADSBao web pivot

### Breaking
- Renamed the project to ADSBao.
- Removed the legacy LiveATC frontend UI.
- Removed the LiveATC player, feed selector, and transcription presentation from the product scope.
- Removed legacy backend dependencies.

### Changed
- Repositioned the app as an airport explorer focused on airport lookup, weather context, and nearby traffic visualization.

## v0.3.x and earlier — Legacy LiveATC Caption desktop app

Archived release line for the previous desktop app distributed through Electron and Homebrew cask.
These releases are retained for historical reference only and do not represent the current ADSBao web app.
