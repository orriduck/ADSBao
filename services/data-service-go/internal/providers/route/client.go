package route

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"io"
	"math"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/adsbao/adsbao/services/data-service-go/internal/realtime"
)

const (
	defaultADSBDBBaseURL     = "https://api.adsbdb.com/v0"
	defaultFlightAwareBase   = "https://www.flightaware.com/live/flight"
	defaultTimeout           = 9 * time.Second
	defaultMaxBytes          = 512 * 1024
	defaultQueueInterval     = 500 * time.Millisecond
	userAgent                = "ADSBao data-service/1.0 (+https://adsbao.dev)"
	flightAwareRouteUA       = "ADSBao data-service/1.0 (+https://adsbao.dev; flightaware/html)"
	flightAwareLogoURLFormat = "https://www.flightaware.com/images/airline_logos/90p/%s.png"
)

type Options struct {
	HTTPClient      *http.Client
	ADSBDBBaseURL   string
	FlightAwareBase string
	Timeout         time.Duration
	MaxBytes        int64
	QueueInterval   time.Duration
	DisableQueue    bool
}

type Client struct {
	httpClient      *http.Client
	adsbdbBaseURL   string
	flightAwareBase string
	timeout         time.Duration
	maxBytes        int64
	queueInterval   time.Duration
	mu              sync.Mutex
	lastStarted     time.Time
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
	flightAwareBase := strings.TrimRight(options.FlightAwareBase, "/")
	if flightAwareBase == "" {
		flightAwareBase = defaultFlightAwareBase
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
		httpClient:      httpClient,
		adsbdbBaseURL:   adsbdbBase,
		flightAwareBase: flightAwareBase,
		timeout:         timeout,
		maxBytes:        maxBytes,
		queueInterval:   queueInterval,
	}
}

func (c *Client) Fetch(ctx context.Context, input realtime.FetchInput) (realtime.Event, error) {
	if input.Target.Kind != "route" {
		return realtime.Event{}, errors.New("Expected route polling target")
	}
	if input.Target.RouteProvider == "flightaware" {
		return c.fetchFlightAware(ctx, input)
	}
	return c.fetchADSBDB(ctx, input)
}

func (c *Client) fetchADSBDB(ctx context.Context, input realtime.FetchInput) (realtime.Event, error) {
	if err := c.waitForTurn(ctx); err != nil {
		return realtime.Event{}, err
	}
	requestURL := c.adsbdbBaseURL + "/callsign/" + url.PathEscape(input.Target.Callsign)
	started := time.Now()
	status := any(nil)
	resp, err := c.do(ctx, requestURL, "application/json", userAgent)
	if err != nil {
		c.recordExternal(input, "adsbdb", "error", "ERR", started)
		return realtime.Event{}, err
	}
	defer resp.Body.Close()
	status = resp.StatusCode
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		if resp.StatusCode != http.StatusNotFound {
			c.recordExternal(input, "adsbdb", "error", status, started)
			return realtime.Event{}, fmt.Errorf("adsbdb route HTTP %d", resp.StatusCode)
		}
		c.recordExternal(input, "adsbdb", "success", status, started)
		return routeEvent(input.Channel, "adsbdb", input.Target.Callsign, nil), nil
	}
	body, err := c.readBody(resp)
	if err != nil {
		c.recordExternal(input, "adsbdb", "error", "ERR", started)
		return realtime.Event{}, err
	}
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		c.recordExternal(input, "adsbdb", "error", "PARSE", started)
		return realtime.Event{}, err
	}
	c.recordExternal(input, "adsbdb", "success", status, started)
	return routeEvent(input.Channel, "adsbdb", input.Target.Callsign, normalizeADSBDBRoute(input.Target.Callsign, payload)), nil
}

