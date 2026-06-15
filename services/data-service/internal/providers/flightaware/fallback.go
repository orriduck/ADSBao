package flightaware

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
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/adsbao/adsbao/services/data-service/internal/providers/adsb"
	"github.com/adsbao/adsbao/services/data-service/internal/realtime"
)

const (
	defaultBaseURL    = "https://www.flightaware.com/live/flight"
	trackpollPath     = "/ajax/trackpoll.rvt"
	defaultTimeout    = 7 * time.Second
	defaultCacheTTL   = 60 * time.Second
	maxHTMLBytes      = 2 * 1024 * 1024
	userAgentFallback = "ADSBao data-service/1.0 (+https://adsbao.dev; flightaware/fallback)"
)

type FallbackOptions struct {
	BaseURL        string
	HTTPClient     *http.Client
	Timeout        time.Duration
	CacheTTL       time.Duration
	MaxRequests    int
	RateWindow     time.Duration
	Enabled        bool
	ExplicitEnable bool
	Now            func() time.Time
}

type FallbackClient struct {
	baseURL     string
	httpClient  *http.Client
	timeout     time.Duration
	cacheTTL    time.Duration
	maxRequests int
	rateWindow  time.Duration
	enabled     bool
	now         func() time.Time

	mu           sync.Mutex
	cache        map[string]cacheEntry
	requestTimes []time.Time
}

type cacheEntry struct {
	result    adsb.FallbackResult
	expiresAt time.Time
}

func NewFallbackClient(options FallbackOptions) *FallbackClient {
	baseURL := strings.TrimRight(options.BaseURL, "/")
	if baseURL == "" {
		baseURL = defaultBaseURL
	}
	httpClient := options.HTTPClient
	if httpClient == nil {
		httpClient = &http.Client{}
	}
	timeout := options.Timeout
	if timeout <= 0 {
		timeout = defaultTimeout
	}
	cacheTTL := options.CacheTTL
	if cacheTTL <= 0 {
		cacheTTL = defaultCacheTTL
	}
	maxRequests := options.MaxRequests
	if maxRequests <= 0 {
		maxRequests = 20
	}
	rateWindow := options.RateWindow
	if rateWindow <= 0 {
		rateWindow = time.Minute
	}
	now := options.Now
	if now == nil {
		now = func() time.Time { return time.Now().UTC() }
	}
	enabled := true
	if options.ExplicitEnable {
		enabled = options.Enabled
	}
	return &FallbackClient{
		baseURL:     baseURL,
		httpClient:  httpClient,
		timeout:     timeout,
		cacheTTL:    cacheTTL,
		maxRequests: maxRequests,
		rateWindow:  rateWindow,
		enabled:     enabled,
		now:         now,
		cache:       map[string]cacheEntry{},
	}
}

