locals {
  metric_filter = "WHERE service.name = 'adsbao-data-service'"
  log_filter    = "WHERE service.name = 'adsbao-data-service'"
}

resource "newrelic_one_dashboard" "adsbao_data_service" {
  name        = "ADSBao Data Service"
  permissions = var.dashboard_permissions

  page {
    name = "Realtime"

    widget_billboard {
      title  = "Active WebSocket connections"
      row    = 1
      column = 1
      width  = 3
      height = 3

      nrql_query {
        account_id = var.new_relic_account_id
        query      = "FROM Metric SELECT latest(adsbao.ws.connections.current) ${local.metric_filter}"
      }
    }

    widget_billboard {
      title  = "Active subscriptions"
      row    = 1
      column = 4
      width  = 3
      height = 3

      nrql_query {
        account_id = var.new_relic_account_id
        query      = "FROM Metric SELECT sum(adsbao.subscriptions.current) ${local.metric_filter}"
      }
    }

    widget_billboard {
      title  = "Stale channels"
      row    = 1
      column = 7
      width  = 3
      height = 3

      nrql_query {
        account_id = var.new_relic_account_id
        query      = "FROM Metric SELECT sum(adsbao.stale_channels.current) ${local.metric_filter}"
      }
    }

    widget_billboard {
      title  = "Service uptime"
      row    = 1
      column = 10
      width  = 3
      height = 3

      nrql_query {
        account_id = var.new_relic_account_id
        query      = "FROM Metric SELECT latest(adsbao.uptime.seconds) ${local.metric_filter}"
      }
    }

    widget_line {
      title  = "Subscribe and unsubscribe rate"
      row    = 4
      column = 1
      width  = 6
      height = 3

      nrql_query {
        account_id = var.new_relic_account_id
        query      = "FROM Metric SELECT sum(adsbao.ws.subscribe), sum(adsbao.ws.unsubscribe) ${local.metric_filter} FACET channel_type, result TIMESERIES"
      }
    }

    widget_line {
      title  = "WebSocket message rate"
      row    = 4
      column = 7
      width  = 6
      height = 3

      nrql_query {
        account_id = var.new_relic_account_id
        query      = "FROM Metric SELECT sum(adsbao.ws.messages) ${local.metric_filter} FACET direction, type, result TIMESERIES"
      }
    }

    widget_line {
      title  = "Active channels"
      row    = 7
      column = 1
      width  = 6
      height = 3

      nrql_query {
        account_id = var.new_relic_account_id
        query      = "FROM Metric SELECT average(adsbao.active_channels.current) ${local.metric_filter} FACET channel_type TIMESERIES"
      }
    }

    widget_line {
      title  = "Channel failures"
      row    = 7
      column = 7
      width  = 6
      height = 3

      nrql_query {
        account_id = var.new_relic_account_id
        query      = "FROM Metric SELECT average(adsbao.channel_consecutive_failures.current) ${local.metric_filter} FACET channel_type TIMESERIES"
      }
    }
  }

  page {
    name = "Providers"

    widget_line {
      title  = "External provider request rate"
      row    = 1
      column = 1
      width  = 6
      height = 3

      nrql_query {
        account_id = var.new_relic_account_id
        query      = "FROM Metric SELECT sum(adsbao.external_requests) ${local.metric_filter} FACET provider, endpoint, status_class TIMESERIES"
      }
    }

    widget_line {
      title  = "External provider latency"
      row    = 1
      column = 7
      width  = 6
      height = 3

      nrql_query {
        account_id = var.new_relic_account_id
        query      = "FROM Metric SELECT average(adsbao.external_request.duration.seconds), percentile(adsbao.external_request.duration.seconds, 95) ${local.metric_filter} FACET provider, endpoint TIMESERIES"
      }
    }

    widget_line {
      title  = "Polling request rate"
      row    = 4
      column = 1
      width  = 6
      height = 3

      nrql_query {
        account_id = var.new_relic_account_id
        query      = "FROM Metric SELECT sum(adsbao.poll.requests) ${local.metric_filter} FACET channel_type, source, result TIMESERIES"
      }
    }

    widget_line {
      title  = "Polling duration"
      row    = 4
      column = 7
      width  = 6
      height = 3

      nrql_query {
        account_id = var.new_relic_account_id
        query      = "FROM Metric SELECT average(adsbao.poll.duration.seconds), percentile(adsbao.poll.duration.seconds, 95) ${local.metric_filter} FACET channel_type, source TIMESERIES"
      }
    }
  }

  page {
    name = "Logs"

    widget_billboard {
      title  = "Error logs in last 30 minutes"
      row    = 1
      column = 1
      width  = 4
      height = 3

      nrql_query {
        account_id = var.new_relic_account_id
        query      = "FROM Log SELECT count(*) ${local.log_filter} AND level = 'error' SINCE 30 minutes ago"
      }
    }

    widget_line {
      title  = "Log volume by level"
      row    = 1
      column = 5
      width  = 8
      height = 3

      nrql_query {
        account_id = var.new_relic_account_id
        query      = "FROM Log SELECT count(*) ${local.log_filter} FACET level TIMESERIES"
      }
    }

    widget_table {
      title  = "Latest backend logs"
      row    = 4
      column = 1
      width  = 12
      height = 6

      nrql_query {
        account_id = var.new_relic_account_id
        query      = "FROM Log SELECT timestamp, level, message ${local.log_filter} LIMIT 100"
      }

      initial_sorting {
        direction = "desc"
        name      = "timestamp"
      }
    }
  }
}
