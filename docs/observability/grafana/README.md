# ADSBao Grafana Observability

This folder stores Grafana dashboard IaC for the ADSBao Railway observability
stack.

## Datasource

The dashboard expects a Prometheus datasource with this UID:

```text
adsbao-prometheus
```

Railway production Grafana points that datasource at the Railway Prometheus
service, which scrapes:

```text
adsbao-data-service.railway.internal:8080/metrics
```

During the Go data-service migration, add the parallel Railway service as a
second scrape target, for example:

```text
adsbao-data-service-go.railway.internal:8080/metrics
```

The Go service preserves the existing `adsbao_*` metric names and label names,
so the dashboard queries should continue to work if the Prometheus `job` label
is kept as `adsbao-data-service`. If the parallel scrape uses a different
`job` label, duplicate or parameterize panels that currently filter on
`job="adsbao-data-service"` before cutover.

## Provisioned service

The Railway `Grafana` service builds from:

```text
services/grafana
```

Provisioning files:

- `services/grafana/provisioning/datasources/prometheus.yml`
- `services/grafana/provisioning/dashboards/dashboards.yml`
- `services/grafana/dashboards/adsbao-data-service-dashboard.json`
- `services/grafana/provision-dashboard.mjs`

## Dashboard

- `adsbao-data-service-dashboard.json` — WebSocket, provider contact, polling,
  and channel-health graphs/tables for the realtime data service. It applies to
  both `services/data-service` and the Go migration candidate in
  `services/data-service-go` when scrape labels are compatible.

Import path:

```text
Dashboards -> New -> Import -> Upload JSON
```

The production Railway Grafana instance can also be provisioned by API from
this same JSON file after deploy:

```bash
GRAFANA_URL=https://grafana-production-9d5a.up.railway.app \
GRAFANA_BASIC_AUTH_USER=adsbao \
GRAFANA_BASIC_AUTH_PASSWORD=<grafana-admin-password> \
PROMETHEUS_URL=https://prometheus-production-361e.up.railway.app \
PROMETHEUS_BASIC_AUTH_USER=adsbao \
PROMETHEUS_BASIC_AUTH_PASSWORD=<prometheus-admin-password> \
node services/grafana/provision-dashboard.mjs
```
