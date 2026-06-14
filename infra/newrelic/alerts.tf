resource "newrelic_alert_policy" "adsbao_data_service" {
  name                = "ADSBao Data Service"
  incident_preference = "PER_CONDITION"
}

resource "newrelic_nrql_alert_condition" "external_provider_error_ratio" {
  account_id                   = var.new_relic_account_id
  policy_id                    = newrelic_alert_policy.adsbao_data_service.id
  type                         = "static"
  name                         = "External provider error ratio"
  description                  = "Provider contact errors are elevated for ADSBao data-service."
  enabled                      = true
  violation_time_limit_seconds = 3600
  aggregation_window           = 60
  aggregation_method           = "event_flow"
  aggregation_delay            = 120

  nrql {
    query = "FROM Metric SELECT percentage(sum(adsbao.external_requests), WHERE result != 'success' OR status_class = '5xx') WHERE service.name = 'adsbao-data-service'"
  }

  critical {
    operator              = "above"
    threshold             = var.external_error_ratio_critical
    threshold_duration    = 300
    threshold_occurrences = "all"
  }
}

resource "newrelic_nrql_alert_condition" "stale_channels" {
  account_id                   = var.new_relic_account_id
  policy_id                    = newrelic_alert_policy.adsbao_data_service.id
  type                         = "static"
  name                         = "Stale realtime channels"
  description                  = "Realtime polling channels are stale."
  enabled                      = true
  violation_time_limit_seconds = 3600
  aggregation_window           = 60
  aggregation_method           = "event_flow"
  aggregation_delay            = 120

  nrql {
    query = "FROM Metric SELECT sum(adsbao.stale_channels.current) WHERE service.name = 'adsbao-data-service'"
  }

  critical {
    operator              = "above"
    threshold             = var.stale_channel_critical
    threshold_duration    = 600
    threshold_occurrences = "all"
  }
}

resource "newrelic_nrql_alert_condition" "backend_error_logs" {
  account_id                   = var.new_relic_account_id
  policy_id                    = newrelic_alert_policy.adsbao_data_service.id
  type                         = "static"
  name                         = "Backend error logs"
  description                  = "ADSBao data-service is emitting error logs."
  enabled                      = true
  violation_time_limit_seconds = 3600
  aggregation_window           = 60
  aggregation_method           = "event_flow"
  aggregation_delay            = 120

  nrql {
    query = "FROM Log SELECT count(*) WHERE service.name = 'adsbao-data-service' AND level = 'error'"
  }

  critical {
    operator              = "above"
    threshold             = var.log_error_rate_critical
    threshold_duration    = 300
    threshold_occurrences = "all"
  }
}