func (c *FallbackClient) ByCallsign(ctx context.Context, callsign any, metrics realtime.MetricsSink) (adsb.FallbackResult, error) {
	now := c.now()
	fetchedAt := now.Format(time.RFC3339Nano)
	if !c.enabled {
		return errorResult("feature_disabled", fetchedAt, "", nil), nil
	}
	normalized := normalizeCallsign(callsign)
	if normalized == "" {
		return errorResult("invalid_callsign", fetchedAt, "", nil), nil
	}
	pageURL := c.pageURL(normalized)
	if pageURL == "" {
		return errorResult("invalid_callsign", fetchedAt, "", nil), nil
	}
	if cached, ok := c.cached(normalized, now); ok {
		return cached, nil
	}
	if !c.checkRateLimit(now) {
		return errorResult("rate_limited", fetchedAt, "", nil), nil
	}

	started := time.Now()
	resp, cancel, err := c.do(ctx, pageURL, "text/html,application/xhtml+xml", "", metrics, started)
	if err != nil {
		record(metrics, "error", "ERR", pageURL, err.Error(), started)
		return errorResult(timeoutOrNetwork(err), fetchedAt, err.Error(), nil), nil
	}
	defer cancel()
	defer resp.Body.Close()
	record(metrics, resultForStatus(resp.StatusCode), resp.StatusCode, pageURL, statusError(resp.StatusCode), started)
	if resp.StatusCode == http.StatusNotFound {
		return errorResult("not_found", fetchedAt, "", nil), nil
	}
	if resp.StatusCode == http.StatusTooManyRequests {
		return errorResult("rate_limited", fetchedAt, "", nil), nil
	}
	if resp.StatusCode == http.StatusPaymentRequired {
		result := errorResult("payment_required", fetchedAt, "HTTP 402", resp.StatusCode)
		c.store(normalized, result, now)
		return result, nil
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return errorResult("network_failed", fetchedAt, fmt.Sprintf("HTTP %d", resp.StatusCode), resp.StatusCode), nil
	}
	body, err := readBody(resp.Body, maxHTMLBytes)
	if err != nil {
		return errorResult("network_failed", fetchedAt, err.Error(), nil), nil
	}
	htmlText := string(body)
	if token := extractTrackpollToken(htmlText); token != "" {
		if result, ok := c.tryTrackpoll(ctx, normalized, fetchedAt, pageURL, token, htmlText, metrics); ok {
			c.store(normalized, result, now)
			return result, nil
		}
	}
	result := parseFallbackPage(normalized, fetchedAt, htmlText)
	c.store(normalized, result, now)
	return result, nil
}

func (c *FallbackClient) tryTrackpoll(ctx context.Context, callsign, fetchedAt, pageURL, token, htmlText string, metrics realtime.MetricsSink) (adsb.FallbackResult, bool) {
	trackURL := buildTrackpollURL(pageURL, token)
	started := time.Now()
	resp, cancel, err := c.do(ctx, trackURL, "application/json, text/javascript, */*; q=0.01", pageURL, metrics, started)
	if err != nil {
		record(metrics, "error", "ERR", trackURL, err.Error(), started)
		return adsb.FallbackResult{}, false
	}
	defer cancel()
	defer resp.Body.Close()
	record(metrics, resultForStatus(resp.StatusCode), resp.StatusCode, trackURL, statusError(resp.StatusCode), started)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return adsb.FallbackResult{}, false
	}
	body, err := readBody(resp.Body, maxHTMLBytes)
	if err != nil {
		return adsb.FallbackResult{}, false
	}
	result := parsePayload(callsign, fetchedAt, htmlText, body)
	return result, result.OK
}

func (c *FallbackClient) do(ctx context.Context, requestURL, accept, referer string, _ realtime.MetricsSink, _ time.Time) (*http.Response, context.CancelFunc, error) {
	requestCtx, cancel := context.WithTimeout(ctx, c.timeout)
	req, err := http.NewRequestWithContext(requestCtx, http.MethodGet, requestURL, nil)
	if err != nil {
		cancel()
		return nil, nil, err
	}
	req.Header.Set("Accept", accept)
	req.Header.Set("User-Agent", userAgentFallback)
	if referer != "" {
		req.Header.Set("Referer", referer)
		req.Header.Set("X-Requested-With", "XMLHttpRequest")
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		cancel()
		return nil, nil, err
	}
	return resp, cancel, nil
}

func (c *FallbackClient) pageURL(callsign string) string {
	if callsign == "" {
		return ""
	}
	return c.baseURL + "/" + url.PathEscape(callsign)
}

func (c *FallbackClient) cached(callsign string, now time.Time) (adsb.FallbackResult, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	entry, ok := c.cache[callsign]
	if !ok || !now.Before(entry.expiresAt) {
		if ok {
			delete(c.cache, callsign)
		}
		return adsb.FallbackResult{}, false
	}
	return entry.result, true
}

func (c *FallbackClient) store(callsign string, result adsb.FallbackResult, now time.Time) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.cache[callsign] = cacheEntry{result: result, expiresAt: now.Add(c.cacheTTL)}
}

