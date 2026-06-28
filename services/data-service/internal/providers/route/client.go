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
	defaultMaxBytes      = 2 * 1024 * 1024
	userAgent            = "ADSBao data-service/1.0 (+https://adsbao.dev)"

	// Per-provider access config. Both providers run through the same pipeline
	// (cache → limiter → timeout+retry → cache); only these knobs differ.
	//
	// adsbdb is a JSON API with a request-rate limit, so it is throttled by a
	// minimum interval between starts (concurrency is left unbounded). FlightAware
	// is a scrape that is fast alone (~0.6s) but degrades under concurrency (~2s
	// at 10-way, 5–10s at 40-way), so it is throttled by a concurrency cap
	// instead — a strict serial interval queue would be far too slow for the
	// dozens of lookups a busy airport fires.
	defaultADSBDBTimeout          = 9 * time.Second
	defaultADSBDBInterval         = 500 * time.Millisecond
	defaultFlightAwareTimeout     = 12 * time.Second
	defaultFlightAwareConcurrency = 8
)

// defaultRetryBackoffs retries a failed lookup 3 times, sleeping 200/400/600ms
// before each retry, so a transient upstream blip resolves within one poll
// instead of waiting for the scheduler's next re-poll. A "not found" is not an
// error and is never retried.
var defaultRetryBackoffs = []time.Duration{
	200 * time.Millisecond,
	400 * time.Millisecond,
	600 * time.Millisecond,
}

// Cache is a best-effort persistent route cache keyed by callsign+provider.
// A nil Cache disables caching entirely.
type Cache interface {
	GetRoute(ctx context.Context, callsign, provider string) (json.RawMessage, time.Duration, bool)
	PutRoute(ctx context.Context, callsign, provider string, route json.RawMessage)
	TTL() time.Duration
}

type Options struct {
	HTTPClient                *http.Client
	ADSBDBBaseURL             string
	FlightAwareRouteFetcher   func(context.Context, string, realtime.MetricsSink) (map[string]any, error)
	Cache                     Cache
	Timeout                   time.Duration // adsbdb upstream timeout
	FlightAwareTimeout        time.Duration // FlightAware upstream timeout
	MaxBytes                  int64
	QueueInterval             time.Duration   // adsbdb minimum interval between starts
	DisableQueue              bool            // disable the adsbdb interval
	MaxFlightAwareConcurrency int             // FlightAware in-flight cap
	RetryBackoffs             []time.Duration // per-retry backoff; nil → default, empty → no retry
}

type Client struct {
	httpClient              *http.Client
	adsbdbBaseURL           string
	flightAwareRouteFetcher func(context.Context, string, realtime.MetricsSink) (map[string]any, error)
	maxBytes                int64
	cache                   Cache
	adsbdb                  *providerSpec
	flightAware             *providerSpec
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
	maxBytes := options.MaxBytes
	if maxBytes <= 0 {
		maxBytes = defaultMaxBytes
	}
	adsbdbTimeout := options.Timeout
	if adsbdbTimeout <= 0 {
		adsbdbTimeout = defaultADSBDBTimeout
	}
	adsbdbInterval := options.QueueInterval
	if adsbdbInterval == 0 && !options.DisableQueue {
		adsbdbInterval = defaultADSBDBInterval
	}
	faTimeout := options.FlightAwareTimeout
	if faTimeout <= 0 {
		faTimeout = defaultFlightAwareTimeout
	}
	faConcurrency := options.MaxFlightAwareConcurrency
	if faConcurrency <= 0 {
		faConcurrency = defaultFlightAwareConcurrency
	}
	backoffs := options.RetryBackoffs
	if backoffs == nil {
		backoffs = defaultRetryBackoffs
	}

	c := &Client{
		httpClient:              httpClient,
		adsbdbBaseURL:           adsbdbBase,
		flightAwareRouteFetcher: options.FlightAwareRouteFetcher,
		maxBytes:                maxBytes,
		cache:                   options.Cache,
	}
	c.adsbdb = &providerSpec{
		name:     "adsbdb",
		limiter:  newLimiter(0, adsbdbInterval),
		timeout:  adsbdbTimeout,
		backoffs: backoffs,
		fetch:    c.fetchADSBDB,
	}
	c.flightAware = &providerSpec{
		name:     "flightaware",
		limiter:  newLimiter(faConcurrency, 0),
		timeout:  faTimeout,
		backoffs: backoffs,
		fetch:    c.fetchFlightAware,
	}
	return c
}