func (c *Client) fetchFlightAware(ctx context.Context, input realtime.FetchInput) (realtime.Event, error) {
	if err := c.waitForTurn(ctx); err != nil {
		return realtime.Event{}, err
	}
	requestURL := c.flightAwareURL(input.Target.Callsign)
	if requestURL == "" {
		return realtime.Event{}, errors.New("Invalid FlightAware route callsign")
	}
	started := time.Now()
	status := any(nil)
	resp, err := c.do(ctx, requestURL, "text/html,application/xhtml+xml", flightAwareRouteUA)
	if err != nil {
		c.recordExternal(input, "flightaware", "error", "ERR", started)
		return realtime.Event{}, err
	}
	defer resp.Body.Close()
	status = resp.StatusCode
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		if resp.StatusCode != http.StatusNotFound {
			c.recordExternal(input, "flightaware", "error", status, started)
			return realtime.Event{}, fmt.Errorf("flightaware route HTTP %d", resp.StatusCode)
		}
		c.recordExternal(input, "flightaware", "success", status, started)
		return routeEvent(input.Channel, "flightaware", input.Target.Callsign, nil), nil
	}
	body, err := c.readBody(resp)
	if err != nil {
		c.recordExternal(input, "flightaware", "error", "ERR", started)
		return realtime.Event{}, err
	}
	c.recordExternal(input, "flightaware", "success", status, started)
	return routeEvent(input.Channel, "flightaware", input.Target.Callsign, normalizeFlightAwareRoute(input.Target.Callsign, string(body))), nil
}

