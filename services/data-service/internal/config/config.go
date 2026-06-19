package config

import (
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Port                          int
	MinPollInterval               time.Duration
	MaxPollInterval               time.Duration
	MaxActiveChannels             int
	PollJitterRatio               float64
	MaxSocketSubscriptions        int
	AllowedWSOrigins              []string
	FlightAwareFallbackEnabled    bool
	FlightAwareAccessEnabled      bool
	FlightAwareServiceBaseURL     string
	FlightAwareServiceToken       string
	RealtimeAuthSecret            string
	OpenAIPAPIKey                 string
	OpenAIPBaseURL                string
	StaticDir                     string
	EnablePprof                   bool
	BetterStackMetricsSourceToken string
	BetterStackMetricsEndpoint    string
	BetterStackLogSourceToken     string
	BetterStackLogsEndpoint       string
	BetterStackServiceName        string
	MetricsReportInterval         time.Duration
	LogsReportInterval            time.Duration
	DatabaseURL                   string
	ClerkSecretKey                string
	ClerkJWKSURL                  string
	ClerkAPIBaseURL               string
	FeatureFlagsEnvironment       string
}

type LookupFunc func(string) string

func FromEnv(lookup LookupFunc) Config {
	return Config{
		Port:                          intValue(lookup("PORT"), 8080),
		MinPollInterval:               durationMS(lookup("MIN_POLL_INTERVAL_MS"), time.Second),
		MaxPollInterval:               durationMS(lookup("MAX_POLL_INTERVAL_MS"), 30*time.Minute),
		MaxActiveChannels:             intValue(lookup("MAX_ACTIVE_CHANNELS"), 250),
		PollJitterRatio:               floatValue(lookup("POLL_JITTER_RATIO"), 0.1),
		MaxSocketSubscriptions:        intValue(lookup("MAX_SOCKET_SUBSCRIPTIONS"), 96),
		AllowedWSOrigins:              csv(lookup("ALLOWED_WS_ORIGINS")),
		FlightAwareFallbackEnabled:    !falseString(lookup("FLIGHTAWARE_FALLBACK_ENABLED")),
		FlightAwareAccessEnabled:      trueString(lookup("FLIGHTAWARE_ACCESS_ENABLED")),
		FlightAwareServiceBaseURL:     strings.TrimRight(strings.TrimSpace(lookup("FLIGHTAWARE_SERVICE_BASE_URL")), "/"),
		FlightAwareServiceToken:       strings.TrimSpace(lookup("FLIGHTAWARE_SERVICE_TOKEN")),
		RealtimeAuthSecret:            strings.TrimSpace(lookup("ADSBAO_REALTIME_AUTH_SECRET")),
		OpenAIPAPIKey:                 strings.TrimSpace(lookup("OPENAIP_API_KEY")),
		OpenAIPBaseURL:                stringValue(lookup("OPENAIP_BASE_URL"), "https://api.core.openaip.net/api"),
		StaticDir:                     strings.TrimSpace(lookup("STATIC_DIR")),
		EnablePprof:                   trueString(lookup("ENABLE_PPROF")),
		BetterStackMetricsSourceToken: strings.TrimSpace(lookup("BETTERSTACK_METRICS_SOURCE_TOKEN")),
		BetterStackMetricsEndpoint:    strings.TrimSpace(lookup("BETTERSTACK_METRICS_ENDPOINT")),
		BetterStackLogSourceToken:     strings.TrimSpace(lookup("BETTERSTACK_LOG_SOURCE_TOKEN")),
		BetterStackLogsEndpoint:       strings.TrimSpace(lookup("BETTERSTACK_LOGS_ENDPOINT")),
		BetterStackServiceName:        stringValue(lookup("BETTERSTACK_SERVICE_NAME"), "adsbao-data-service"),
		MetricsReportInterval:         durationMS(lookup("METRICS_REPORT_INTERVAL_MS"), 30*time.Second),
		LogsReportInterval:            durationMS(lookup("LOGS_REPORT_INTERVAL_MS"), 5*time.Second),
		DatabaseURL:                   strings.TrimSpace(firstNonEmpty(lookup("DATABASE_URL"), lookup("ADSBAO_DATABASE_URL"))),
		ClerkSecretKey:                strings.TrimSpace(lookup("CLERK_SECRET_KEY")),
		ClerkJWKSURL:                  strings.TrimSpace(lookup("CLERK_JWKS_URL")),
		ClerkAPIBaseURL:               stringValue(lookup("CLERK_API_BASE_URL"), "https://api.clerk.com"),
		FeatureFlagsEnvironment:       featureFlagsEnvironment(lookup("FEATURE_FLAGS_ENV"), lookup("RAILWAY_ENVIRONMENT_NAME")),
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

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func featureFlagsEnvironment(raw, railwayEnvironment string) string {
	value := strings.ToLower(strings.TrimSpace(raw))
	if value == "" {
		value = strings.ToLower(strings.TrimSpace(railwayEnvironment))
	}
	switch value {
	case "production", "preview", "local":
		return value
	case "development":
		return "local"
	default:
		return "local"
	}
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