func (c *FallbackClient) checkRateLimit(now time.Time) bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	cutoff := now.Add(-c.rateWindow)
	next := c.requestTimes[:0]
	for _, at := range c.requestTimes {
		if at.After(cutoff) {
			next = append(next, at)
		}
	}
	c.requestTimes = next
	if len(c.requestTimes) >= c.maxRequests {
		return false
	}
	c.requestTimes = append(c.requestTimes, now)
	return true
}

func parseFallbackPage(callsign, fetchedAt, htmlText string) adsb.FallbackResult {
	jsonText := extractAssignedJSON(htmlText, "trackpollBootstrap")
	if jsonText == "" {
		return errorResult("parse_failed", fetchedAt, "trackpollBootstrap not found", nil)
	}
	return parsePayload(callsign, fetchedAt, htmlText, []byte(jsonText))
}

func parsePayload(callsign, fetchedAt, htmlText string, payloadText []byte) adsb.FallbackResult {
	var payload map[string]any
	if err := json.Unmarshal(payloadText, &payload); err != nil {
		return errorResult("parse_failed", fetchedAt, err.Error(), nil)
	}
	normalized := normalizeCallsign(callsign)
	if normalized == "" {
		return errorResult("invalid_callsign", fetchedAt, "", nil)
	}
	flight := selectBestFlight(payload["flights"])
	if flight == nil {
		return errorResult("parse_failed", fetchedAt, "No flight entries found", nil)
	}
	metadata := buildMetadata(normalized, fetchedAt, flight, htmlText)
	point := selectPositionPoint(flight)
	if point == nil {
		return adsb.FallbackResult{OK: true, HasPosition: false, FetchedAt: fetchedAt, Metadata: metadata, Raw: resultMap(true, false, fetchedAt, metadata, nil, "", nil)}
	}
	kind := normalizePositionKind(flight, point)
	sourceUpdatedAt := firstNonEmpty(timestampISO(point["timestamp"]), str(metadata["sourceUpdatedAt"]))
	position := map[string]any{
		"lat":                    point["lat"],
		"lon":                    point["lon"],
		"flight_position_source": "flightaware",
		"altitudeFt":             altitudeFt(point["alt"]),
		"groundSpeedKt":          firstNonNil(numberOrNil(point["gs"]), metadata["groundSpeedKt"]),
		"trackDeg":               firstNonNil(numberOrNil(point["heading"]), metadata["trackDeg"]),
		"headingDeg":             numberOrNil(point["heading"]),
		"callsign":               normalized,
		"hex":                    nonEmpty(flight["hexid"]),
		"flightAwareUrl":         metadata["flightAwareUrl"],
		"origin":                 metadata["origin"],
		"destination":            metadata["destination"],
		"route":                  metadata["route"],
		"status":                 metadata["status"],
		"terminal":               metadata["terminal"],
		"quality": map[string]any{
			"source":                 "flightaware",
			"flight_position_source": "flightaware",
			"kind":                   kind,
			"isEstimated":            kind != "observed",
			"isPredicted":            kind == "predicted",
			"isInterpolated":         kind == "interpolated",
			"sourceLabel":            "FlightAware",
			"sourceUpdatedAt":        sourceUpdatedAt,
			"fetchedAt":              fetchedAt,
			"confidence":             map[bool]string{true: "medium", false: "low"}[kind == "observed"],
			"status":                 metadata["status"],
			"terminal":               metadata["terminal"],
			"notes":                  []any{"flightaware-public-page"},
		},
	}
	removeNil(position)
	return adsb.FallbackResult{
		OK:          true,
		HasPosition: true,
		FetchedAt:   fetchedAt,
		Metadata:    metadata,
		Position:    position,
		Raw:         resultMap(true, true, fetchedAt, metadata, position, "", nil),
	}
}

