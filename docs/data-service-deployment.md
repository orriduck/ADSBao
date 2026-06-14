# Data-Service Deployment Runbook

The ADSBao realtime data-service is a Go service under `services/data-service`.
It is deployed independently on Railway and selected by the frontend through
`NEXT_PUBLIC_ADSBAO_REALTIME_URL=<wss-url>/ws`.

## Runtime Contract

The service exposes:

- `GET /health`
- `GET /debug/channels`
- `GET /metrics`
- `GET /ws` WebSocket upgrade

Stable WebSocket events:

- `connection:ready`
- `subscribed:ready`
- `subscribed:removed`
- `subscribe:error`
- `aircraft:update`
- `route:update`
- `channel:error`
- JSON `ping`/`pong`

Stable channel behavior:

- `traffic:center:{lat}:{lon}:{distNm}` normalizes center coordinates before
  creating a shared polling loop.
- Callsign, aircraft, and route channels are accepted by the existing frontend
  realtime client.
- Multiple sockets subscribed to the same normalized scheduler key share one
  provider polling loop.
- When the last subscriber leaves a key, its polling loop is cancelled.

Stable metrics behavior:

- Prometheus metrics are exposed under `/metrics`.
- Existing `adsbao_*` metric names and low-cardinality label names are kept for
  Grafana compatibility.
- Do not add callsign, full channel name, user id, lat/lon, raw URL, token, or
  exact error text as Prometheus labels.

## Railway Service

Use the existing Railway data-service with:

```text
Root directory: services/data-service
Config file: /services/data-service/railway.json
Dockerfile: services/data-service/Dockerfile
Healthcheck: /health
Public WebSocket URL: wss://<railway-domain>/ws
```

Compatible env vars:

- `PORT`
- `MIN_POLL_INTERVAL_MS`
- `MAX_POLL_INTERVAL_MS`
- `MAX_ACTIVE_CHANNELS`
- `POLL_JITTER_RATIO`
- `MAX_SOCKET_SUBSCRIPTIONS`
- `ALLOWED_WS_ORIGINS`
- `FLIGHTAWARE_FALLBACK_ENABLED`

Optional Go-only debug env:

- `ENABLE_PPROF=true` enables `/debug/pprof/`; leave it unset for ordinary
  production operation.

## Local Validation

Run these before merging service changes:

```bash
cd services/data-service
go test ./...
go test -race ./...
go vet ./...
go build ./cmd/adsbao-data-service
```

Keep the web app checks green:

```bash
pnpm test
pnpm build
```

## Local Smoke

Run the service:

```bash
cd services/data-service
PORT=8080 go run ./cmd/adsbao-data-service
```

Validate HTTP endpoints:

```bash
curl http://localhost:8080/health
curl http://localhost:8080/metrics
curl http://localhost:8080/debug/channels
```

Direct WebSocket smoke against `ws://localhost:8080/ws`:

- `connection:ready` is received after connect.
- JSON `{"type":"ping"}` receives `{"type":"pong"}`.
- Subscribing to `traffic:center:42.3656:-71.0096:40` returns
  `subscribed:ready` for `traffic:center:42.4:-71:40`.
- The first provider update is an `aircraft:update` event with ADS-B payload
  data under `data.ac`.
- Closing the socket returns `/debug/channels` to an empty list after cleanup.

## Production Verification

After Railway deploys:

```bash
curl https://<railway-domain>/health
curl https://<railway-domain>/metrics
```

Then run a direct WebSocket smoke against:

```text
wss://<railway-domain>/ws
```

Check Grafana panels for:

- WebSocket connections and disconnects
- WebSocket message and byte rate
- Subscribe and unsubscribe rate
- Provider request rate and status class
- Poll duration
- Active channels and subscriptions
- Stale channels and consecutive failures

Also watch Railway memory, CPU, provider request rate, and Vercel aircraft
proxy invocations after each production deploy.

## Rollback

Rollback is a Git or Railway deployment rollback:

1. Redeploy the last known-good Railway deployment, or revert the service change
   and merge the revert to `main`.
2. Keep `NEXT_PUBLIC_ADSBAO_REALTIME_URL` pointed at the Railway data-service
   public `/ws` URL unless the service domain itself changed.
3. Verify `/health`, `/metrics`, Grafana, and a live browser WebSocket session.
