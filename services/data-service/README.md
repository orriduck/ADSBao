# ADSBao Data Service

Go implementation of the Railway ADSBao service. It serves the Vite SPA,
same-origin API routes, long-running ADS-B polling, WebSocket fanout, provider
fallback, health/debug endpoints, and New Relic telemetry reporting.

## Local Run

```bash
go test ./...
PORT=8080 go run ./cmd/adsbao-data-service
```

For split local development, point Vite at this local WebSocket:

```bash
VITE_ADSBAO_REALTIME_URL=ws://localhost:8080/ws pnpm run dev
```

## Endpoints

- `GET /health`
- `GET /debug/channels`
- `GET /api/**`
- `GET /ws` WebSocket upgrade

Optional Go profiling endpoints are available under `/debug/pprof/` only when
`ENABLE_PPROF=true`.

## Compatible Environment Variables

- `PORT`
- `MIN_POLL_INTERVAL_MS`
- `MAX_POLL_INTERVAL_MS`
- `MAX_ACTIVE_CHANNELS`
- `POLL_JITTER_RATIO`
- `MAX_SOCKET_SUBSCRIPTIONS`
- `ALLOWED_WS_ORIGINS`
- `DATABASE_URL` / `ADSBAO_DATABASE_URL` — Postgres connection string used by
  Go `/api/map-settings` and `/api/route-feedback` after the Vite/Railway
  migration.
- `FEATURE_FLAGS_ENV` — one of `local`, `preview`, or `production`; scopes
  user map settings to the same environment names as the existing tables.
- `CLERK_SECRET_KEY` — Clerk Backend API key used to resolve the signed-in
  user's primary email after verifying the browser bearer token.
- `CLERK_JWKS_URL` — optional override for Clerk JWT public keys. When unset,
  the service uses the token issuer's `/.well-known/jwks.json`.
- `CLERK_API_BASE_URL` — optional Clerk Backend API base URL. Defaults to
  `https://api.clerk.com`.
- `FLIGHTAWARE_FALLBACK_ENABLED`
- `ADSBAO_REALTIME_AUTH_SECRET` — HMAC secret used by `/api/realtime/auth` and
  the WebSocket handler to authorize FlightAware realtime subscriptions.
- `AIRPORT_DIRECTORY_BASE_URL` — ADSBao web origin used as the fallback airport
  directory for FlightAware route pages that omit embedded airport coordinates.
  Defaults to `https://www.adsbao.dev`.
- `ENABLE_PPROF`
- `NEW_RELIC_LICENSE_KEY` — New Relic ingest license key. When unset, APM,
  custom events, custom metrics, Metric API, and backend log reporting are
  disabled.
- `NEW_RELIC_APP_NAME` — New Relic app name. Defaults to `adsbao-data-service`.
- `NEW_RELIC_METRICS_ENDPOINT` — Metric API endpoint. Defaults to the US
  endpoint `https://metric-api.newrelic.com/metric/v1`.
- `NEW_RELIC_LOGS_ENDPOINT` — Log API endpoint. Defaults to the US endpoint
  `https://log-api.newrelic.com/log/v1`.
- `METRICS_REPORT_INTERVAL_MS` — periodic dynamic gauge flush interval.
  Defaults to `30000`.
- `LOGS_REPORT_INTERVAL_MS` — periodic backend log flush interval. Defaults to
  `5000`.

Custom Metric API and Log API payloads use `app.name` plus `adsbao.service` as
their service identity. Do not add `service.name` to these payloads; New Relic
uses that OpenTelemetry resource attribute to synthesize separate service
entities.

## Railway Deployment

Deploy ADSBao from the repository root using the root `Dockerfile` and
`railway.json`. Validate `/health`, SPA deep links, `/api/feature-flags`, direct
WebSocket subscribe/ping behavior, Railway resource metrics, and New Relic APM
transactions, external provider custom events, business metrics, latency
summaries, and backend logs after each production deploy.

See the repository deployment runbook at `docs/data-service-deployment.md`.
