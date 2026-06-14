package adsb

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/adsbao/adsbao/services/data-service-go/internal/realtime"
)

const (
	defaultTimeout = 2800 * time.Millisecond
	maxBodyBytes   = 2 * 1024 * 1024
	userAgent      = "ADSBao data-service/1.0 (+https://adsbao.dev)"
)

type URLBuilder func(string) string

type PositionURLBuilder func(lat, lon float64, distNM int) string

type Provider struct {
	ID          string
	PositionURL PositionURLBuilder
	CallsignURL URLBuilder
	AircraftURL URLBuilder
	Normalize   func(map[string]any) map[string]any
}

type Options struct {
	HTTPClient          *http.Client
	Providers           []Provider
	Timeout             time.Duration
	MaxBytes            int64
	FlightAwareFallback func(context.Context, string, realtime.MetricsSink) (FallbackResult, error)
}

type Client struct {
	httpClient          *http.Client
	providers           []Provider
	timeout             time.Duration
	maxBytes            int64
	flightAwareFallback func(context.Context, string, realtime.MetricsSink) (FallbackResult, error)
}

type FallbackResult struct {
	OK            bool
	HasPosition   bool
	ErrorType     string
	UpstreamStatus any
	FetchedAt     string
	Position      map[string]any
	Metadata      map[string]any
	Raw           map[string]any
}

type providerResult struct {
	provider Provider
	payload  map[string]any
	attempts []string
}

type providerError struct {
	message string
	status  any
}

func (e providerError) Error() string { return e.message }

func NewClient(options Options) *Client {
	providers := options.Providers
	if len(providers) == 0 {
		providers = DefaultProviders()
	}
	timeout := options.Timeout
	if timeout <= 0 {
		timeout = defaultTimeout
	}
	maxBytes := options.MaxBytes
	if maxBytes <= 0 {
		maxBytes = maxBodyBytes
	}
	httpClient := options.HTTPClient
	if httpClient == nil {
		httpClient = &http.Client{}
	}
	return &Client{
		httpClient:          httpClient,
		providers:           providers,
		timeout:             timeout,
		maxBytes:            maxBytes,
		flightAwareFallback: options.FlightAwareFallback,
	}
}

func DefaultProviders() []Provider {
	return []Provider{
		{
			ID: "adsb.lol",
			PositionURL: func(lat, lon float64, distNM int) string {
				return fmt.Sprintf("https://api.adsb.lol/v2/lat/%s/lon/%s/dist/%d", pathFloat(lat), pathFloat(lon), distNM)
			},
			CallsignURL: func(callsign string) string { return "https://api.adsb.lol/v2/callsign/" + url.PathEscape(callsign) },
			AircraftURL: func(hex string) string { return "https://api.adsb.lol/v2/hex/" + url.PathEscape(hex) },
		},
		{
			ID: "airplanes.live",
			PositionURL: func(lat, lon float64, distNM int) string {
				return fmt.Sprintf("https://api.airplanes.live/v2/point/%s/%s/%d", pathFloat(lat), pathFloat(lon), distNM)
			},
			CallsignURL: func(callsign string) string { return "https://api.airplanes.live/v2/callsign/" + url.PathEscape(callsign) },
			AircraftURL: func(hex string) string { return "https://api.airplanes.live/v2/hex/" + url.PathEscape(hex) },
		},
		{
			ID: "adsb.fi",
			PositionURL: func(lat, lon float64, distNM int) string {
				return fmt.Sprintf("https://opendata.adsb.fi/api/v2/lat/%s/lon/%s/dist/%d", pathFloat(lat), pathFloat(lon), distNM)
			},
			CallsignURL: func(callsign string) string { return "https://opendata.adsb.fi/api/v2/callsign/" + url.PathEscape(callsign) },
			AircraftURL: func(hex string) string { return "https://opendata.adsb.fi/api/v2/hex/" + url.PathEscape(hex) },
			Normalize: func(payload map[string]any) map[string]any {
				if aircraft, ok := payload["aircraft"].([]any); ok {
					payload["ac"] = aircraft
				}
				return payload
			},
		},
	}
}