// providerSpec bundles everything that differs between route upstreams: how it
// is throttled, how long a request may take, how it retries, and the call
// itself. Both providers run through the identical pipeline in Fetch/resolve.
type providerSpec struct {
	name     string
	limiter  *limiter
	timeout  time.Duration
	backoffs []time.Duration
	fetch    func(context.Context, realtime.FetchInput) (map[string]any, error)
}

func (c *Client) Fetch(ctx context.Context, input realtime.FetchInput) (realtime.Event, error) {
	if input.Target.Kind != "route" {
		return realtime.Event{}, errors.New("Expected route polling target")
	}
	// The FlightAware grant (resolved upstream into Target.RouteProvider) gates
	// which provider runs; each provider carries its own queue, timeout/retry,
	// and cache partition (keyed by provider name).
	spec := c.adsbdb
	if input.Target.RouteProvider == "flightaware" {
		spec = c.flightAware
	}
	callsign := input.Target.Callsign

	// Serve a fresh cached route without touching the upstream. Provider is part
	// of the cache key, so a FlightAware lookup never reads an adsbdb row.
	if c.cache != nil && callsign != "" {
		if raw, age, ok := c.cache.GetRoute(ctx, callsign, spec.name); ok && age < c.cache.TTL() {
			return cachedRouteEvent(input.Channel, spec.name, callsign, raw), nil
		}
	}

	route, err := c.resolve(ctx, spec, input)
	if err != nil {
		// Upstream failed after retries — fall back to the last-known route
		// (stale-while-revalidate) rather than surfacing an empty/error route.
		if c.cache != nil && callsign != "" {
			if raw, _, ok := c.cache.GetRoute(ctx, callsign, spec.name); ok {
				return cachedRouteEvent(input.Channel, spec.name, callsign, raw), nil
			}
		}
		return realtime.Event{}, err
	}

	event := routeEvent(input.Channel, spec.name, callsign, route)
	// Cache only successful lookups that actually resolved a route.
	if c.cache != nil && callsign != "" {
		if raw := routeJSONFromEvent(event); raw != nil {
			c.cache.PutRoute(ctx, callsign, spec.name, raw)
		}
	}
	return event, nil
}

// resolve runs one provider's lookup through its limiter and timeout, retrying
// transient failures on the provider's backoff schedule. A nil route with no
// error means "no route found" — a success, never retried. The limiter slot is
// held only for the actual call, not across the retry backoff.
func (c *Client) resolve(ctx context.Context, spec *providerSpec, input realtime.FetchInput) (map[string]any, error) {
	var lastErr error
	for attempt := 0; attempt <= len(spec.backoffs); attempt++ {
		if attempt > 0 {
			if err := sleepContext(ctx, spec.backoffs[attempt-1]); err != nil {
				return nil, err
			}
		}
		release, err := spec.limiter.acquire(ctx)
		if err != nil {
			return nil, err
		}
		fetchCtx, cancel := context.WithTimeout(ctx, spec.timeout)
		route, err := spec.fetch(fetchCtx, input)
		cancel()
		release()
		if err == nil {
			return route, nil
		}
		lastErr = err
	}
	return nil, lastErr
}

func sleepContext(ctx context.Context, d time.Duration) error {
	if d <= 0 {
		return nil
	}
	timer := time.NewTimer(d)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return nil
	}
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

