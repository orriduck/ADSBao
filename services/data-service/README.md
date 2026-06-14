# ADSBao Data Service

Go implementation of the Railway realtime data-service. It owns long-running
ADS-B polling, WebSocket fanout, provider fallback, health/debug endpoints, and
New Relic telemetry reporting for ADSBao realtime surfaces.

## Local Run

```bash
go test ./...
PORT=8080 go run ./cmd/adsbao-data-service
```

Then point the Next.js app at:

```bash
NEXT_PUBLIC_ADSBAO_REALTIME_URL=ws://localhost:8080/ws pnpm run dev
```

## Endpoints

- `GET /health`
- `GET /debug/channels`
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
- `FLIGHTAWARE_FALLBACK_ENABLED`
- `ADSBAO_REALTIME_AUTH_SECRET` — shared HMAC secret used by Vercel
  `/api/realtime/auth` and the data-service to authorize FlightAware realtime
  subscriptions.
- `AIRPORT_DIRECTORY_BASE_URL` — ADSBao web origin used as the fallback airport
  directory for FlightAware route pages that omit embedded airport coordinates.
  Defaults to `https://www.adsbao.dev`.
- `ENABLE_PPROF`
- `NEW_RELIC_LICENSE_KEY` — New Relic ingest license key. When unset, metrics
  and backend log reporting are disabled.
- `NEW_RELIC_APP_NAME` — New Relic app name. Defaults to `adsbao-data-service`.
- `NEW_RELIC_METRICS_ENDPOINT` — Metric API endpoint. Defaults to the US
  endpoint `https://metric-api.newrelic.com/metric/v1`.
- `NEW_RELIC_LOGS_ENDPOINT` — Log API endpoint. Defaults to the US endpoint
  `https://log-api.newrelic.com/log/v1`.
- `METRICS_REPORT_INTERVAL_MS` — periodic dynamic gauge flush interval.
  Defaults to `30000`.
- `LOGS_REPORT_INTERVAL_MS` — periodic backend log flush interval. Defaults to
  `5000`.

## Railway Deployment

Deploy this service from the repository root directory `services/data-service`
using `services/data-service/railway.json`. Validate `/health`, direct
WebSocket subscribe/ping behavior, Railway resource metrics, and New Relic
business metrics and backend logs after each production deploy.

See the repository deployment runbook at `docs/data-service-deployment.md`.
