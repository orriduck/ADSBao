# ADSBao Data Service

Go implementation of the Railway realtime data-service. It owns long-running
ADS-B polling, WebSocket fanout, provider fallback, health/debug endpoints, and
Prometheus metrics for ADSBao realtime surfaces.

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
- `GET /metrics`
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
- `ENABLE_PPROF`

## Railway Deployment

Deploy this service from the repository root directory `services/data-service`
using `services/data-service/railway.json`. Validate `/health`, `/metrics`,
direct WebSocket subscribe/ping behavior, provider request rate, and Grafana
panels after each production deploy.

See the repository deployment runbook at `docs/data-service-deployment.md`.
