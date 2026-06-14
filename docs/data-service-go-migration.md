# Go Data-Service Migration Runbook

This runbook covers the migration from the TypeScript realtime service in
`services/data-service` to the parallel Go service in `services/data-service-go`.
The frontend contract remains `NEXT_PUBLIC_ADSBAO_REALTIME_URL=<wss-url>/ws`.

## Current Status

- Production remains on `services/data-service`.
- `services/data-service-go` is a deployable, contract-compatible candidate.
- Do not delete `services/data-service` until the Go service has run in
  production long enough to prove provider rate, memory, CPU, and Grafana
  behavior.
- Do not change the production `NEXT_PUBLIC_ADSBAO_REALTIME_URL` until the
  parallel Railway checks below pass.

## Stable Runtime Contract

The Go service must keep these public endpoints and payload shapes stable:

- `GET /health`
- `GET /debug/channels`
- `GET /metrics`
- `GET /ws` WebSocket upgrade
- `connection:ready`, `subscribed:ready`, `subscribed:removed`,
  `subscribe:error`, `aircraft:update`, `route:update`, `channel:error`, and
  JSON `ping`/`pong` WebSocket messages
- `traffic:center:{lat}:{lon}:{distNm}` channel normalization with rounded
  center coordinates
- Callsign, aircraft, and route channels accepted by the existing frontend
  realtime client
- Prometheus `adsbao_*` metric names and existing label names

## Railway Parallel Deployment

Create a new Railway service instead of repointing the existing one:

1. Service root directory: `services/data-service-go`
2. Config file: `/services/data-service-go/railway.json`
3. Dockerfile: `services/data-service-go/Dockerfile`
4. Public domain: generate a separate `https://...railway.app` domain
5. Runtime port: Railway supplies `PORT`; the Dockerfile defaults to `8080`

Copy compatible env vars from the TypeScript service when present:

- `MIN_POLL_INTERVAL_MS`
- `MAX_POLL_INTERVAL_MS`
- `MAX_ACTIVE_CHANNELS`
- `POLL_JITTER_RATIO`
- `MAX_SOCKET_SUBSCRIPTIONS`
- `ALLOWED_WS_ORIGINS`
- `FLIGHTAWARE_FALLBACK_ENABLED`

Optional Go-only debug env:

- `ENABLE_PPROF=true` enables `/debug/pprof/`; leave it unset in ordinary
  production operation.

## Pre-Cutover Validation

Run these local checks before pushing:

```bash
cd services/data-service-go
go test ./...
go test -race ./...
go vet ./...
go build ./cmd/adsbao-data-service
```

Keep the TypeScript service green while both implementations coexist:

```bash
pnpm --dir services/data-service test
pnpm --dir services/data-service build
```

After Railway deploys the Go service, validate:

```bash
curl https://<go-railway-domain>/health
curl https://<go-railway-domain>/metrics
```

Then run a direct WebSocket smoke against:

```text
wss://<go-railway-domain>/ws
```

Required smoke results:

- `connection:ready` is received after connect.
- JSON `{"type":"ping"}` receives `{"type":"pong"}`.
- Subscribing to `traffic:center:42.3656:-71.0096:40` returns
  `subscribed:ready` for `traffic:center:42.4:-71:40`.
- The first provider update is an `aircraft:update` event with ADS-B payload
  data under `data.ac`.
- Closing the socket returns `/debug/channels` to an empty list after cleanup.

## Prometheus And Grafana

Add the Go service as a parallel Prometheus target before cutover. Prefer the
same low-cardinality labels used by the current service:

```text
job="adsbao-data-service"
```

If the Go target must use a different `job` label, update or duplicate Grafana
panels that filter on `job="adsbao-data-service"` before switching traffic.
Do not add high-cardinality labels such as callsign, full channel name, user id,
lat/lon, raw URL, token, or exact error text.

Compare at least these panels between TypeScript and Go:

- WebSocket connections and disconnects
- WebSocket message and byte rate
- Subscribe and unsubscribe rate
- Provider request rate and status class
- Poll duration
- Active channels and subscriptions
- Stale channels and consecutive failures

## Staging Cutover

1. Set a non-production Vercel environment's
   `NEXT_PUBLIC_ADSBAO_REALTIME_URL` to `wss://<go-railway-domain>/ws`.
2. Open an airport page that uses nearby traffic.
3. Confirm the browser WebSocket connects, subscribes, receives
   `aircraft:update`, reconnects cleanly after a manual socket close, and does
   not fall back to increased Vercel proxy polling.
4. Confirm Grafana shows the Go service metrics and provider request rate is
   not higher than the TypeScript baseline for the same traffic.

## Production Cutover

1. Keep both Railway services deployed.
2. Change production `NEXT_PUBLIC_ADSBAO_REALTIME_URL` to the Go service
   `wss://<go-railway-domain>/ws`.
3. Redeploy the frontend environment that owns that public env var.
4. Verify `/health`, `/metrics`, Grafana, and a live browser WebSocket session.
5. Watch Railway memory, CPU, provider request rate, and Vercel aircraft proxy
   invocations against the TypeScript baseline.

## Rollback

Rollback is a realtime URL change:

1. Set `NEXT_PUBLIC_ADSBAO_REALTIME_URL` back to the TypeScript Railway service.
2. Redeploy the frontend environment.
3. Keep the Go Railway service running long enough to inspect logs and metrics.
4. Do not remove `services/data-service-go`; fix forward in a new branch.
