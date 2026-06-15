package config

import (
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Port                       int
	MinPollInterval            time.Duration
	MaxPollInterval            time.Duration
	MaxActiveChannels          int
	PollJitterRatio            float64
	MaxSocketSubscriptions     int
	AllowedWSOrigins           []string
	FlightAwareFallbackEnabled bool
	RealtimeAuthSecret         string
	AirportDirectoryBaseURL    string
	StaticDir                  string
	EnablePprof                bool
	NewRelicLicenseKey         string
	NewRelicAppName            string
	NewRelicMetricsEndpoint    string
	NewRelicLogsEndpoint       string
	MetricsReportInterval      time.Duration
	LogsReportInterval         time.Duration
}

type LookupFunc func(string) string

func FromEnv(lookup LookupFunc) Config {
	return Config{
		Port:                       intValue(lookup("PORT"), 8080),
		MinPollInterval:            durationMS(lookup("MIN_POLL_INTERVAL_MS"), time.Second),
		MaxPollInterval:            durationMS(lookup("MAX_POLL_INTERVAL_MS"), 30*time.Minute),
		MaxActiveChannels:          intValue(lookup("MAX_ACTIVE_CHANNELS"), 250),
		PollJitterRatio:            floatValue(lookup("POLL_JITTER_RATIO"), 0.1),
		MaxSocketSubscriptions:     intValue(lookup("MAX_SOCKET_SUBSCRIPTIONS"), 96),
		AllowedWSOrigins:           csv(lookup("ALLOWED_WS_ORIGINS")),
		FlightAwareFallbackEnabled: !falseString(lookup("FLIGHTAWARE_FALLBACK_ENABLED")),
		RealtimeAuthSecret:         strings.TrimSpace(lookup("ADSBAO_REALTIME_AUTH_SECRET")),
		AirportDirectoryBaseURL:    stringValue(lookup("AIRPORT_DIRECTORY_BASE_URL"), "https://www.adsbao.dev"),
		StaticDir:                  strings.TrimSpace(lookup("STATIC_DIR")),
		EnablePprof:                trueString(lookup("ENABLE_PPROF")),
		NewRelicLicenseKey:         strings.TrimSpace(lookup("NEW_RELIC_LICENSE_KEY")),
		NewRelicAppName:            stringValue(lookup("NEW_RELIC_APP_NAME"), "adsbao-data-service"),
		NewRelicMetricsEndpoint:    stringValue(lookup("NEW_RELIC_METRICS_ENDPOINT"), "https://metric-api.newrelic.com/metric/v1"),
		NewRelicLogsEndpoint:       stringValue(lookup("NEW_RELIC_LOGS_ENDPOINT"), "https://log-api.newrelic.com/log/v1"),
		MetricsReportInterval:      durationMS(lookup("METRICS_REPORT_INTERVAL_MS"), 30*time.Second),
		LogsReportInterval:         durationMS(lookup("LOGS_REPORT_INTERVAL_MS"), 5*time.Second),
	}
}

func intValue(raw string, fallback int) int {
	value, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil {
		return fallback
	}
	return value
}

func floatValue(raw string, fallback float64) float64 {
	value, err := strconv.ParseFloat(strings.TrimSpace(raw), 64)
	if err != nil {
		return fallback
	}
	return value
}

func durationMS(raw string, fallback time.Duration) time.Duration {
	value, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil {
		return fallback
	}
	return time.Duration(value) * time.Millisecond
}

func stringValue(raw, fallback string) string {
	value := strings.TrimSpace(raw)
	if value == "" {
		return fallback
	}
	return value
}

func csv(raw string) []string {
	var out []string
	for _, item := range strings.Split(raw, ",") {
		item = strings.TrimSpace(item)
		if item != "" {
			out = append(out, item)
		}
	}
	return out
}

func falseString(raw string) bool {
	return strings.ToLower(strings.TrimSpace(raw)) == "false"
}

func trueString(raw string) bool {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "1", "true", "yes":
		return true
	default:
		return false
	}
}
