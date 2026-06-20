# ADSBao Architecture

ADSBao is a Railway single-service web app for airport lookup, weather context,
nearby aircraft visualization, here-mode location context, selected target
tracking, and airport-aware route labels.

## Frontend Stack

- React with Vite and React Router.
- Tailwind CSS v4.
- Leaflet plus MapLibre-backed tiles and custom aircraft/runway layers.
- Clerk React for browser identity when `VITE_CLERK_PUBLISHABLE_KEY` is set.

## Runtime Topology

The root `Dockerfile` builds the Vite frontend, compiles
`services/data-service`, copies `dist/` into the final image, and starts the Go
binary. The Go service owns the public runtime boundary:

- Static SPA serving and deep-link fallback.
- `/runtime-env.js` browser-visible public env generated from Railway runtime
  variables.
- `/api/**` same-origin routes.
- `/ws` realtime WebSocket traffic.
- `/health` and `/debug/channels`.
- Better Stack custom metrics and structured backend logs when the
  `BETTERSTACK_*` source token and endpoint variables are configured.

Production browser traffic should stay same-origin. `VITE_ADSBAO_REALTIME_URL`
is only an override for split local development or temporary external testing.
Browser-visible env such as `VITE_CLERK_PUBLISHABLE_KEY` is served by
`/runtime-env.js` at runtime so Docker builds do not need access to public
Railway variables.

## WebSocket Realtime Spine

The browser opens one same-origin WebSocket to `/ws` and describes its current
view through channel subscriptions. Airport pages, here mode, and tracking pages
all use the same connection shape; only the anchor and radius change.

The backend keeps one polling path per active channel. When multiple clients
watch the same airport, center point, or callsign, they share the backend work
and receive normalized payloads with freshness metadata. Reconnects restore the
subscription list instead of forcing the page to rebuild map state.

| Product anchor | Traffic channel | Route channel |
|---|---|---|
| Airport page | `traffic:center:{lat}:{lon}:{distNm}` | `route:{callsign}:airport:{icao}` |
| Here / user location | `traffic:center:{lat}:{lon}:{distNm}` | `route:{callsign}:center:{lat}:{lon}` |
| Tracking page | `traffic:center:{aircraftLat}:{aircraftLon}:{distNm}` | `route:{callsign}:center:{aircraftLat}:{aircraftLon}` |

Realtime payloads keep a stable browser contract:

- `type` identifies the update family.
- `channel` identifies the subscription that produced the payload.
- `source`, `fetchedAt`, and `stale` describe data freshness.
- `data` holds the normalized aircraft, route, or context body.

## Parallel Data Pipelines

ADSBao treats map data as independent pipelines that meet in feature models
before React renders:

- Position updates keep aircraft markers and nearby rows fresh.
- Route labels resolve by callsign and are merged onto visible aircraft when
  available.
- Weather and local context load separately from aircraft traffic.
- Airport overlays use their own geometry and labeling models.
- User settings and location state update view models without changing backend
  polling contracts.

This separation lets a slow route, weather, or overlay response stay localized.
The map can continue rendering fresh aircraft positions while the rest of the
context catches up. Model code batches dense updates before they reach React so
sidebar rows and map markers do not rerender for unrelated state changes.

## Tracking and Here Mode

Aircraft tracking and airport tracking both start by choosing a focal anchor.
Nearby traffic, route labels, trace geometry, and sidebar rows are then derived
from that anchor. A sidebar reorder should not move the map; only target changes,
trace extent changes, or explicit user actions should refit the viewport.

Here mode owns its location and compass permission flow directly: entering the
view requests both for the device-centered map and does not read or save the
map-setting location layer. Airport and flight detail pages use the hydrated map
setting first. When that layer is enabled, they request location and compass and
update the visible marker from device coordinates and heading; when it is off,
they do not show or request the marker until the user enables it in map settings.
Here-mode sidebar place labels and nearby-aircraft distances are still
recomputed only after meaningful movement so small GPS changes do not continually
rebuild nearby context. Status text transitions are tied to distance semantics,
not camera or heading changes.

## Nearby List Rendering

Nearby aircraft and airports are converted into stable row view models before
they reach the list component. Each row carries computed distance, selection
state, filter state, and an animation key. Distance changes can animate status
text; view or heading changes should update in place.

The list renders the current visible window from these stable rows. Sorting and
filtering happen before paint, which keeps frequent traffic updates from
restarting row-level motion or stealing focus from a selected aircraft.

## API Boundaries

Go handles browser-facing API routes under `services/data-service/internal/api`.
The Vite app keeps domain mechanisms and models under `src/features/**` for
normalization, display state, and client-side orchestration.

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
| `/api/proxy/flight-routes/callsign/{callsign}` | Go/route data | Callsign route labels |
| `/api/proxy/reverse-geocode` | Go/Nominatim | Near-me location labels |
| `/api/proxy/map-style/{theme}` | Go/OpenFreeMap | MapLibre style JSON |

User-authenticated persistence is intentionally not coupled to the Vite client.
Until a Go-side Clerk server integration is added, unauthenticated map-settings
reads return no saved settings, writes return `401`, and route feedback returns
`503` instead of depending on a browser-side server runtime.

## Persistence

Railway Postgres remains the app-owned persistence boundary for OurAirports
augmentation data, route feedback, imported source data, and user map settings.
Browser code never receives database URLs. TypeScript DAO modules live under
`src/server/dao/**`; browser-facing API work should not add new Next-style route
handlers.

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

Then check `/health`, a deep link such as `/airport/KBOS`, and `/ws`.

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