func (c *Client) Fetch(ctx context.Context, input realtime.FetchInput) (realtime.Event, error) {
	var (
		result providerResult
		err    error
	)
	switch input.Target.Kind {
	case "positions":
		result, err = c.fetchPositions(ctx, input)
	case "callsign":
		if input.Target.FlightAwareFallback {
			result, err = c.fetchCallsignWithFlightAware(ctx, input)
		} else {
			result, err = c.fetchCallsign(ctx, input)
		}
	case "aircraft":
		result, err = c.fetchAircraft(ctx, input)
	default:
		return realtime.Event{}, fmt.Errorf("unsupported ADS-B target kind %q", input.Target.Kind)
	}
	if err != nil {
		return realtime.Event{}, err
	}
	return eventFromPayload(input.Channel, result), nil
}

func (c *Client) fetchPositions(ctx context.Context, input realtime.FetchInput) (providerResult, error) {
	return c.fetchWithFallback(ctx, input, "positions", false, func(provider Provider) (string, bool) {
		if provider.PositionURL == nil {
			return "", false
		}
		return provider.PositionURL(input.Target.Lat, input.Target.Lon, input.Target.DistNM), true
	})
}

func (c *Client) fetchCallsign(ctx context.Context, input realtime.FetchInput) (providerResult, error) {
	return c.fetchWithFallback(ctx, input, "callsign", true, func(provider Provider) (string, bool) {
		if provider.CallsignURL == nil {
			return "", false
		}
		return provider.CallsignURL(input.Target.Callsign), true
	})
}

func (c *Client) fetchAircraft(ctx context.Context, input realtime.FetchInput) (providerResult, error) {
	return c.fetchWithFallback(ctx, input, "aircraft", true, func(provider Provider) (string, bool) {
		if provider.AircraftURL == nil {
			return "", false
		}
		return provider.AircraftURL(input.Target.Hex), true
	})
}

func (c *Client) fetchCallsignWithFlightAware(ctx context.Context, input realtime.FetchInput) (providerResult, error) {
	adsbResult, err := c.fetchCallsign(ctx, input)
	if err != nil || !isEmptyAircraftPayload(adsbResult.payload) || c.flightAwareFallback == nil {
		return adsbResult, err
	}
	fallback, fallbackErr := c.flightAwareFallback(ctx, input.Target.Callsign, input.Metrics)
	attempts := append([]string{}, adsbResult.attempts...)
	attempts = append(attempts, "flightaware:"+flightAwareAttemptStatus(fallback, fallbackErr))
	aircraft := normalizeFlightAwareAircraft(input.Target.Callsign, fallback)
	trackingState := flightAwareTrackingState(fallback)
	if fallbackErr != nil || !fallback.OK || !fallback.HasPosition || aircraft == nil {
		payload := cloneMap(adsbResult.payload)
		payload["source"] = adsbResult.provider.ID
		payload["callsign"] = input.Target.Callsign
		payload["flightAwareFallback"] = fallbackMap(fallback)
		payload["trackingState"] = trackingState
		return providerResult{provider: adsbResult.provider, payload: payload, attempts: attempts}, nil
	}
	payload := map[string]any{
		"ac":                  []any{aircraft},
		"source":              "flightaware",
		"callsign":            input.Target.Callsign,
		"now":                 float64(time.Now().UnixMilli()) / 1000,
		"fetchedAt":           fallback.FetchedAt,
		"flightAwareFallback": fallbackMap(fallback),
		"trackingState":       trackingState,
	}
	return providerResult{provider: Provider{ID: "flightaware"}, payload: payload, attempts: attempts}, nil
}

func (c *Client) fetchWithFallback(ctx context.Context, input realtime.FetchInput, endpoint string, retryEmpty bool, buildURL func(Provider) (string, bool)) (providerResult, error) {
	var attempts []string
	var lastRetryable *providerResult
	var failures []error
	for _, provider := range c.providers {
		requestURL, ok := buildURL(provider)
		if !ok {
			continue
		}
		payload, err := c.fetchProviderPayload(ctx, input, provider, endpoint, requestURL)
		if err != nil {
			status := "ERR"
			var providerErr providerError
			if errors.As(err, &providerErr) {
				status = fmt.Sprint(providerErr.status)
			}
			attempts = append(attempts, provider.ID+":"+status)
			failures = append(failures, err)
			continue
		}
		attempts = append(attempts, provider.ID+":200")
		result := providerResult{provider: provider, payload: payload, attempts: append([]string{}, attempts...)}
		if retryEmpty && isEmptyAircraftPayload(payload) {
			lastRetryable = &result
			continue
		}
		return result, nil
	}
	if lastRetryable != nil {
		lastRetryable.attempts = attempts
		return *lastRetryable, nil
	}
	return providerResult{}, fmt.Errorf("all ADS-B providers failed: %v", failures)
}

