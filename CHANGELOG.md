# Changelog


## v0.10.0 — Global airport data layer + richer silhouettes

### Added
- OurAirports as the global airport static-data source, persisted in Supabase via a four-table schema (`airports`, `runways`, `airport_frequencies`, `navaids`) with anon-read / service-role-write RLS. Refresh via `node --env-file=.env scripts/import-ourairports.js`; see `docs/ourairports-setup.md`.
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
- `airportsapi.com` integration (the entire `src/services/airport-directory/` package).
- The `pnpm build:procedures`, `pnpm import:ourairports`, and `pnpm icons:aircraft` script shortcuts — the underlying scripts (when needed) still run via `node --env-file=.env scripts/<name>`. Keeps `package.json` to the daily workflow.

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
