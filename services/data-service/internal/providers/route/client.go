package route

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/adsbao/adsbao/services/data-service/internal/realtime"
)

const (
	defaultADSBDBBaseURL = "https://api.adsbdb.com/v0"
	defaultTimeout       = 9 * time.Second
	defaultMaxBytes      = 2 * 1024 * 1024
	defaultQueueInterval = 500 * time.Millisecond
	userAgent            = "ADSBao data-service/1.0 (+https://adsbao.dev)"
)

// Cache is a best-effort persistent route cache keyed by callsign+provider.
// A nil Cache disables caching entirely.
type Cache interface {
	GetRoute(ctx context.Context, callsign, provider string) (json.RawMessage, time.Duration, bool)
	PutRoute(ctx context.Context, callsign, provider string, route json.RawMessage)
	TTL() time.Duration
}

type Options struct {
	HTTPClient              *http.Client
	ADSBDBBaseURL           string
	FlightAwareRouteFetcher func(context.Context, string, realtime.MetricsSink) (map[string]any, error)
	Timeout                 time.Duration
	MaxBytes                int64
	QueueInterval           time.Duration
	DisableQueue            bool
	Cache                   Cache
}

type Client struct {
	httpClient              *http.Client
	adsbdbBaseURL           string
	flightAwareRouteFetcher func(context.Context, string, realtime.MetricsSink) (map[string]any, error)
	timeout                 time.Duration
	maxBytes                int64
	queueInterval           time.Duration
	cache                   Cache
	mu                      sync.Mutex
	lastStarted             time.Time
}

func NewClient(options Options) *Client {
	httpClient := options.HTTPClient
	if httpClient == nil {
		httpClient = &http.Client{}
	}
	adsbdbBase := strings.TrimRight(options.ADSBDBBaseURL, "/")
	if adsbdbBase == "" {
		adsbdbBase = defaultADSBDBBaseURL
	}
	timeout := options.Timeout
	if timeout <= 0 {
		timeout = defaultTimeout
	}
	maxBytes := options.MaxBytes
	if maxBytes <= 0 {
		maxBytes = defaultMaxBytes
	}
	queueInterval := options.QueueInterval
	if queueInterval == 0 && !options.DisableQueue {
		queueInterval = defaultQueueInterval
	}
	return &Client{
		httpClient:              httpClient,
		adsbdbBaseURL:           adsbdbBase,
		flightAwareRouteFetcher: options.FlightAwareRouteFetcher,
		timeout:                 timeout,
		maxBytes:                maxBytes,
		queueInterval:           queueInterval,
		cache:                   options.Cache,
	}
}

func (c *Client) Fetch(ctx context.Context, input realtime.FetchInput) (realtime.Event, error) {
	if input.Target.Kind != "route" {
		return realtime.Event{}, errors.New("Expected route polling target")
	}
	provider := "adsbdb"
	if input.Target.RouteProvider == "flightaware" {
		provider = "flightaware"
	}
	callsign := input.Target.Callsign

	// Serve a fresh cached route without touching the upstream (also skips the
	// adsbdb rate-limit queue). Provider is part of the key, so a FlightAware
	// lookup never reads an adsbdb row and vice versa.
	if c.cache != nil && callsign != "" {
		if raw, age, ok := c.cache.GetRoute(ctx, callsign, provider); ok && age < c.cache.TTL() {
			return cachedRouteEvent(input.Channel, provider, callsign, raw), nil
		}
	}

	event, err := c.fetchUpstream(ctx, input, provider)
	if err != nil {
		// Upstream failed — fall back to the last-known route if we have one
		// (stale-while-revalidate), rather than surfacing an empty/error route.
		if c.cache != nil && callsign != "" {
			if raw, _, ok := c.cache.GetRoute(ctx, callsign, provider); ok {
				return cachedRouteEvent(input.Channel, provider, callsign, raw), nil
			}
		}
		return event, err
	}

	// Cache only successful lookups that actually resolved a route.
	if c.cache != nil && callsign != "" {
		if raw := routeJSONFromEvent(event); raw != nil {
			c.cache.PutRoute(ctx, callsign, provider, raw)
		}
	}
	return event, nil
}

