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
		"ENABLE_PPROF":                 "true",
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
		cfg.EnablePprof {
		t.Fatalf("defaults = %#v", cfg)
	}
}
