# ADSBao Architecture

ADSBao is a Vercel-first web app for airport lookup, weather context, nearby aircraft visualization, and airport-aware route labels.

## Frontend stack

- React on Next.js App Router.
- Tailwind CSS v4 with DaisyUI.
- Vercel Web Analytics and Speed Insights through the Next.js integrations.
- Sentry Next.js SDK for error monitoring, tracing, privacy-masked Session Replay, and production source-map upload.
- React component equivalents for the previous VueBits-style UI effects.

## Current product scope

- Search-first airport lookup.
- METAR weather context.
- ADS-B nearby traffic visualization.
- Callsign route labels when route data can be resolved.
- Vercel web deployment.

Legacy desktop distribution, Electron packaging, Homebrew cask publishing, the previous local backend runtime, and previous transcription-oriented UI are not part of the current ADSBao web scope.

## Runtime topology

### Airport directory (OpenAIP → Next.js API)

Global airport context is sourced from [OpenAIP](https://www.openaip.net/) through server-only route handlers. `/api/search` resolves ranked airport matches, and `/api/airport/[ident]` returns airport detail, runways, frequencies, nearby airports, navaids, airspaces, reporting points, and obstacles. OpenAIP Core runway records do not include threshold coordinates, so runway map overlays are backed by a narrow `public.runway_geometries` table imported from OurAirports runway data. The browser-side `airportDirectoryClient` is a thin wrapper over these routes — feature code does not see the provider boundary or the server-only OpenAIP API key.

### Vercel data paths

The app uses same-origin Vercel paths for upstream aviation sources that are not directly browser-friendly.

| Path | Upstream | Purpose |
|---|---|---|
| `/api/proxy/metar/:icao` | AviationWeather METAR API | Airport weather context |
| `/api/proxy/aircraft/positions/:lat/:lon/:dist` | adsb.lol | Nearby aircraft positions |
| `/api/proxy/flight-routes/callsign/:callsign` | VRS standing-data route fetcher | Callsign route lookup |
| `/api/proxy/local-weather/:lat/:lon` | Open-Meteo | Airport-local weather |
| `/api/proxy/airports/nearby` | OpenAIP Core API | Nearby airport overlays |

These paths are implemented as Next.js Route Handlers under `src/app/api/proxy/**`. The handlers keep upstream access same-origin, validate route and query parameters, apply lightweight per-IP rate limits, reject disallowed browser origins, and cap upstream response body sizes before parsing.

### Feature/API boundary convention

API routes under `src/app/api/**/route.ts` are HTTP adapters. They parse request parameters, enforce proxy/security policy, call a domain mechanism, and translate the mechanism result into `Response` or `NextResponse`.

Functionality-level domain code lives under `src/features/<domain>/` as plain `.ts` modules:

- `<domain>.mechanism.ts` owns source selection, fallback order, cache policy, request parameterization, and provider orchestration.
- `<domain>.models.ts` owns domain constants, result metadata, and mechanism-specific error types.
- `<domain>.utils.ts` owns pure normalization and predicate helpers.
- Prefix families are grouped by product concept, e.g. `src/features/aircraft/*`, `src/features/airport/*`, `src/features/aviation/flight-routes`, and `src/features/weather/metar`.

JSX components live under `src/components/**`, grouped by screen or product domain. Components may import feature modules, but feature modules should not import JSX components.

Persistence boundaries live under `src/app/api/dao/*.dao.ts`. DAO files should contain Supabase/SQL reads and writes only; they should not choose providers, cache policy, fallback behavior, or import mechanism files.

There is no separate `src/services` layer. Shared provider clients, normalizers, mechanisms, models, and utils live with their owning feature domain.

The OpenAIP migration prepares `public.openaip_airports` and `public.openaip_cache` as OpenAIP-shaped persistence boundaries. Legacy airport directory tables and nearby airport caches are intentionally dropped by the migration; runtime code no longer reads OurAirports as an airport directory or FAA CIFP data. OurAirports is retained only as runway threshold geometry via `public.runway_geometries`.

### Watcher Mode candidate watching spots

Watcher Mode uses static candidate data, not live browser-side Overpass calls.
Regenerate the first airport set with:

```bash
pnpm generate:watching-spots
```

The generator reads runway endpoint geometry from the existing runway geometry
source when available, falls back to OurAirports runway CSV geometry, builds
runway-extension corridors, queries Overpass via POST for a coarse bbox, and
then filters and scores candidate objects locally. Output is served from
`public/data/spotting-spots/` as JSON, currently `KBOS.json` and `JFK.json`.
Each candidate is map-derived only and must retain the conservative disclaimer
and `© OpenStreetMap contributors` attribution.

### Vercel security posture

Vercel's platform DDoS mitigation remains enabled automatically for the deployment. The repository does not depend on paid Vercel WAF rate limiting for normal operation; proxy throttling lives in application code so the default deployment path does not require a new paid feature.

Security headers are configured in `next.config.ts` for all routes. Production branch protection and required review settings are still repository or Vercel dashboard controls rather than application code.

Sentry browser transport uses the same-origin `/monitoring` tunnel from `withSentryConfig`, which avoids adding Sentry ingest domains to `connect-src`. Source-map upload is build-time only and requires `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` in Vercel or local build env. Runtime capture stays disabled when no DSN is configured.

## Local development

```bash
pnpm install
pnpm run dev
```

All proxy paths run through the same Route Handlers during local development and production.

## Release line

The current ADSBao web line starts at `v0.4.0`.

| Version | Meaning |
|---|---|
| `v0.4.0` | Breaking ADSBao web pivot |
| `v0.5.0` | Vercel-first web architecture |
| `v0.6.0` | Vercel observability and production routing |
| `v0.7.0` | Flight route and traffic context |
| `v0.7.1` | Map and mobile polish |
| `v0.8.0` | Next.js Vercel refactor |
| `v0.9.0` | Navy tracking console redesign |
| `v0.10.0` | Global airport data layer and richer aircraft silhouettes |
| `v0.11.0` | Selected-aircraft trace + multi-provider failover + AeroDataBox revalidation |
| `v0.12.0` | Aircraft tracking page + airport-prefixed routes + polymorphic sidebar/preview |

`v0.3.x` and earlier are legacy desktop-app history and should not be used as the current ADSBao web product line.
