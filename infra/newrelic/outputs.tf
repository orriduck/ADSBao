output "dashboard_guid" {
  description = "New Relic dashboard GUID."
  value       = newrelic_one_dashboard.adsbao_data_service.guid
}

output "alert_policy_id" {
  description = "New Relic alert policy ID."
  value       = newrelic_alert_policy.adsbao_data_service.id
}
