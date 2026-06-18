# Better Stack

This folder captures the ADSBao Better Stack Telemetry configuration that is
owned outside the application runtime.

Run from the repository root:

```bash
BETTERSTACK_API_TOKEN=... ops/betterstack/apply.sh
```

The script is intentionally narrow:

- It creates the metric field definitions used by the Better Stack UI.
- It replaces the `ADSBao Observability Center` dashboard from
  `dashboard.json`.
- It does not create or print source tokens. Runtime source tokens stay in
  Railway variables.
- It uses Better Stack dashboard variables created by the API request in
  `apply.sh`; `dashboard.json` is the portable chart/section definition.

Current source IDs:

- Logs: `2528096` (`ADSBao data-service logs`)
- Metrics: `2528098` (`ADSBao data-service metrics`)

The metrics source platform is `prometheus` because Better Stack requires a
Prometheus source for its HTTP `/metrics` ingestion API. ADSBao does not run a
Prometheus server on Railway.

## Current dashboard coverage

The center dashboard answers these backend questions from Better Stack metrics
and logs:

- HTTP TPS, HTTP 2xx volume, HTTP 4xx/5xx volume, and HTTP error percentage.
- HTTP status-class split over the selected range.
- Outbound provider status mix, provider error percentage, and external request
  latency from structured logs.
- Database transaction counts by operation/result.
- WebSocket active connections, upgrades, disconnects, subscribe/unsubscribe
  activity, message outcomes, and channel gauges.
- Recent external warning/error logs with extracted status and duration columns.

Known gaps:

- Visitor country, referrer, browser, device, and SPA page-view analytics need a
  frontend/RUM source or explicit page-view events. Backend-only metrics do not
  capture enough client navigation context.
- HTTP and DB duration histograms are present, but Better Stack currently shows
  empty bucket aggregates for those series. Keep latency panels sourced from
  structured logs or add a direct duration metric/log field before relying on
  HTTP/DB p95 charts.
