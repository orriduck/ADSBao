#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DASHBOARD_JSON="$ROOT_DIR/ops/betterstack/dashboard.json"
API_BASE="https://telemetry.betterstack.com"
TEAM_ID="${BETTERSTACK_TEAM_ID:-558886}"
METRICS_SOURCE_ID="${BETTERSTACK_METRICS_SOURCE_ID:-2528098}"
DASHBOARD_NAME="${BETTERSTACK_DASHBOARD_NAME:-ADSBao Observability Center}"

if [[ -z "${BETTERSTACK_API_TOKEN:-}" ]]; then
  echo "BETTERSTACK_API_TOKEN is required" >&2
  exit 1
fi

api() {
  local method="$1"
  local path="$2"
  shift 2
  curl -fsS -X "$method" "$API_BASE$path" \
    -H "Authorization: Bearer $BETTERSTACK_API_TOKEN" \
    -H "Content-Type: application/json" \
    "$@"
}

existing_metrics="$(mktemp)"
payload_file=""
cleanup() {
  rm -f "$existing_metrics"
  if [[ -n "$payload_file" ]]; then
    rm -f "$payload_file"
  fi
}
trap cleanup EXIT

api GET "/api/v2/sources/$METRICS_SOURCE_ID/metrics?per_page=250" > "$existing_metrics"

create_metric() {
  local name="$1"
  local expression="$2"
  local type="$3"
  local aggregations="${4:-[]}"

  if jq -e --arg name "$name" '.data[]? | select(.attributes.name == $name)' "$existing_metrics" >/dev/null; then
    echo "metric exists: $name"
    return
  fi

  jq -n \
    --arg name "$name" \
    --arg expression "$expression" \
    --arg type "$type" \
    --argjson aggregations "$aggregations" \
    '{name: $name, sql_expression: $expression, type: $type, aggregations: $aggregations}' |
    api POST "/api/v2/sources/$METRICS_SOURCE_ID/metrics" --data-binary @- >/dev/null

  echo "metric created: $name"
}

create_metric "metric_name" "JSONExtractString(raw, 'name')" "string_low_cardinality"
create_metric "service_name" "JSONExtractString(raw, 'tags', 'service.name')" "string_low_cardinality"
create_metric "route" "JSONExtractString(raw, 'tags', 'route')" "string_low_cardinality"
create_metric "method" "JSONExtractString(raw, 'tags', 'method')" "string_low_cardinality"
create_metric "status" "JSONExtractString(raw, 'tags', 'status')" "string_low_cardinality"
create_metric "status_class" "JSONExtractString(raw, 'tags', 'status_class')" "string_low_cardinality"
create_metric "provider" "JSONExtractString(raw, 'tags', 'provider')" "string_low_cardinality"
create_metric "endpoint" "JSONExtractString(raw, 'tags', 'endpoint')" "string_low_cardinality"
create_metric "operation" "JSONExtractString(raw, 'tags', 'operation')" "string_low_cardinality"
create_metric "result" "JSONExtractString(raw, 'tags', 'result')" "string_low_cardinality"
create_metric "channel_type" "JSONExtractString(raw, 'tags', 'channel_type')" "string_low_cardinality"
create_metric "counter_value" "JSONExtract(raw, 'counter', 'value', 'Nullable(Float64)')" "float64_delta" '["sum","count"]'
create_metric "gauge_value" "JSONExtract(raw, 'gauge', 'value', 'Nullable(Float64)')" "float64_delta" '["avg","min","max"]'
create_metric "histogram_count" "JSONExtract(raw, 'histogram', 'count', 'Nullable(Float64)')" "float64_delta" '["sum"]'
create_metric "histogram_sum" "JSONExtract(raw, 'histogram', 'sum', 'Nullable(Float64)')" "float64_delta" '["sum"]'

dashboard_ids="$(
  api GET "/api/v2/dashboards?per_page=250" |
    jq -r --arg name "$DASHBOARD_NAME" '.data[]? | select(.attributes.name == $name) | .id'
)"

for dashboard_id in $dashboard_ids; do
  api DELETE "/api/v2/dashboards/$dashboard_id" >/dev/null
  echo "dashboard removed: $dashboard_id"
done

payload_file="$(mktemp)"

dashboard_id="$(
  jq -n --arg name "$DASHBOARD_NAME" --slurpfile data "$DASHBOARD_JSON" '{
    name: $name,
    refresh_interval: $data[0].refresh_interval,
    date_range_from: $data[0].date_range_from,
    date_range_to: $data[0].date_range_to,
    source_eligibility_sql: $data[0].source_eligibility_sql,
    variables: [
      {
        name: "source",
        variable_type: "source",
        values: ["2528098"],
        default_values: ["2528098"]
      }
    ]
  }' > "$payload_file"

  api POST "/api/v2/dashboards" --data-binary "@$payload_file" |
    jq -r '.data.id'
)"

echo "dashboard created: $dashboard_id"

jq -c '.charts[]' "$DASHBOARD_JSON" | while IFS= read -r chart; do
  jq -n --argjson chart "$chart" '{
    chart_type: $chart.chart_type,
    name: $chart.name,
    description: $chart.description,
    x: $chart.x,
    y: $chart.y,
    w: $chart.w,
    h: $chart.h,
    settings: $chart.settings,
    queries: ($chart.chart_queries | map({
      query_type,
      source_variable: (.source_variable // "source"),
      sql_query,
      where_condition,
      static_text
    }))
  }' > "$payload_file"

  api POST "/api/v2/dashboards/$dashboard_id/charts" --data-binary "@$payload_file" >/dev/null
  echo "chart created: $(jq -r '.name' <<<"$chart")"
done

echo "https://telemetry.betterstack.com/team/t${TEAM_ID}/dashboards/${dashboard_id}"