func (c *Client) fetchUpstream(ctx context.Context, input realtime.FetchInput, provider string) (realtime.Event, error) {
	if provider == "flightaware" {
		return c.fetchFlightAware(ctx, input)
	}
	return c.fetchADSBDB(ctx, input)
}

func cachedRouteEvent(channel, source, callsign string, raw json.RawMessage) realtime.Event {
	var route map[string]any
	if len(raw) > 0 {
		_ = json.Unmarshal(raw, &route)
	}
	return realtime.Event{
		Type:      "route:update",
		Channel:   channel,
		Source:    source,
		FetchedAt: time.Now().UTC().Format(time.RFC3339Nano),
		Stale:     false,
		Data: map[string]any{
			"callsign": callsign,
			"route":    route,
		},
	}
}

func routeJSONFromEvent(event realtime.Event) json.RawMessage {
	data, ok := event.Data.(map[string]any)
	if !ok {
		return nil
	}
	route, ok := data["route"].(map[string]any)
	if !ok || route == nil {
		return nil
	}
	raw, err := json.Marshal(route)
	if err != nil {
		return nil
	}
	return raw
}

func (c *Client) fetchADSBDB(ctx context.Context, input realtime.FetchInput) (realtime.Event, error) {
	if err := c.waitForTurn(ctx); err != nil {
		return realtime.Event{}, err
	}
	requestURL := c.adsbdbBaseURL + "/callsign/" + url.PathEscape(input.Target.Callsign)
	started := time.Now()
	status := any(nil)
	resp, cancel, err := c.do(ctx, requestURL, "application/json", userAgent)
	if err != nil {
		c.recordExternal(input, "adsbdb", "error", "ERR", requestURL, err.Error(), started)
		return realtime.Event{}, err
	}
	defer cancel()
	defer resp.Body.Close()
	status = resp.StatusCode
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		if resp.StatusCode != http.StatusNotFound {
			message := fmt.Sprintf("HTTP %d", resp.StatusCode)
			c.recordExternal(input, "adsbdb", "error", status, requestURL, message, started)
			return realtime.Event{}, fmt.Errorf("adsbdb route HTTP %d", resp.StatusCode)
		}
		c.recordExternal(input, "adsbdb", "success", status, requestURL, "", started)
		return routeEvent(input.Channel, "adsbdb", input.Target.Callsign, nil), nil
	}
	body, err := c.readBody(resp)
	if err != nil {
		c.recordExternal(input, "adsbdb", "error", "ERR", requestURL, err.Error(), started)
		return realtime.Event{}, err
	}
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		c.recordExternal(input, "adsbdb", "error", "PARSE", requestURL, "Invalid ADSBDB JSON", started)
		return realtime.Event{}, err
	}
	c.recordExternal(input, "adsbdb", "success", status, requestURL, "", started)
	return routeEvent(input.Channel, "adsbdb", input.Target.Callsign, normalizeADSBDBRoute(input.Target.Callsign, payload)), nil
}

func (c *Client) fetchFlightAware(ctx context.Context, input realtime.FetchInput) (realtime.Event, error) {
	if c.flightAwareRouteFetcher == nil {
		return routeEvent(input.Channel, "flightaware", input.Target.Callsign, nil), nil
	}
	route, err := c.flightAwareRouteFetcher(ctx, input.Target.Callsign, input.Metrics)
	if err != nil {
		return realtime.Event{}, err
	}
	return routeEvent(input.Channel, "flightaware", input.Target.Callsign, route), nil
}

func (c *Client) do(ctx context.Context, requestURL, accept, ua string) (*http.Response, context.CancelFunc, error) {
	requestCtx, cancel := context.WithTimeout(ctx, c.timeout)
	req, err := http.NewRequestWithContext(requestCtx, http.MethodGet, requestURL, nil)
	if err != nil {
		cancel()
		return nil, nil, err
	}
	req.Header.Set("Accept", accept)
	req.Header.Set("User-Agent", ua)
	resp, err := c.httpClient.Do(req)
	if err != nil {
		cancel()
		return nil, nil, err
	}
	return resp, cancel, nil
}

func (c *Client) readBody(resp *http.Response) ([]byte, error) {
	body, err := io.ReadAll(io.LimitReader(resp.Body, c.maxBytes+1))
	if err != nil {
		return nil, err
	}
	if int64(len(body)) > c.maxBytes {
		return nil, errors.New("Route response too large")
	}
	return body, nil
}