func (c *Client) fetchProviderPayload(ctx context.Context, input realtime.FetchInput, provider Provider, endpoint, requestURL string) (map[string]any, error) {
	requestCtx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()
	started := time.Now()
	status := any(nil)
	req, err := http.NewRequestWithContext(requestCtx, http.MethodGet, requestURL, nil)
	if err != nil {
		return nil, providerError{message: err.Error(), status: "ERR"}
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", userAgent)
	resp, err := c.httpClient.Do(req)
	if err != nil {
		c.recordExternal(input, provider.ID, endpoint, "error", "ERR", started)
		return nil, providerError{message: err.Error(), status: "ERR"}
	}
	defer resp.Body.Close()
	status = resp.StatusCode
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		c.recordExternal(input, provider.ID, endpoint, "error", status, started)
		return nil, providerError{message: fmt.Sprintf("HTTP %d", resp.StatusCode), status: status}
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, c.maxBytes+1))
	if err != nil {
		c.recordExternal(input, provider.ID, endpoint, "error", "ERR", started)
		return nil, providerError{message: err.Error(), status: "ERR"}
	}
	if int64(len(body)) > c.maxBytes {
		c.recordExternal(input, provider.ID, endpoint, "error", "SIZE", started)
		return nil, providerError{message: "ADS-B response too large", status: "SIZE"}
	}
	var payload map[string]any
	decoder := json.NewDecoder(bytes.NewReader(body))
	if err := decoder.Decode(&payload); err != nil {
		c.recordExternal(input, provider.ID, endpoint, "error", "PARSE", started)
		return nil, providerError{message: "Invalid ADS-B JSON", status: "PARSE"}
	}
	if provider.Normalize != nil {
		payload = provider.Normalize(payload)
	}
	if _, ok := payload["ac"].([]any); !ok {
		c.recordExternal(input, provider.ID, endpoint, "error", "SHAPE", started)
		return nil, providerError{message: "Invalid aircraft payload", status: "SHAPE"}
	}
	c.recordExternal(input, provider.ID, endpoint, "success", status, started)
	return payload, nil
}

func (c *Client) recordExternal(input realtime.FetchInput, provider, endpoint, result string, status any, started time.Time) {
	if input.Metrics == nil {
		return
	}
	input.Metrics.RecordExternalRequest(realtime.ExternalRequestMetricInput{
		Provider:   provider,
		Endpoint:   endpoint,
		Result:     result,
		Status:     status,
		DurationMS: time.Since(started).Milliseconds(),
	})
}

func eventFromPayload(channel string, result providerResult) realtime.Event {
	data := cloneMap(result.payload)
	data["source"] = result.provider.ID
	data["attempts"] = result.attempts
	return realtime.Event{
		Type:      "aircraft:update",
		Channel:   channel,
		Source:    result.provider.ID,
		FetchedAt: time.Now().UTC().Format(time.RFC3339Nano),
		Stale:     false,
		Data:      data,
	}
}

func isEmptyAircraftPayload(payload map[string]any) bool {
	ac, ok := payload["ac"].([]any)
	return !ok || len(ac) == 0
}

func cloneMap(input map[string]any) map[string]any {
	out := make(map[string]any, len(input))
	for key, value := range input {
		out[key] = value
	}
	return out
}

func pathFloat(value float64) string {
	return url.PathEscape(strconvFloat(value))
}

func strconvFloat(value float64) string {
	return strings.TrimRight(strings.TrimRight(fmt.Sprintf("%.4f", value), "0"), ".")
}

func flightAwareAttemptStatus(fallback FallbackResult, err error) string {
	if err == nil && fallback.OK {
		return "200"
	}
	if fallback.UpstreamStatus != nil {
		return fmt.Sprint(fallback.UpstreamStatus)
	}
	if fallback.ErrorType != "" {
		return fallback.ErrorType
	}
	return "ERR"
}

