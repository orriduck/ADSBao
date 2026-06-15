package config

import (
	"testing"
	"time"
)

func TestFromEnvParsesCompatibleDataServiceVariables(t *testing.T) {
	env := map[string]string{
		"PORT":                         "9090",
		"MIN_POLL_INTERVAL_MS":         "1500",
		"MAX_POLL_INTERVAL_MS":         "120000",
		"MAX_ACTIVE_CHANNELS":          "12",
		"POLL_JITTER_RATIO":            "0.25",
		"MAX_SOCKET_SUBSCRIPTIONS":     "7",
		"ALLOWED_WS_ORIGINS":           "https://staging.example, https://preview.example",
		"FLIGHTAWARE_FALLBACK_ENABLED": "false",
		"ADSBAO_REALTIME_AUTH_SECRET":  "shared-secret",
		"AIRPORT_DIRECTORY_BASE_URL":   "https://www.adsbao.dev",
		"ENABLE_PPROF":                 "true",
		"NEW_RELIC_LICENSE_KEY":        "new-relic-secret",
		"NEW_RELIC_APP_NAME":           "adsbao-prod",
		"NEW_RELIC_METRICS_ENDPOINT":   "https://metric-api.example.test/metric/v1",
		"NEW_RELIC_LOGS_ENDPOINT":      "https://log-api.example.test/log/v1",
		"METRICS_REPORT_INTERVAL_MS":   "45000",
		"LOGS_REPORT_INTERVAL_MS":      "2000",
	}

	cfg := FromEnv(func(key string) string { return env[key] })
	if cfg.Port != 9090 {
		t.Fatalf("Port = %d", cfg.Port)
	}
	if cfg.MinPollInterval != 1500*time.Millisecond || cfg.MaxPollInterval != 120*time.Second {
		t.Fatalf("poll intervals = %s/%s", cfg.MinPollInterval, cfg.MaxPollInterval)
	}
	if cfg.MaxActiveChannels != 12 || cfg.MaxSocketSubscriptions != 7 {
		t.Fatalf("limits = %d/%d", cfg.MaxActiveChannels, cfg.MaxSocketSubscriptions)
	}
	if cfg.PollJitterRatio != 0.25 {
		t.Fatalf("jitter = %f", cfg.PollJitterRatio)
	}
	if len(cfg.AllowedWSOrigins) != 2 || cfg.AllowedWSOrigins[0] != "https://staging.example" {
		t.Fatalf("origins = %#v", cfg.AllowedWSOrigins)
	}
	if cfg.FlightAwareFallbackEnabled || !cfg.EnablePprof {
		t.Fatalf("booleans = fallback:%v pprof:%v", cfg.FlightAwareFallbackEnabled, cfg.EnablePprof)
	}
	if cfg.RealtimeAuthSecret != "shared-secret" || cfg.AirportDirectoryBaseURL != "https://www.adsbao.dev" {
		t.Fatalf("urls/secrets = %#v", cfg)
	}
	if cfg.NewRelicLicenseKey != "new-relic-secret" ||
		cfg.NewRelicAppName != "adsbao-prod" ||
		cfg.NewRelicMetricsEndpoint != "https://metric-api.example.test/metric/v1" ||
		cfg.NewRelicLogsEndpoint != "https://log-api.example.test/log/v1" ||
		cfg.MetricsReportInterval != 45*time.Second ||
		cfg.LogsReportInterval != 2*time.Second {
		t.Fatalf("new relic config = %#v", cfg)
	}
}

func TestFromEnvDefaultsMatchProductionService(t *testing.T) {
	cfg := FromEnv(func(string) string { return "" })
	if cfg.Port != 8080 ||
		cfg.MinPollInterval != time.Second ||
		cfg.MaxPollInterval != 30*time.Minute ||
		cfg.MaxActiveChannels != 250 ||
		cfg.MaxSocketSubscriptions != 96 ||
		cfg.PollJitterRatio != 0.1 ||
		!cfg.FlightAwareFallbackEnabled ||
		cfg.RealtimeAuthSecret != "" ||
		cfg.AirportDirectoryBaseURL != "https://www.adsbao.dev" ||
		cfg.EnablePprof ||
		cfg.NewRelicLicenseKey != "" ||
		cfg.NewRelicAppName != "adsbao-data-service" ||
		cfg.NewRelicMetricsEndpoint != "https://metric-api.newrelic.com/metric/v1" ||
		cfg.NewRelicLogsEndpoint != "https://log-api.newrelic.com/log/v1" ||
		cfg.MetricsReportInterval != 30*time.Second ||
		cfg.LogsReportInterval != 5*time.Second ||
		cfg.StaticDir != "" {
		t.Fatalf("defaults = %#v", cfg)
	}
}

func TestFromEnvParsesStaticDir(t *testing.T) {
	env := map[string]string{
		"STATIC_DIR": "/app/static",
	}
	cfg := FromEnv(func(key string) string { return env[key] })
	if cfg.StaticDir != "/app/static" {
		t.Fatalf("StaticDir = %q, want %q", cfg.StaticDir, "/app/static")
	}
}

func TestStaticDirEmptyWhenUnset(t *testing.T) {
	cfg := FromEnv(func(key string) string { return "" })
	if cfg.StaticDir != "" {
		t.Fatalf("StaticDir = %q, want empty (backend-only mode)", cfg.StaticDir)
	}
}
