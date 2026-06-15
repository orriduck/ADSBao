# ADSBao New Relic Observability

This Terraform module creates ADSBao NRQL alert conditions in New Relic.

It does not store secrets. Provide credentials through environment variables:

```bash
export TF_VAR_new_relic_account_id="<account-id>"
export TF_VAR_new_relic_api_key="<user-api-key>"
```

Then run with Terraform or OpenTofu:

```bash
terraform init
terraform plan
terraform apply
```

The Railway service uses `NEW_RELIC_LICENSE_KEY` for APM, custom events, custom
metrics, Metric API, and Log API ingest. Custom Metric API and Log API payloads
use `app.name` plus `adsbao.service` so New Relic does not synthesize duplicate
OpenTelemetry/EXT service entities from ADSBao-owned telemetry. The user API key
above is only for managing alert policy resources through Terraform.

Useful New Relic queries after deploy:

```sql
FROM Metric SELECT sum(adsbao.ws.subscribe) WHERE app.name = 'adsbao-data-service' FACET channel_type, result TIMESERIES
FROM Metric SELECT sum(adsbao.external_requests) WHERE app.name = 'adsbao-data-service' FACET provider, status_class TIMESERIES
FROM ADSBaoExternalRequest SELECT count(*), percentile(durationSeconds, 95) FACET provider, endpoint, statusClass TIMESERIES
FROM Log SELECT timestamp, level, message WHERE app.name = 'adsbao-data-service' LIMIT 100
```