func selectBestFlight(flights any) map[string]any {
	flightMap, ok := flights.(map[string]any)
	if !ok || len(flightMap) == 0 {
		return nil
	}
	type scored struct {
		index  int
		score  float64
		flight map[string]any
	}
	var list []scored
	index := 0
	for _, value := range flightMap {
		flight, ok := value.(map[string]any)
		if !ok {
			continue
		}
		hasPosition := readCoord(flight["coord"]) != nil || trackHasPosition(flight["track"])
		hasEnded := flight["cancelled"] == true || flight["resultUnknown"] == true || flight["landingTimes"] != nil || flight["gateArrivalTimes"] != nil
		hasStarted := flight["takeoffTimes"] != nil || flight["gateDepartureTimes"] != nil || hasPosition
		timestamp := numberValue(flight["timestamp"])
		score := 0.0
		if hasPosition {
			score += 10000
		}
		if hasStarted {
			score += 1000
		}
		if hasEnded {
			score -= 2000
		}
		if flight["historical"] == true {
			score -= 100
		}
		score += math.Min(timestamp/1_000_000_000, 100)
		list = append(list, scored{index: index, score: score, flight: flight})
		index++
	}
	sort.Slice(list, func(i, j int) bool {
		if list[i].score == list[j].score {
			return list[i].index < list[j].index
		}
		return list[i].score > list[j].score
	})
	if len(list) == 0 {
		return nil
	}
	return list[0].flight
}

func selectPositionPoint(flight map[string]any) map[string]any {
	if coord := readCoord(flight["coord"]); coord != nil {
		return map[string]any{
			"lat": coord["lat"], "lon": coord["lon"],
			"alt": flight["altitude"], "gs": flight["groundspeed"], "heading": flight["heading"],
			"timestamp": flight["timestamp"], "type": flight["updateType"],
		}
	}
	track, ok := flight["track"].([]any)
	if !ok {
		return nil
	}
	var points []map[string]any
	for _, item := range track {
		point, ok := item.(map[string]any)
		if !ok {
			continue
		}
		coord := readCoord(point["coord"])
		if coord == nil {
			continue
		}
		copy := map[string]any{}
		for key, value := range point {
			copy[key] = value
		}
		copy["lat"] = coord["lat"]
		copy["lon"] = coord["lon"]
		points = append(points, copy)
	}
	sort.Slice(points, func(i, j int) bool {
		return numberValue(points[i]["timestamp"]) > numberValue(points[j]["timestamp"])
	})
	if len(points) == 0 {
		return nil
	}
	return points[0]
}

func buildMetadata(callsign, fetchedAt string, flight map[string]any, htmlText string) map[string]any {
	flightPlan, _ := flight["flightPlan"].(map[string]any)
	origin := firstNonEmpty(nestedString(flight, "origin", "icao"), extractMeta(htmlText, "origin"))
	destination := firstNonEmpty(nestedString(flight, "destination", "icao"), extractMeta(htmlText, "destination"))
	status := nonEmpty(flight["flightStatus"])
	terminal := terminalFlight(flight, status)
	return map[string]any{
		"callsign":        callsign,
		"flightAwareUrl":  defaultBaseURL + "/" + url.PathEscape(callsign),
		"origin":          emptyNil(origin),
		"destination":     emptyNil(destination),
		"route":           emptyNil(nonEmpty(flightPlan["route"])),
		"altitudeFt":      firstNonNil(altitudeFt(flight["altitude"]), altitudeFt(flightPlan["altitude"])),
		"groundSpeedKt":   firstNonNil(numberOrNil(flight["groundspeed"]), numberOrNil(flightPlan["speed"])),
		"trackDeg":        numberOrNil(flight["heading"]),
		"status":          emptyNil(status),
		"terminal":        terminal,
		"sourceUpdatedAt": emptyNil(timestampISO(flight["timestamp"])),
		"fetchedAt":       fetchedAt,
		"notes":           []any{"flightaware-public-page"},
	}
}