func (c *Client) waitForTurn(ctx context.Context) error {
	if c.queueInterval <= 0 {
		return nil
	}
	c.mu.Lock()
	wait := c.queueInterval - time.Since(c.lastStarted)
	if wait < 0 {
		wait = 0
	}
	c.lastStarted = time.Now().Add(wait)
	c.mu.Unlock()
	if wait == 0 {
		return nil
	}
	timer := time.NewTimer(wait)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return nil
	}
}

func (c *Client) recordExternal(input realtime.FetchInput, provider, result string, status any, requestURL, errorText string, started time.Time) {
	if input.Metrics == nil {
		return
	}
	input.Metrics.RecordExternalRequest(realtime.ExternalRequestMetricInput{
		Provider:   provider,
		Endpoint:   "route",
		Result:     result,
		Status:     status,
		URL:        requestURL,
		Error:      errorText,
		DurationMS: time.Since(started).Milliseconds(),
	})
}

func routeEvent(channel, source, callsign string, route map[string]any) realtime.Event {
	return realtime.Event{
		Type:      "route:update",
		Channel:   channel,
		Source:    source,
		FetchedAt: time.Now().UTC().Format(time.RFC3339Nano),
		Stale:     false,
		Data: map[string]any{
			"callsign": callsign,
			"route":    compactRoutePayload(route),
		},
	}
}

func compactRoutePayload(route map[string]any) map[string]any {
	if route == nil {
		return nil
	}
	origin := compactAirportPayload(asMap(route["origin"]))
	destination := compactAirportPayload(asMap(route["destination"]))
	if origin == nil || destination == nil {
		return nil
	}
	airlineRaw := asMap(route["airline"])
	out := map[string]any{
		"origin":      origin,
		"destination": destination,
	}
	if callsign := firstNonEmpty(upper(route["callsign"]), upper(route["callsignIcao"]), upper(route["callsign_icao"])); callsign != "" {
		out["callsign"] = callsign
	}
	if callsignICAO := firstNonEmpty(upper(route["callsignIcao"]), upper(route["callsign_icao"]), upper(route["callsign"])); callsignICAO != "" {
		out["callsignIcao"] = callsignICAO
	}
	if callsignIata := firstNonEmpty(upper(route["callsignIata"]), upper(route["callsign_iata"])); callsignIata != "" {
		out["callsignIata"] = callsignIata
	}
	if airlineICAO := firstNonEmpty(code(route["airlineIcao"], 2, 3), code(airlineRaw["icao"], 2, 3)); airlineICAO != "" {
		out["airlineIcao"] = airlineICAO
	}
	if airlineIATA := firstNonEmpty(code(route["airlineIata"], 2, 2), code(airlineRaw["iata"], 2, 2)); airlineIATA != "" {
		out["airlineIata"] = airlineIATA
	}
	if routeCodes := compactRouteCodes(asMap(route["route"])); routeCodes != nil {
		out["route"] = routeCodes
	}
	if source := clean(route["source"]); source != "" {
		out["source"] = source
	}
	if confidence := clean(route["confidence"]); confidence != "" {
		out["confidence"] = confidence
	}
	for _, key := range []string{"temporary", "displaySuffix", "expiresAt", "feedbackReason"} {
		if value, ok := route[key]; ok && value != nil {
			if text, ok := value.(string); ok && strings.TrimSpace(text) == "" {
				continue
			}
			out[key] = value
		}
	}
	return out
}

func compactAirportPayload(airport map[string]any) map[string]any {
	if airport == nil {
		return nil
	}
	icao := code(firstNonEmpty(airport["icao"], airport["icao_code"]), 3, 4)
	iata := code(firstNonEmpty(airport["iata"], airport["iata_code"]), 3, 3)
	lat, latOK := number(firstNonEmpty(airport["lat"], airport["latitude"]))
	lon, lonOK := number(firstNonEmpty(airport["lon"], airport["longitude"]))
	if icao == "" || !latOK || !lonOK {
		return nil
	}
	out := map[string]any{
		"icao": icao,
		"lat":  lat,
		"lon":  lon,
	}
	if iata != "" {
		out["iata"] = iata
	}
	return out
}