// fetchADSBDB returns the normalized route, or (nil, nil) when the callsign has
// no route (adsbdb 404). The limiter/timeout/retry are applied by resolve.
func (c *Client) fetchADSBDB(ctx context.Context, input realtime.FetchInput) (map[string]any, error) {
	requestURL := c.adsbdbBaseURL + "/callsign/" + url.PathEscape(input.Target.Callsign)
	started := time.Now()
	resp, err := c.do(ctx, requestURL, "application/json", userAgent)
	if err != nil {
		c.recordExternal(input, "adsbdb", "error", "ERR", requestURL, err.Error(), started)
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		if resp.StatusCode != http.StatusNotFound {
			message := fmt.Sprintf("HTTP %d", resp.StatusCode)
			c.recordExternal(input, "adsbdb", "error", resp.StatusCode, requestURL, message, started)
			return nil, fmt.Errorf("adsbdb route HTTP %d", resp.StatusCode)
		}
		c.recordExternal(input, "adsbdb", "success", resp.StatusCode, requestURL, "", started)
		return nil, nil
	}
	body, err := c.readBody(resp)
	if err != nil {
		c.recordExternal(input, "adsbdb", "error", "ERR", requestURL, err.Error(), started)
		return nil, err
	}
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		c.recordExternal(input, "adsbdb", "error", "PARSE", requestURL, "Invalid ADSBDB JSON", started)
		return nil, err
	}
	c.recordExternal(input, "adsbdb", "success", resp.StatusCode, requestURL, "", started)
	return normalizeADSBDBRoute(input.Target.Callsign, payload), nil
}

// fetchFlightAware returns the route from the private FlightAware service, or
// (nil, nil) when the service is not configured. The limiter/timeout/retry are
// applied by resolve.
func (c *Client) fetchFlightAware(ctx context.Context, input realtime.FetchInput) (map[string]any, error) {
	if c.flightAwareRouteFetcher == nil {
		return nil, nil
	}
	return c.flightAwareRouteFetcher(ctx, input.Target.Callsign, input.Metrics)
}

// limiter throttles upstream access with two knobs that together cover both
// providers: a max-concurrency semaphore (FlightAware) and a minimum interval
// between starts (adsbdb). Either may be disabled (zero).
type limiter struct {
	sem       chan struct{}
	mu        sync.Mutex
	interval  time.Duration
	lastStart time.Time
}

func newLimiter(maxConcurrency int, interval time.Duration) *limiter {
	var sem chan struct{}
	if maxConcurrency > 0 {
		sem = make(chan struct{}, maxConcurrency)
	}
	return &limiter{sem: sem, interval: interval}
}

// acquire blocks until a concurrency slot is free and the minimum interval has
// elapsed, returning a release func.
func (l *limiter) acquire(ctx context.Context) (func(), error) {
	if l.sem != nil {
		select {
		case l.sem <- struct{}{}:
		case <-ctx.Done():
			return func() {}, ctx.Err()
		}
	}
	if l.interval > 0 {
		if err := l.waitInterval(ctx); err != nil {
			if l.sem != nil {
				<-l.sem
			}
			return func() {}, err
		}
	}
	return func() {
		if l.sem != nil {
			<-l.sem
		}
	}, nil
}

func (l *limiter) waitInterval(ctx context.Context) error {
	l.mu.Lock()
	wait := l.interval - time.Since(l.lastStart)
	if wait < 0 {
		wait = 0
	}
	l.lastStart = time.Now().Add(wait)
	l.mu.Unlock()
	return sleepContext(ctx, wait)
}

// do issues the request against the caller's ctx — resolve owns the timeout via
// the per-provider deadline, so do no longer imposes its own.
func (c *Client) do(ctx context.Context, requestURL, accept, ua string) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", accept)
	req.Header.Set("User-Agent", ua)
	return c.httpClient.Do(req)
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