func readCoord(value any) map[string]any {
	list, ok := value.([]any)
	if !ok || len(list) < 2 {
		return nil
	}
	lon, lonOK := number(list[0])
	lat, latOK := number(list[1])
	if !latOK || !lonOK || lat < -90 || lat > 90 || lon < -180 || lon > 180 {
		return nil
	}
	return map[string]any{"lat": lat, "lon": lon}
}

func trackHasPosition(value any) bool {
	track, ok := value.([]any)
	if !ok {
		return false
	}
	for _, item := range track {
		point, _ := item.(map[string]any)
		if readCoord(point["coord"]) != nil {
			return true
		}
	}
	return false
}

func extractTrackpollToken(htmlText string) string {
	globals := extractAssignedJSON(htmlText, "trackpollGlobals")
	if globals == "" {
		return ""
	}
	var payload map[string]any
	if err := json.Unmarshal([]byte(globals), &payload); err != nil {
		return ""
	}
	return nonEmpty(payload["TOKEN"])
}

func extractAssignedJSON(source, name string) string {
	marker := "var " + name + " ="
	start := strings.Index(source, marker)
	if start < 0 {
		return ""
	}
	objectStart := strings.Index(source[start+len(marker):], "{")
	if objectStart < 0 {
		return ""
	}
	objectStart += start + len(marker)
	depth := 0
	inString := false
	escaped := false
	for index := objectStart; index < len(source); index++ {
		char := source[index]
		if inString {
			if escaped {
				escaped = false
			} else if char == '\\' {
				escaped = true
			} else if char == '"' {
				inString = false
			}
			continue
		}
		if char == '"' {
			inString = true
			continue
		}
		if char == '{' {
			depth++
		}
		if char == '}' {
			depth--
			if depth == 0 {
				return source[objectStart : index+1]
			}
		}
	}
	return ""
}

func buildTrackpollURL(pageURL, token string) string {
	out, _ := url.Parse(defaultBaseURL)
	out.Path = trackpollPath
	query := url.Values{}
	if page, err := url.Parse(pageURL); err == nil {
		out.Scheme = page.Scheme
		out.Host = page.Host
		for key, values := range page.Query() {
			for _, value := range values {
				query.Add(key, value)
			}
		}
	}
	query.Set("token", token)
	query.Set("locale", "en_US")
	query.Set("summary", "0")
	out.RawQuery = query.Encode()
	return out.String()
}

