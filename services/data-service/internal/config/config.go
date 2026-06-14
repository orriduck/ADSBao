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
	EnablePprof                bool
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
		EnablePprof:                trueString(lookup("ENABLE_PPROF")),
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
