# ADSBao Railway Deployment Runbook

The public ADSBao app deploys as one Railway service from the repository root.
The root `Dockerfile` builds the Vite frontend, compiles the Go data-service,
copies `dist/` into the runtime image, and starts `adsbao-data-service`.

The private FlightAware endpoint should be added as a second service in the
same Railway project/environment, not as a separate Railway project. Railway
private networking is scoped to one project/environment, so keeping the
endpoint beside the public app lets `adsbao-data-service` use the private
internal domain without exposing FlightAware-only endpoints to browsers.

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

- Better Stack receives custom metrics when
  `BETTERSTACK_METRICS_SOURCE_TOKEN` and `BETTERSTACK_METRICS_ENDPOINT` are
  present.
- Better Stack receives structured backend logs when
  `BETTERSTACK_LOG_SOURCE_TOKEN` and `BETTERSTACK_LOGS_ENDPOINT` are present.
- External provider requests emit `adsbao.external_requests`,
  `adsbao.external_request.duration.seconds`, and structured
  `external_request_done` logs.
- HTTP requests emit route/status-class counters and duration histograms.
- Database operations emit operation/result counters and duration histograms.
- Metric names use the `adsbao.*` namespace and low-cardinality attributes.
- Do not add callsign, full channel name, user id, lat/lon, raw URL, token, or
  exact error text as Better Stack metric attributes.
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

## Private FlightAware Service

Deploy the private FlightAware endpoint as a separate Railway service in the
same project canvas as ADSBao:

```text
Service name: adsbao-flightaware
Source: private FlightAware endpoint repository
Public domain: not required
Private URL for ADSBao: http://adsbao-flightaware.railway.internal:<PORT>
```

Set these variables on the public ADSBao service:

```text
FLIGHTAWARE_SERVICE_BASE_URL=http://adsbao-flightaware.railway.internal:<PORT>
FLIGHTAWARE_SERVICE_TOKEN=<shared bearer token>
FLIGHTAWARE_ACCESS_ENABLED=true
FLIGHTAWARE_FALLBACK_ENABLED=true
```

Use the private `railway.internal` hostname, not a public Railway domain, for
service-to-service requests. The private endpoint must listen on the same
`PORT` configured in its Railway service variables; Railway reference variables
can be used to avoid hard-coding the host or port.

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
- `BETTERSTACK_METRICS_SOURCE_TOKEN`
- `BETTERSTACK_METRICS_ENDPOINT`
- `BETTERSTACK_LOG_SOURCE_TOKEN`
- `BETTERSTACK_LOGS_ENDPOINT`
- `BETTERSTACK_SERVICE_NAME`
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

Check Better Stack for:

- HTTP request count and duration by `/health`, `/api/**`, `/ws`, static SPA
  requests, and SPA fallback route groups.
- WebSocket connections and disconnects.
- WebSocket message and byte rate.
- Subscribe and unsubscribe rate.
- Provider request rate and status class.
- Database transaction rate, result, and duration by operation.
- Poll duration.
- Active channels and subscriptions.
- Stale channels and consecutive failures.
- Backend structured log volume and error logs.

Useful Better Stack query starting points:

```sql
SELECT sum(value) FROM adsbao_data_service_metrics WHERE name = 'adsbao.http.requests' GROUP BY route, status_class
SELECT sum(value) FROM adsbao_data_service_metrics WHERE name = 'adsbao.external_requests' GROUP BY provider, status_class
SELECT quantile(0.95)(value) FROM adsbao_data_service_metrics WHERE name = 'adsbao.external_request.duration.seconds' GROUP BY provider, endpoint
SELECT avg(value) FROM adsbao_data_service_metrics WHERE name = 'adsbao.active_channels.current' GROUP BY channel_type
SELECT dt, level, message FROM adsbao_data_service_logs WHERE service.name = 'adsbao-data-service' ORDER BY dt DESC LIMIT 100
```

The dynamic channel gauges should emit zero-valued series for idle aircraft,
callsign, route, and traffic channel types so charts remain visible when no
clients are connected.

Manage Better Stack dashboards and monitors in the Better Stack UI/API. Also
watch Railway memory/CPU/network and provider request rate after each
production deploy.

## Rollback

Rollback is a Git or Railway deployment rollback:

1. Redeploy the last known-good Railway deployment, or revert the runtime change
   and merge the revert to `main`.
2. Restore the previous Cloudflare record target if a domain cutover was part of
   the rollout.
3. Verify `/health`, deep-link SPA fallback, Better Stack metric/log ingest,
   Railway resource metrics, and a live browser WebSocket session.