func extractMeta(source, key string) string {
	for _, tag := range regexp.MustCompile(`(?is)<meta\b[^>]*>`).FindAllString(source, -1) {
		name := firstNonEmpty(extractAttr(tag, "name"), extractAttr(tag, "property"))
		if name == key {
			return strings.TrimSpace(html.UnescapeString(extractAttr(tag, "content")))
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

func normalizePositionKind(flight, point map[string]any) string {
	label := firstNonEmpty(nonEmpty(flight["updateType"]), nonEmpty(point["type"]))
	switch {
	case regexp.MustCompile(`(?i)pred|tp`).MatchString(label):
		return "predicted"
	case regexp.MustCompile(`(?i)interp`).MatchString(label):
		return "interpolated"
	case regexp.MustCompile(`(?i)est|tentative`).MatchString(label):
		return "estimated"
	default:
		return "observed"
	}
}

func terminalFlight(flight map[string]any, status string) bool {
	return flight["landingTimes"] != nil || flight["gateArrivalTimes"] != nil || flight["cancelled"] == true || flight["resultUnknown"] == true || regexp.MustCompile(`(?i)\b(arrived|landed|cancelled|canceled|diverted|result unknown)\b`).MatchString(status)
}

func errorResult(errorType, fetchedAt, message string, upstreamStatus any) adsb.FallbackResult {
	raw := map[string]any{
		"ok":          false,
		"hasPosition": false,
		"errorType":   errorType,
		"fetchedAt":   fetchedAt,
	}
	if message != "" {
		raw["message"] = message
	}
	if upstreamStatus != nil {
		raw["upstreamStatus"] = upstreamStatus
	}
	return adsb.FallbackResult{OK: false, HasPosition: false, ErrorType: errorType, UpstreamStatus: upstreamStatus, FetchedAt: fetchedAt, Raw: raw}
}

func resultMap(ok, hasPosition bool, fetchedAt string, metadata, position map[string]any, errorType string, upstream any) map[string]any {
	out := map[string]any{"ok": ok, "hasPosition": hasPosition, "fetchedAt": fetchedAt}
	if metadata != nil {
		out["metadata"] = metadata
	}
	if position != nil {
		out["position"] = position
	}
	if errorType != "" {
		out["errorType"] = errorType
	}
	if upstream != nil {
		out["upstreamStatus"] = upstream
	}
	return out
}

func readBody(reader io.Reader, limit int64) ([]byte, error) {
	body, err := io.ReadAll(io.LimitReader(reader, limit+1))
	if err != nil {
		return nil, err
	}
	if int64(len(body)) > limit {
		return nil, errors.New("FlightAware response too large")
	}
	return body, nil
}

func record(metrics realtime.MetricsSink, result string, status any, requestURL, errorText string, started time.Time) {
	if metrics == nil {
		return
	}
	metrics.RecordExternalRequest(realtime.ExternalRequestMetricInput{
		Provider: "flightaware", Endpoint: "callsign", Result: result, Status: status, URL: requestURL, Error: errorText, DurationMS: time.Since(started).Milliseconds(),
	})
}

func resultForStatus(status int) string {
	if status >= 200 && status < 300 {
		return "success"
	}
	return "error"
}

func statusError(status int) string {
	if status >= 200 && status < 300 {
		return ""
	}
	return fmt.Sprintf("HTTP %d", status)
}

func timeoutOrNetwork(err error) string {
	if err == nil {
		return "network_failed"
	}
	if errors.Is(err, context.DeadlineExceeded) || strings.Contains(strings.ToLower(err.Error()), "timeout") {
		return "timeout"
	}
	return "network_failed"
}

func normalizeCallsign(value any) string {
	callsign := strings.Join(strings.Fields(strings.ToUpper(strings.TrimSpace(fmt.Sprint(value)))), "")
	if regexp.MustCompile(`^[A-Z][A-Z0-9]{2,7}$`).MatchString(callsign) {
		return callsign
	}
	return ""
}

func altitudeFt(value any) any {
	number, ok := number(value)
	if !ok {
		return nil
	}
	if math.Abs(number) < 1000 {
		return math.Round(number * 100)
	}
	return math.Round(number)
}

func timestampISO(value any) string {
	number, ok := number(value)
	if !ok {
		return ""
	}
	ms := number
	if number < 10_000_000_000 {
		ms = number * 1000
	}
	return time.UnixMilli(int64(ms)).UTC().Format(time.RFC3339Nano)
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

func numberOrNil(value any) any {
	if n, ok := number(value); ok {
		return n
	}
	return nil
}

func numberValue(value any) float64 {
	if n, ok := number(value); ok {
		return n
	}
	return 0
}

func nestedString(record map[string]any, outer, inner string) string {
	child, _ := record[outer].(map[string]any)
	return nonEmpty(child[inner])
}

func nonEmpty(value any) string {
	if value == nil {
		return ""
	}
	text := strings.TrimSpace(fmt.Sprint(value))
	if text == "<nil>" {
		return ""
	}
	return text
}

func str(value any) string {
	return nonEmpty(value)
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

func firstNonNil(values ...any) any {
	for _, value := range values {
		if value != nil && value != "" {
			return value
		}
	}
	return nil
}

func emptyNil(value string) any {
	if value == "" {
		return nil
	}
	return value
}

func removeNil(record map[string]any) {
	for key, value := range record {
		if value == nil || value == "" {
			delete(record, key)
		}
	}
}