func compactRouteCodes(route map[string]any) map[string]any {
	out := map[string]any{}
	if icao := upper(route["icao"]); icao != "" {
		out["icao"] = icao
	}
	if iata := upper(route["iata"]); iata != "" {
		out["iata"] = iata
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func normalizeADSBDBRoute(callsign string, payload map[string]any) map[string]any {
	response, _ := payload["response"].(map[string]any)
	raw, _ := response["flightroute"].(map[string]any)
	if raw == nil {
		return nil
	}
	normalizedCallsign := firstNonEmpty(upper(raw["callsign"]), upper(callsign))
	origin := normalizeAirport(asMap(raw["origin"]))
	destination := normalizeAirport(asMap(raw["destination"]))
	if normalizedCallsign == "" || origin == nil || destination == nil {
		return nil
	}
	airlineRaw := asMap(raw["airline"])
	routeIATA := ""
	if str(origin["iata"]) != "" && str(destination["iata"]) != "" {
		routeIATA = str(origin["iata"]) + "-" + str(destination["iata"])
	}
	airlineICAO := code(airlineRaw["icao"], 2, 3)
	if airlineICAO == "" && len(normalizedCallsign) >= 3 {
		airlineICAO = normalizedCallsign[:3]
	}
	return map[string]any{
		"callsign":     normalizedCallsign,
		"callsignIcao": firstNonEmpty(upper(raw["callsign_icao"]), normalizedCallsign),
		"callsignIata": upper(raw["callsign_iata"]),
		"number":       clean(raw["number"]),
		"airline": map[string]any{
			"icao":     airlineICAO,
			"iata":     code(airlineRaw["iata"], 2, 2),
			"name":     clean(airlineRaw["name"]),
			"callsign": "",
			"iconUrl":  "",
		},
		"origin":      origin,
		"destination": destination,
		"route": map[string]any{
			"icao": str(origin["icao"]) + "-" + str(destination["icao"]),
			"iata": routeIATA,
		},
		"airports":   []any{origin, destination},
		"source":     "adsbdb",
		"confidence": "reference-data",
	}
}

func normalizeAirport(raw map[string]any) map[string]any {
	if raw == nil {
		return nil
	}
	icao := firstNonEmpty(code(raw["icao_code"], 3, 4), code(raw["icao"], 3, 4))
	iata := firstNonEmpty(code(raw["iata_code"], 3, 3), code(raw["iata"], 3, 3))
	lat, latOK := number(firstNonEmpty(raw["latitude"], raw["lat"]))
	lon, lonOK := number(firstNonEmpty(raw["longitude"], raw["lon"]))
	if icao == "" || !latOK || !lonOK {
		return nil
	}
	return map[string]any{
		"icao":         icao,
		"iata":         iata,
		"name":         clean(raw["name"]),
		"municipality": clean(firstNonEmpty(raw["municipality"], raw["city"])),
		"country":      upper(firstNonEmpty(raw["country_iso_name"], raw["country"])),
		"lat":          lat,
		"lon":          lon,
	}
}

func asMap(value any) map[string]any {
	if out, ok := value.(map[string]any); ok {
		return out
	}
	return nil
}

func clean(value any) string {
	return strings.TrimSpace(fmt.Sprint(value))
}

func upper(value any) string {
	return strings.ToUpper(clean(value))
}

func code(value any, minLen, maxLen int) string {
	next := upper(value)
	if len(next) < minLen || len(next) > maxLen {
		return ""
	}
	for _, r := range next {
		if (r < 'A' || r > 'Z') && (r < '0' || r > '9') {
			return ""
		}
	}
	return next
}

func str(value any) string {
	if value == nil {
		return ""
	}
	return fmt.Sprint(value)
}

func firstNonEmpty(values ...any) string {
	for _, value := range values {
		if value == nil {
			continue
		}
		text := clean(value)
		if text != "" && text != "<nil>" {
			return text
		}
	}
	return ""
}

func number(value any) (float64, bool) {
	switch typed := value.(type) {
	case float64:
		return typed, !math.IsNaN(typed)
	case int:
		return float64(typed), true
	case json.Number:
		n, err := typed.Float64()
		return n, err == nil
	case string:
		var n float64
		_, err := fmt.Fscanf(bytes.NewBufferString(typed), "%f", &n)
		return n, err == nil
	default:
		return 0, false
	}
}