func (c *Client) do(ctx context.Context, requestURL, accept, ua string) (*http.Response, error) {
	requestCtx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()
	req, err := http.NewRequestWithContext(requestCtx, http.MethodGet, requestURL, nil)
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

func (c *Client) flightAwareURL(callsign string) string {
	normalized := upper(callsign)
	if !regexp.MustCompile(`^[A-Z][A-Z0-9]{2,7}$`).MatchString(normalized) {
		return ""
	}
	return c.flightAwareBase + "/" + url.PathEscape(normalized)
}

func (c *Client) recordExternal(input realtime.FetchInput, provider, result string, status any, started time.Time) {
	if input.Metrics == nil {
		return
	}
	input.Metrics.RecordExternalRequest(realtime.ExternalRequestMetricInput{
		Provider:   provider,
		Endpoint:   "route",
		Result:     result,
		Status:     status,
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
			"route":    route,
		},
	}
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

func normalizeFlightAwareRoute(callsign, source string) map[string]any {
	normalizedCallsign := upper(callsign)
	if !regexp.MustCompile(`^[A-Z][A-Z0-9]{2,7}$`).MatchString(normalizedCallsign) {
		return nil
	}
	originICAO := code(extractMeta(source, "origin"), 3, 4)
	destICAO := code(extractMeta(source, "destination"), 3, 4)
	airlineICAO := code(extractMeta(source, "airline"), 2, 3)
	if airlineICAO == "" && len(normalizedCallsign) >= 3 {
		airlineICAO = normalizedCallsign[:3]
	}
	if originICAO == "" || destICAO == "" || airlineICAO == "" {
		return nil
	}
	title := extractTitle(source)
	description := firstNonEmpty(extractMeta(source, "twitter:description"), extractMeta(source, "og:description"), extractMeta(source, "description"))
	airlineIATA, number := extractIATAAndNumber(normalizedCallsign, description, title)
	origin := normalizeFlightAwareAirport(extractEmbeddedAirport(source, "origin", originICAO))
	destination := normalizeFlightAwareAirport(extractEmbeddedAirport(source, "destination", destICAO))
	if origin == nil || destination == nil {
		return nil
	}
	routeIATA := ""
	if str(origin["iata"]) != "" && str(destination["iata"]) != "" {
		routeIATA = str(origin["iata"]) + "-" + str(destination["iata"])
	}
	callsignIATA := ""
	if airlineIATA != "" && number != "" {
		callsignIATA = airlineIATA + number
	}
	return map[string]any{
		"callsign":     normalizedCallsign,
		"callsignIcao": normalizedCallsign,
		"callsignIata": callsignIATA,
		"number":       number,
		"airline": map[string]any{
			"icao":     airlineICAO,
			"iata":     airlineIATA,
			"name":     extractAirlineName(description, title),
			"callsign": "",
			"iconUrl":  fmt.Sprintf(flightAwareLogoURLFormat, airlineICAO),
		},
		"origin":      origin,
		"destination": destination,
		"route": map[string]any{
			"icao": str(origin["icao"]) + "-" + str(destination["icao"]),
			"iata": routeIATA,
		},
		"airports":   []any{origin, destination},
		"source":     "flightaware",
		"confidence": "scraped-reference",
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
		"municipality": clean(raw["municipality"]),
		"country":      upper(firstNonEmpty(raw["country_iso_name"], raw["country"])),
		"lat":          lat,
		"lon":          lon,
	}
}

func normalizeFlightAwareAirport(raw map[string]any) map[string]any {
	if raw == nil {
		return nil
	}
	lat, latOK := number(raw["lat"])
	lon, lonOK := number(raw["lon"])
	icao := code(firstNonEmpty(raw["icao"], raw["ident"], raw["code"]), 3, 4)
	if icao == "" || !latOK || !lonOK || lat < -90 || lat > 90 || lon < -180 || lon > 180 {
		return nil
	}
	return map[string]any{
		"icao":         icao,
		"iata":         code(raw["iata"], 3, 3),
		"name":         clean(raw["name"]),
		"municipality": clean(firstNonEmpty(raw["city"], raw["municipality"])),
		"country":      upper(raw["country"]),
		"lat":          lat,
		"lon":          lon,
	}
}

func extractTitle(source string) string {
	match := regexp.MustCompile(`(?is)<title[^>]*>([^<]*)</title>`).FindStringSubmatch(source)
	if len(match) > 1 {
		return htmlDecode(match[1])
	}
	return extractMeta(source, "title")
}

func extractMeta(source, key string) string {
	for _, tag := range regexp.MustCompile(`(?is)<meta\b[^>]*>`).FindAllString(source, -1) {
		name := firstNonEmpty(extractAttr(tag, "name"), extractAttr(tag, "property"))
		if name == key {
			return htmlDecode(extractAttr(tag, "content"))
		}
	}
	return ""
}

func extractAttr(tag, name string) string {
	match := regexp.MustCompile(`(?is)\b` + regexp.QuoteMeta(name) + `=["']([^"']*)["']`).FindStringSubmatch(tag)
	if len(match) > 1 {
		return match[1]
	}
	return ""
}

func extractEmbeddedAirport(source, key, expectedICAO string) map[string]any {
	pattern := regexp.MustCompile(`(?is)"` + regexp.QuoteMeta(key) + `"\s*:\s*\{`)
	matches := pattern.FindAllStringIndex(source, -1)
	for _, match := range matches {
		block := source[match[0]:min(len(source), match[0]+1800)]
		icao := code(extractJSONString(block, "icao"), 3, 4)
		if expectedICAO != "" && icao != expectedICAO {
			continue
		}
		coordMatch := regexp.MustCompile(`(?is)"coord"\s*:\s*\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]`).FindStringSubmatch(block)
		if len(coordMatch) < 3 {
			continue
		}
		lon, lonOK := number(coordMatch[1])
		lat, latOK := number(coordMatch[2])
		if !latOK || !lonOK {
			continue
		}
		location := extractJSONString(block, "friendlyLocation")
		city := strings.Split(location, ",")[0]
		return map[string]any{
			"icao":         icao,
			"iata":         code(extractJSONString(block, "iata"), 3, 3),
			"name":         extractJSONString(block, "friendlyName"),
			"municipality": clean(city),
			"country":      "",
			"lat":          lat,
			"lon":          lon,
		}
	}
	return nil
}

func extractJSONString(block, key string) string {
	match := regexp.MustCompile(`(?is)"` + regexp.QuoteMeta(key) + `"\s*:\s*"([^"]*)"`).FindStringSubmatch(block)
	if len(match) > 1 {
		return htmlDecode(match[1])
	}
	return ""
}

func extractIATAAndNumber(callsign, description, title string) (string, string) {
	if match := regexp.MustCompile(`(?i)^([A-Z0-9]{2})(\d{1,5}[A-Z]?)\s+\(`).FindStringSubmatch(title); len(match) > 2 {
		return upper(match[1]), upper(match[2])
	}
	if match := regexp.MustCompile(`(?i)\(([A-Z0-9]{2})\)\s+#(\d{1,5}[A-Z]?)`).FindStringSubmatch(description); len(match) > 2 {
		return upper(match[1]), upper(match[2])
	}
	if match := regexp.MustCompile(`(?i)^[A-Z]{2,3}(\d{1,5}[A-Z]?)$`).FindStringSubmatch(callsign); len(match) > 1 {
		return "", upper(match[1])
	}
	return "", ""
}

func extractAirlineName(description, title string) string {
	if match := regexp.MustCompile(`(?i)\)\s+(.+?)\s+Flight Tracking(?:\s+and\s+History)?`).FindStringSubmatch(title); len(match) > 1 {
		return clean(match[1])
	}
	if match := regexp.MustCompile(`(?i)^Track\s+(.+?)\s+\([A-Z0-9]{2,3}\)\s+#`).FindStringSubmatch(description); len(match) > 1 {
		return clean(match[1])
	}
	return ""
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

func htmlDecode(value string) string {
	return strings.TrimSpace(html.UnescapeString(value))
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
