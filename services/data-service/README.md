# ADSBao Data Service

Go implementation of the Railway ADSBao service. It serves the Vite SPA,
same-origin API routes, long-running ADS-B polling, WebSocket fanout, provider
fallback, health/debug endpoints, and Better Stack telemetry reporting.

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
- `FLIGHTAWARE_SERVICE_BASE_URL` — optional private FlightAware REST service
  origin. Same-project Railway private URLs such as
  `http://adsbao-flightaware.railway.internal:<PORT>` are supported, and a
  separate Railway project or other protected HTTPS origin is also valid when
  reachable from the public ADSBao service. When set, FlightAware callsign
  fallback, FlightAware route lookup, and airline-logo proxy requests are
  forwarded to that service instead of calling FlightAware directly from the
  public ADSBao deployment.
- `FLIGHTAWARE_SERVICE_TOKEN` — bearer token sent to
  `FLIGHTAWARE_SERVICE_BASE_URL` as `Authorization: Bearer ...`.
- `ADSBAO_REALTIME_AUTH_SECRET` — HMAC secret used by `/api/realtime/auth` and
  the WebSocket handler to authorize FlightAware realtime subscriptions.
- `ENABLE_PPROF`
- `BETTERSTACK_METRICS_SOURCE_TOKEN` — Better Stack metrics source token. When
  unset, backend metric forwarding is disabled.
- `BETTERSTACK_METRICS_ENDPOINT` — Better Stack metrics ingest endpoint,
  normally `https://<metrics-source-host>/metrics`.
- `BETTERSTACK_LOG_SOURCE_TOKEN` — Better Stack logs source token. When unset,
  backend log forwarding is disabled while stdout logging still works.
- `BETTERSTACK_LOGS_ENDPOINT` — Better Stack logs ingest endpoint, normally
  `https://<logs-source-host>`.
- `BETTERSTACK_SERVICE_NAME` — service name tag for metrics and logs. Defaults
  to `adsbao-data-service`.
- `METRICS_REPORT_INTERVAL_MS` — periodic dynamic gauge flush interval.
  Defaults to `30000`.
- `LOGS_REPORT_INTERVAL_MS` — periodic backend log flush interval. Defaults to
  `5000`.

Better Stack metric and log payloads use `service.name` plus `adsbao.service`
as their service identity, with low-cardinality route, provider, operation,
status class, and channel labels for dashboard queries.

## Railway Deployment

Deploy ADSBao from the repository root using the root `Dockerfile` and
`railway.json`. Validate `/health`, SPA deep links, `/api/feature-flags`, direct
WebSocket subscribe/ping behavior, Railway resource metrics, Better Stack
backend metrics, and structured logs after each production deploy.

See the repository deployment runbook at `docs/data-service-deployment.md`.
