output "dashboard_guid" {
  description = "New Relic dashboard GUID."
  value       = newrelic_one_dashboard.adsbao_data_service.guid
}

output "dashboard_permalink" {
  description = "New Relic dashboard permalink."
  value       = newrelic_one_dashboard.adsbao_data_service.permalink
}

output "alert_policy_id" {
  description = "New Relic alert policy ID."
  value       = newrelic_alert_policy.adsbao_data_service.id
}