func normalizeFlightAwareAircraft(callsign string, fallback FallbackResult) map[string]any {
	pos := fallback.Position
	if pos == nil {
		return nil
	}
	lat, latOK := number(pos["lat"])
	lon, lonOK := number(pos["lon"])
	if !latOK || !lonOK {
		return nil
	}
	normalizedCallsign := strings.ToUpper(strings.TrimSpace(fmt.Sprint(firstNonEmpty(pos["callsign"], callsign))))
	aircraft := map[string]any{
		"lat":                    lat,
		"lon":                    lon,
		"seen":                   0,
		"type":                   "flightaware",
		"flight_position_source": "flightaware",
	}
	if hex := strings.TrimSpace(fmt.Sprint(pos["hex"])); hex != "" {
		aircraft["hex"] = strings.ToLower(hex)
	}
	if normalizedCallsign != "" {
		aircraft["callsign"] = normalizedCallsign
		aircraft["flight"] = fmt.Sprintf("%-8s ", normalizedCallsign)
	}
	copyIfPresent(aircraft, "alt_baro", pos["altitudeFt"])
	copyIfPresent(aircraft, "gs", pos["groundSpeedKt"])
	copyIfPresent(aircraft, "track", firstNonEmpty(pos["trackDeg"], pos["headingDeg"]))
	for _, key := range []string{"flightAwareUrl", "origin", "destination", "route", "status", "terminal", "quality"} {
		copyIfPresent(aircraft, key, pos[key])
	}
	return aircraft
}

func flightAwareTrackingState(fallback FallbackResult) map[string]any {
	if terminalBool(fallback.Position, "terminal") || terminalQuality(fallback.Position) || terminalBool(fallback.Metadata, "terminal") {
		return map[string]any{"status": "flightaware_terminal", "source": "flightaware", "fetchedAt": fallback.FetchedAt, "sourceUpdatedAt": nestedQualityValue(fallback.Position, "sourceUpdatedAt")}
	}
	if fallback.OK && fallback.HasPosition {
		return map[string]any{"status": "flightaware_active", "source": "flightaware", "fetchedAt": fallback.FetchedAt, "sourceUpdatedAt": nestedQualityValue(fallback.Position, "sourceUpdatedAt")}
	}
	return map[string]any{"status": "missing", "source": "flightaware", "fetchedAt": fallback.FetchedAt, "errorType": fallback.ErrorType}
}

func fallbackMap(fallback FallbackResult) map[string]any {
	if fallback.Raw != nil {
		return fallback.Raw
	}
	out := map[string]any{
		"ok":          fallback.OK,
		"hasPosition": fallback.HasPosition,
	}
	copyIfPresent(out, "errorType", fallback.ErrorType)
	copyIfPresent(out, "upstreamStatus", fallback.UpstreamStatus)
	copyIfPresent(out, "fetchedAt", fallback.FetchedAt)
	copyIfPresent(out, "metadata", fallback.Metadata)
	copyIfPresent(out, "position", fallback.Position)
	return out
}

func copyIfPresent(target map[string]any, key string, value any) {
	if value == nil || value == "" {
		return
	}
	target[key] = value
}

func firstNonEmpty(values ...any) any {
	for _, value := range values {
		if value != nil && fmt.Sprint(value) != "" {
			return value
		}
	}
	return nil
}

func number(value any) (float64, bool) {
	switch typed := value.(type) {
	case float64:
		return typed, true
	case int:
		return float64(typed), true
	case json.Number:
		n, err := typed.Float64()
		return n, err == nil
	case string:
		var n float64
		_, err := fmt.Sscanf(typed, "%f", &n)
		return n, err == nil
	default:
		return 0, false
	}
}

func terminalBool(record map[string]any, key string) bool {
	if record == nil {
		return false
	}
	value, _ := record[key].(bool)
	return value
}

func terminalQuality(record map[string]any) bool {
	if record == nil {
		return false
	}
	quality, _ := record["quality"].(map[string]any)
	return terminalBool(quality, "terminal")
}

func nestedQualityValue(record map[string]any, key string) any {
	if record == nil {
		return nil
	}
	quality, _ := record["quality"].(map[string]any)
	if quality == nil {
		return nil
	}
	return quality[key]
}
