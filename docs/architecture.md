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

### Airport directory (OurAirports → Supabase → Next.js API)

Global airport static data (airports, runways, frequencies, navaids) is sourced from [OurAirports](https://ourairports.com/data/), persisted in Supabase via `node --env-file=.env scripts/import-ourairports.js`, and exposed to the browser through `/api/search` and `/api/airport/[ident]`. The browser-side `airportDirectoryClient` is a thin wrapper over these two routes — feature code does not see the database boundary.

### Vercel data paths

The app uses same-origin Vercel paths for upstream aviation sources that are not directly browser-friendly.

| Path | Upstream | Purpose |
|---|---|---|
| `/api/proxy/metar/:icao` | AviationWeather METAR API | Airport weather context |
| `/api/proxy/aircraft/positions/:lat/:lon/:dist` | adsb.lol | Nearby aircraft positions |
| `/api/proxy/flight-routes/callsign/:callsign` | VRS standing-data route fetcher | Callsign route lookup |
| `/api/proxy/local-weather/:lat/:lon` | Open-Meteo | Airport-local weather |
| `/api/proxy/procedures/:country/:icao` | FAA CIFP | US procedure and runway overlays |
| `/api/proxy/airports/nearby` | AIRAC | Nearby airport overlays |

These paths are implemented as Next.js Route Handlers under `src/app/api/proxy/**`. The handlers keep upstream access same-origin, validate route and query parameters, apply lightweight per-IP rate limits, reject disallowed browser origins, and cap upstream response body sizes before parsing.

### Feature/API boundary convention

API routes under `src/app/api/**/route.js` are HTTP adapters. They parse request parameters, enforce proxy/security policy, call a domain mechanism, and translate the mechanism result into `Response` or `NextResponse`.

Functionality-level domain code lives under `src/features/<domain>/` as plain `.js` modules:

- `<domain>.mechanism.js` owns source selection, fallback order, cache policy, request parameterization, and provider orchestration.
- `<domain>.models.js` owns domain constants, result metadata, and mechanism-specific error types.
- `<domain>.utils.js` owns pure normalization and predicate helpers.
- Prefix families are grouped by product concept, e.g. `src/features/aircraft/*`, `src/features/airport/*`, `src/features/aviation/flight-routes`, and `src/features/weather/metar`.

JSX components live under `src/components/**`, grouped by screen or product domain. Components may import feature modules, but feature modules should not import JSX components.

Persistence boundaries live under `src/app/api/dao/*.dao.js`. DAO files should contain Supabase/SQL reads and writes only; they should not choose providers, cache policy, fallback behavior, or import mechanism files.

There is no separate `src/services` layer. Shared provider clients, normalizers, mechanisms, models, and utils live with their owning feature domain.

The nearby-airport proxy can also use Supabase as a persistent response cache. When `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are configured in Vercel, `/api/proxy/airports/nearby` reads and writes `public.nearby_airport_cache` records with a 90-day `expires_at` TTL. The migration grants the `anon` role only the select/insert/update permissions needed for this public cache table, with RLS policies restricted to `nearby-airports:%` cache keys. Cache failures are non-fatal: the handler falls back to AIRAC and logs the Supabase read/write error server-side.

Airport search and detail go directly to the OurAirports tables (`public.airports`, `public.runways`, `public.airport_frequencies`, `public.navaids`). The legacy `public.airport_metadata_cache` table from the old airportsapi.com client has been dropped — no live reader remained after the OurAirports cutover.

### Vercel security posture

Vercel's platform DDoS mitigation remains enabled automatically for the deployment. The repository does not depend on paid Vercel WAF rate limiting for normal operation; proxy throttling lives in application code so the default deployment path does not require a new paid feature.

Security headers are configured in `next.config.mjs` for all routes. Production branch protection and required review settings are still repository or Vercel dashboard controls rather than application code.

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
| `v0.10.0` | Global airport data layer (OurAirports + Supabase) and richer aircraft silhouettes |
| `v0.11.0` | Selected-aircraft trace + multi-provider failover + AeroDataBox revalidation |
| `v0.12.0` | Aircraft tracking page + airport-prefixed routes + polymorphic sidebar/preview |

`v0.3.x` and earlier are legacy desktop-app history and should not be used as the current ADSBao web product line.
