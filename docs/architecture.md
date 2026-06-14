# ADSBao Architecture

ADSBao is a Vercel-first web app for airport lookup, weather context, nearby
aircraft visualization, and airport-aware route labels, with high-frequency
ADS-B and route polling offloaded to a Railway realtime backend.

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
- Vercel web deployment plus a Railway realtime data service.

Legacy desktop distribution, Electron packaging, Homebrew cask publishing, the previous local backend runtime, and previous transcription-oriented UI are not part of the current ADSBao web scope.

## Runtime topology

### Airport directory (OpenAIP → Next.js API)

Global airport context is sourced from [OpenAIP](https://www.openaip.net/) through server-only route handlers. `/api/search` resolves ranked airport matches, and `/api/airport/[ident]` returns airport detail, runways, frequencies, nearby airports, navaids, airspaces, reporting points, and obstacles. OpenAIP Core runway records do not include threshold coordinates, so runway map overlays are backed by a narrow `public.runway_geometries` table imported from OurAirports runway data. OurAirports `airport_frequencies` and `navaids` static tables also augment OpenAIP frequency/navaid coverage after normalization and conservative deduplication. The browser-side `airportDirectoryClient` is a thin wrapper over these routes — feature code does not see the provider boundary or the server-only OpenAIP API key.

### Realtime data service

High-frequency aircraft positions, tracked-aircraft updates, traffic around a
current map center, and callsign route labels are served first through the Go
WebSocket backend under `services/data-service`. It is deployed as a Railway
service, shares one polling loop per active channel, applies provider fallback
and backoff centrally, exposes `/health`, `/debug/channels`, and `/ws`, and
pushes New Relic APM transactions, custom external-request events, structured
logs, and low-cardinality business metrics.

Realtime channel keys encode the polling target instead of hiding it in
subscription params. This keeps shared loops correct when three product anchors
are active:

| Product anchor | Traffic channel | Route channel |
|---|---|---|
| Airport page | `traffic:center:{lat}:{lon}:{distNm}` | `route:{callsign}:airport:{icao}` |
| Here / user location | `traffic:center:{lat}:{lon}:{distNm}` | `route:{callsign}:center:{lat}:{lon}` |
| Tracking page | `traffic:center:{aircraftLat}:{aircraftLon}:{distNm}` | `route:{callsign}:center:{aircraftLat}:{aircraftLon}` |

The service rounds center coordinates before accepting a channel so many users
share the same loop instead of creating one-off subscriptions. `route:*` remains
separate from `traffic:*` because route lookup cadence and cache lifetime are
much slower than ADS-B positions, and because the route display context changes
with the current center for here/tracking flows.

FlightAware-backed realtime modes are privileged. The browser first asks
Vercel `/api/realtime/auth` for a short-lived provider grant after the normal
Clerk feature-flag check, then sends that grant with `flightAware` or
`routeProvider=flightaware` subscription params. The Go service verifies the
HMAC grant with `ADSBAO_REALTIME_AUTH_SECRET` before it starts any FlightAware
polling loop, and strips the token before params reach the scheduler.

The frontend discovers it through `NEXT_PUBLIC_ADSBAO_REALTIME_URL`. Realtime
surfaces do not start their own external-provider polling when the WebSocket is
unavailable; they keep the loading state and notify the user while the browser
client actively reconnects and resubscribes existing channels after a socket
close. Railway WebSocket connections are expected to reconnect periodically.

### Vercel data paths

The app uses same-origin Vercel paths for upstream aviation sources that are not directly browser-friendly.

| Path | Upstream | Purpose |
|---|---|---|
| `/api/proxy/metar/:icao` | AviationWeather METAR API | Airport weather context |
| `/api/proxy/aircraft/positions/:lat/:lon/:dist` | adsb.lol | Nearby aircraft one-off provider access |
| `/api/proxy/flight-routes/callsign/:callsign` | adsbdb and route feedback | Callsign route one-off provider access |
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

Persistence boundaries live under `src/app/api/dao/*.dao.ts`. DAO files should contain Postgres reads and writes only; they should not choose providers, cache policy, fallback behavior, or import mechanism files.

There is no separate `src/services` layer. Shared provider clients, normalizers, mechanisms, models, and utils live with their owning feature domain.

The Railway Postgres schema keeps ADSBao-owned persistence boundaries for OurAirports augmentation data, route feedback, feature flags, and user map settings. Runtime code no longer reads OurAirports as the primary airport directory or FAA CIFP data. OurAirports is retained for full airport names, runway threshold geometry, ATC frequencies, and navaid augmentation.

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
