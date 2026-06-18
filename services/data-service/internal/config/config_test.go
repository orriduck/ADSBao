package config

import (
	"testing"
	"time"
)

func TestFromEnvParsesCompatibleDataServiceVariables(t *testing.T) {
	env := map[string]string{
		"PORT":                             "9090",
		"MIN_POLL_INTERVAL_MS":             "1500",
		"MAX_POLL_INTERVAL_MS":             "120000",
		"MAX_ACTIVE_CHANNELS":              "12",
		"POLL_JITTER_RATIO":                "0.25",
		"MAX_SOCKET_SUBSCRIPTIONS":         "7",
		"ALLOWED_WS_ORIGINS":               "https://staging.example, https://preview.example",
		"FLIGHTAWARE_FALLBACK_ENABLED":     "false",
		"FLIGHTAWARE_ACCESS_ENABLED":       "true",
		"ADSBAO_REALTIME_AUTH_SECRET":      "shared-secret",
		"AIRPORT_DIRECTORY_BASE_URL":       "https://www.adsbao.dev",
		"OPENAIP_API_KEY":                  "openaip-secret",
		"OPENAIP_BASE_URL":                 "https://openaip.example.test/api",
		"ENABLE_PPROF":                     "true",
		"BETTERSTACK_METRICS_SOURCE_TOKEN": "metrics-source-token",
		"BETTERSTACK_METRICS_ENDPOINT":     "https://metrics.example.test/metrics",
		"BETTERSTACK_LOG_SOURCE_TOKEN":     "logs-source-token",
		"BETTERSTACK_LOGS_ENDPOINT":        "https://logs.example.test",
		"BETTERSTACK_SERVICE_NAME":         "adsbao-prod",
		"METRICS_REPORT_INTERVAL_MS":       "45000",
		"LOGS_REPORT_INTERVAL_MS":          "2000",
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
	if cfg.FlightAwareFallbackEnabled || !cfg.FlightAwareAccessEnabled || !cfg.EnablePprof {
		t.Fatalf("booleans = fallback:%v access:%v pprof:%v", cfg.FlightAwareFallbackEnabled, cfg.FlightAwareAccessEnabled, cfg.EnablePprof)
	}
	if cfg.RealtimeAuthSecret != "shared-secret" ||
		cfg.AirportDirectoryBaseURL != "https://www.adsbao.dev" ||
		cfg.OpenAIPAPIKey != "openaip-secret" ||
		cfg.OpenAIPBaseURL != "https://openaip.example.test/api" {
		t.Fatalf("urls/secrets = %#v", cfg)
	}
	if cfg.BetterStackMetricsSourceToken != "metrics-source-token" ||
		cfg.BetterStackMetricsEndpoint != "https://metrics.example.test/metrics" ||
		cfg.BetterStackLogSourceToken != "logs-source-token" ||
		cfg.BetterStackLogsEndpoint != "https://logs.example.test" ||
		cfg.BetterStackServiceName != "adsbao-prod" ||
		cfg.MetricsReportInterval != 45*time.Second ||
		cfg.LogsReportInterval != 2*time.Second {
		t.Fatalf("better stack config = %#v", cfg)
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
		cfg.FlightAwareAccessEnabled ||
		cfg.RealtimeAuthSecret != "" ||
		cfg.AirportDirectoryBaseURL != "https://www.adsbao.dev" ||
		cfg.OpenAIPAPIKey != "" ||
		cfg.OpenAIPBaseURL != "https://api.core.openaip.net/api" ||
		cfg.EnablePprof ||
		cfg.BetterStackMetricsSourceToken != "" ||
		cfg.BetterStackMetricsEndpoint != "" ||
		cfg.BetterStackLogSourceToken != "" ||
		cfg.BetterStackLogsEndpoint != "" ||
		cfg.BetterStackServiceName != "adsbao-data-service" ||
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
