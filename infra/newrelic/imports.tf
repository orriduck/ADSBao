# Production resources already applied in New Relic account 8173845.
# These imports keep a fresh local state from creating duplicate dashboards or
# alert conditions when applying this repo from a new machine.

import {
  to = newrelic_one_dashboard.adsbao_data_service
  id = "ODE3Mzg0NXxWSVp8REFTSEJPQVJEfGRhOjEyNzIwODc3"
}

import {
  to = newrelic_alert_policy.adsbao_data_service
  id = "7626534"
}

import {
  to = newrelic_nrql_alert_condition.external_provider_error_ratio
  id = "7626534:62050808"
}

import {
  to = newrelic_nrql_alert_condition.stale_channels
  id = "7626534:62050806"
}

import {
  to = newrelic_nrql_alert_condition.backend_error_logs
  id = "7626534:62050807"
}
