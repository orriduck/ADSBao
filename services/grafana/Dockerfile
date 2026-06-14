FROM grafana/grafana-oss:latest

COPY provisioning/datasources/prometheus.yml /etc/grafana/provisioning/datasources/prometheus.yml
COPY provisioning/dashboards/dashboards.yml /etc/grafana/provisioning/dashboards/dashboards.yml
COPY dashboards /var/lib/grafana/dashboards

ENV GF_AUTH_ANONYMOUS_ENABLED=false
ENV GF_DASHBOARDS_MIN_REFRESH_INTERVAL=5s
ENV GF_SERVER_HTTP_PORT=3000
ENV GF_USERS_ALLOW_SIGN_UP=false

EXPOSE 3000
