# ADSBao Railway Deployment Runbook

ADSBao deploys as one Railway service from the repository root. The root
`Dockerfile` builds the Vite frontend, compiles the Go data-service, copies
`dist/` into the runtime image, and starts `adsbao-data-service`.

## Runtime Contract

The service exposes:

- `GET /health`
- `GET /debug/channels`
- `GET /api/feature-flags`
- `GET /api/realtime/auth`
- `GET /api/**` same-origin provider and app routes
- `GET /ws` WebSocket upgrade
- Static assets from `dist/`
- SPA fallback for deep links such as `/airport/KBOS`

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
- Callsign, aircraft, and route channels are accepted by the frontend realtime
  client.
- Multiple sockets subscribed to the same normalized scheduler key share one
  provider polling loop.
- When the last subscriber leaves a key, its polling loop is cancelled.

Stable observability behavior:

- APM transactions, custom events, custom metrics, Metric API payloads, and Log
  API payloads are sent to New Relic when `NEW_RELIC_LICENSE_KEY` is present.
- Background provider polling is wrapped in APM transactions, and provider HTTP
  clients use the New Relic transport so external latency can appear in APM.
- External provider requests emit `ADSBaoExternalRequest` custom events,
  `ExternalRequest/*` custom metrics, `adsbao.external_*` Metric API series,
  and structured `external_request_done` logs.
- Metric names use the `adsbao.*` namespace and low-cardinality attributes.
- Do not add callsign, full channel name, user id, lat/lon, raw URL, token, or
  exact error text as New Relic metric attributes.
- Railway built-in metrics remain the source for service CPU, memory, network,
  and volume usage.

## Railway Service

Use the root Railway config:

```text
Root directory: .
Config file: /railway.json
Dockerfile: /Dockerfile
Healthcheck: /health
Public app URL: https://<railway-domain>
WebSocket URL: wss://<railway-domain>/ws
```

Compatible env vars:

- `PORT`
- `STATIC_DIR`
- `ADSBAO_SITE_URL`
- `VITE_SITE_URL`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_JWKS_URL`
- `CLERK_API_BASE_URL`
- `OPENAIP_API_KEY`
- `OPENAIP_BASE_URL`
- `ADSBAO_DATABASE_URL`
- `DATABASE_URL`
- `PGSSLMODE`
- `PGPOOL_MAX`
- `FEATURE_FLAGS_ENV`
- `FLIGHTAWARE_ACCESS_ENABLED`
- `FLIGHTAWARE_FALLBACK_ENABLED`
- `ADSBAO_REALTIME_AUTH_SECRET`
- `MIN_POLL_INTERVAL_MS`
- `MAX_POLL_INTERVAL_MS`
- `MAX_ACTIVE_CHANNELS`
- `POLL_JITTER_RATIO`
- `MAX_SOCKET_SUBSCRIPTIONS`
- `ALLOWED_WS_ORIGINS`
- `AIRPORT_DIRECTORY_BASE_URL`
- `NEW_RELIC_LICENSE_KEY`
- `NEW_RELIC_APP_NAME`
- `NEW_RELIC_METRICS_ENDPOINT`
- `NEW_RELIC_LOGS_ENDPOINT`
- `METRICS_REPORT_INTERVAL_MS`
- `LOGS_REPORT_INTERVAL_MS`

Optional Go-only debug env:

- `ENABLE_PPROF=true` enables `/debug/pprof/`; leave it unset for ordinary
  production operation.

## Local Validation

Run these before merging broad runtime changes:

```bash
pnpm run typecheck
pnpm lint
pnpm test
pnpm run build
cd services/data-service && go test ./...
```

For a single-service smoke:

```bash
pnpm run build
cd services/data-service
STATIC_DIR=/Users/ruyyi/Devs/ADSBao/dist PORT=8080 go run ./cmd/adsbao-data-service
```

Validate HTTP endpoints:

```bash
curl http://localhost:8080/health
curl http://localhost:8080/api/feature-flags
curl http://localhost:8080/airport/KBOS
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
curl https://<railway-domain>/api/feature-flags
```

Then verify a rendered deep link and direct WebSocket smoke against:

```text
https://<railway-domain>/airport/KBOS
wss://<railway-domain>/ws
```

Check New Relic for:

- APM transactions for `/health`, `/api/**`, `/ws`, static SPA requests, and
  background `Polling/*` work.
- WebSocket connections and disconnects.
- WebSocket message and byte rate.
- Subscribe and unsubscribe rate.
- Provider request rate and status class.
- Poll duration.
- Active channels and subscriptions.
- Stale channels and consecutive failures.
- `ADSBaoExternalRequest` custom events.
- Backend structured log volume and error logs.

Useful NRQL starting points:

```sql
FROM Metric SELECT sum(adsbao.ws.subscribe) FACET channel_type, result TIMESERIES
FROM Metric SELECT sum(adsbao.external_requests) FACET provider, status_class TIMESERIES
FROM ADSBaoExternalRequest SELECT count(*), percentile(durationSeconds, 95) FACET provider, endpoint, statusClass TIMESERIES
FROM Metric SELECT average(adsbao.active_channels.current) FACET channel_type TIMESERIES
FROM Log SELECT timestamp, level, message WHERE service.name = 'adsbao-data-service' LIMIT 100
```

The dynamic channel gauges should emit zero-valued series for idle aircraft,
callsign, route, and traffic channel types so charts remain visible when no
clients are connected.

Apply `infra/newrelic` to manage the ADSBao NRQL alert policy and conditions in
New Relic. Also watch Railway memory/CPU/network and provider request rate after
each production deploy.

## Rollback

Rollback is a Git or Railway deployment rollback:

1. Redeploy the last known-good Railway deployment, or revert the runtime change
   and merge the revert to `main`.
2. Restore the previous Cloudflare record target if a domain cutover was part of
   the rollout.
3. Verify `/health`, deep-link SPA fallback, New Relic APM/custom
   event/metric/log ingest, Railway resource metrics, and a live browser
   WebSocket session.
