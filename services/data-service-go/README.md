# ADSBao Go Data Service

Parallel Go implementation of the Railway realtime data-service. It preserves
the existing public HTTP, WebSocket, channel, provider, and Prometheus metric
contracts while leaving the TypeScript service under `services/data-service`
intact.

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

## Cutover Model

Deploy this service as a separate Railway service first. Validate `/health`,
`/metrics`, direct WebSocket subscribe/ping behavior, provider request rate,
and Grafana panels before changing `NEXT_PUBLIC_ADSBAO_REALTIME_URL`.

See the repository migration runbook at
`docs/data-service-go-migration.md`.
