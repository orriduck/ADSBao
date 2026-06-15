# ADSBao Architecture

ADSBao is a Railway single-service web app for airport lookup, weather context,
nearby aircraft visualization, selected-flight tracking, and airport-aware route
labels.

## Frontend Stack

- React with Vite and React Router.
- Tailwind CSS v4.
- Leaflet plus MapLibre-backed tiles and custom aircraft/runway layers.
- Clerk React for browser identity when `VITE_CLERK_PUBLISHABLE_KEY` is set.

## Runtime Topology

The root `Dockerfile` builds the Vite frontend, compiles
`services/data-service`, copies `dist/` into the final image, and starts the Go
binary. The Go service owns:

- Static SPA serving and deep-link fallback.
- `/runtime-env.js` browser-visible public env generated from Railway runtime
  variables.
- `/api/**` same-origin routes.
- `/ws` realtime WebSocket traffic.
- `/health` and `/debug/channels`.
- New Relic APM, custom metrics/events, Metric API, and Log API telemetry when
  `NEW_RELIC_LICENSE_KEY` is configured.

Production browser traffic should stay same-origin. `VITE_ADSBAO_REALTIME_URL`
is only an override for split local development or temporary external testing.
Browser-visible env such as `VITE_CLERK_PUBLISHABLE_KEY` is served by
`/runtime-env.js` at runtime so Docker builds do not need access to public
Railway variables.

## API Boundaries

Go handles browser-facing API routes under `services/data-service/internal/api`.
The Vite app still keeps domain mechanisms and models under `src/features/**`
for normalization, display state, and client-side fallback behavior.

Current same-origin API groups:

| Path | Owner | Purpose |
|---|---|---|
| `/api/search` | Go/OpenAIP | Airport search |
| `/api/airport/{ident}` | Go/OpenAIP | Airport detail and nearby context |
| `/api/proxy/metar/{icao}` | Go/AviationWeather | METAR weather context |
| `/api/proxy/local-weather/{lat}/{lon}` | Go/Open-Meteo | Local weather context |
| `/api/proxy/aircraft/positions/{lat}/{lon}/{dist}` | Go/ADS-B providers | Nearby aircraft JSON |
| `/api/proxy/aircraft/callsign/{callsign}` | Go/ADS-B providers | Tracked aircraft fallback JSON |
| `/api/proxy/aircraft/trace/{hex}` | Go/adsb.lol | Recent/full trace JSON |
| `/api/proxy/aircraft/photos/{hex}` | Go/Planespotters | Aircraft photo metadata and image proxy |
| `/api/proxy/flight-routes/callsign/{callsign}` | Go/adsbdb | Callsign route labels |
| `/api/proxy/reverse-geocode` | Go/Nominatim | Near-me location labels |
| `/api/proxy/map-style/{theme}` | Go/OpenFreeMap | MapLibre style JSON |
| `/api/feature-flags` | Go config | Public feature flag snapshot |
| `/api/realtime/auth` | Go | Short-lived provider grants |

User-authenticated persistence is intentionally not coupled to the Vite client.
Until a Go-side Clerk server integration is added, unauthenticated map-settings
reads return no saved settings, writes return `401`, and route feedback returns
`503` instead of silently depending on a removed server runtime.

## Realtime Data Service

High-frequency aircraft positions, tracked-aircraft updates, traffic around a
current map center, and callsign route labels are served through the Go
WebSocket backend under `services/data-service`. It shares one polling loop per
active channel, applies provider fallback/backoff centrally, and emits structured
New Relic telemetry for external provider calls, scheduler activity, WebSocket
messages, and active channel gauges.

Realtime channel keys encode the polling target:

| Product anchor | Traffic channel | Route channel |
|---|---|---|
| Airport page | `traffic:center:{lat}:{lon}:{distNm}` | `route:{callsign}:airport:{icao}` |
| Here / user location | `traffic:center:{lat}:{lon}:{distNm}` | `route:{callsign}:center:{lat}:{lon}` |
| Tracking page | `traffic:center:{aircraftLat}:{aircraftLon}:{distNm}` | `route:{callsign}:center:{aircraftLat}:{aircraftLon}` |

FlightAware-backed realtime modes require a signed provider grant from
`/api/realtime/auth`. The WebSocket handler verifies the HMAC grant with
`ADSBAO_REALTIME_AUTH_SECRET`, strips the token before params reach the
scheduler, and rejects unauthorized FlightAware subscriptions while keeping
public traffic subscriptions available.

## Persistence

Railway Postgres remains the app-owned persistence boundary for OurAirports
augmentation data, route feedback, feature flags, and user map settings.
Browser code never receives database URLs. TypeScript DAO modules live under
`src/server/dao/**`; current browser-facing API work should not add new
Next-style route handlers.

## Local Development

```bash
pnpm install
pnpm run dev
```

For a single-service smoke:

```bash
pnpm run build
cd services/data-service
STATIC_DIR=/Users/ruyyi/Devs/ADSBao/dist PORT=8080 go run ./cmd/adsbao-data-service
```

Then check `/health`, a deep link such as `/airport/KBOS`, `/api/feature-flags`,
and `/ws`.

## Release Line

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

`v0.3.x` and earlier are legacy desktop-app history and should not be used as
the current ADSBao web product line.
