package metrics

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/adsbao/adsbao/services/data-service/internal/realtime"
)

var dynamicChannelTypes = []string{
	string(realtime.ChannelAircraft),
	string(realtime.ChannelCallsign),
	string(realtime.ChannelRoute),
	string(realtime.ChannelTraffic),
}

type Kind string

const (
	Count   Kind = "count"
	Gauge   Kind = "gauge"
	Summary Kind = "summary"
)

type Point struct {
	Name       string
	Kind       Kind
	Value      float64
	Attributes map[string]string
}

type Sink interface {
	Record(point Point)
	Flush(ctx context.Context) error
	Shutdown(ctx context.Context) error
}

type LogSink interface {
	RecordLog(level, message string, attributes map[string]any)
}

type Option func(*Metrics)

type Metrics struct {
	mu                   sync.Mutex
	sink                 Sink
	logSink              LogSink
	wsConnectionsCurrent int
}

func New(options ...Option) *Metrics {
	m := &Metrics{sink: noopSink{}}
	for _, option := range options {
		option(m)
	}
	if m.sink == nil {
		m.sink = noopSink{}
	}
	return m
}

func WithSink(sink Sink) Option {
	return func(m *Metrics) {
		if sink != nil {
			m.sink = sink
		}
	}
}

func WithLogSink(sink LogSink) Option {
	return func(m *Metrics) {
		if sink != nil {
			m.logSink = sink
		}
	}
}

func (m *Metrics) Flush(ctx context.Context) error {
	return m.sink.Flush(ctx)
}

func (m *Metrics) Shutdown(ctx context.Context) error {
	return m.sink.Shutdown(ctx)
}

func (m *Metrics) RecordWSUpgrade(reason, result string) {
	m.count("adsbao.ws.upgrades", attrs(
		"reason", normalize(reason),
		"result", normalize(result),
	))
}

func (m *Metrics) RecordWSConnectionOpened() {
	current := m.updateWSConnectionsCurrent(1)
	m.count("adsbao.ws.connections", nil)
	m.gauge("adsbao.ws.connections.current", float64(current), nil)
}

func (m *Metrics) RecordWSConnectionClosed(code any, result string, durationMS int64) {
	current := m.updateWSConnectionsCurrent(-1)
	labels := attrs(
		"close_code", normalize(code),
		"result", normalize(result),
	)
	m.count("adsbao.ws.disconnects", labels)
	m.gauge("adsbao.ws.connections.current", float64(current), nil)
	if durationMS > 0 {
		m.summary("adsbao.ws.connection.duration.seconds", float64(durationMS)/1000, labels)
	}
}

func (m *Metrics) RecordWSMessage(direction, typ, result string, bytes int) {
	labels := attrs(
		"direction", normalize(direction),
		"type", normalizeMessageType(typ),
		"result", normalize(result),
	)
	m.count("adsbao.ws.messages", labels)
	if bytes >= 0 {
		m.summary("adsbao.ws.message.bytes", float64(bytes), labels)
	}
}

func (m *Metrics) RecordWSSubscribe(channelType realtime.ChannelType, result string) {
	m.count("adsbao.ws.subscribe", attrs(
		"channel_type", normalize(channelType),
		"result", normalize(result),
	))
}

func (m *Metrics) RecordWSUnsubscribe(channelType realtime.ChannelType, result string) {
	m.count("adsbao.ws.unsubscribe", attrs(
		"channel_type", normalize(channelType),
		"result", normalize(result),
	))
}

func (m *Metrics) RecordPoll(channelType realtime.ChannelType, source, result string, durationMS int64) {
	labels := attrs(
		"channel_type", normalize(channelType),
		"source", normalize(source),
		"result", normalize(result),
	)
	m.count("adsbao.poll.requests", labels)
	if durationMS >= 0 {
		m.summary("adsbao.poll.duration.seconds", float64(durationMS)/1000, labels)
	}
}

func (m *Metrics) RecordExternalRequest(input realtime.ExternalRequestMetricInput) {
	status, class := classifyStatus(input.Status, input.Result)
	labels := attrs(
		"endpoint", normalize(input.Endpoint),
		"provider", normalize(input.Provider),
		"result", normalize(input.Result),
		"status", normalize(status),
		"status_class", normalize(class),
	)
	m.count("adsbao.external_requests", labels)
	if input.DurationMS >= 0 {
		m.summary("adsbao.external_request.duration.seconds", float64(input.DurationMS)/1000, labels)
	}
	m.recordExternalRequestLog(input, status, class)
}

func (m *Metrics) RecordHTTPRequest(method, route string, status int, durationMS int64) {
	statusText, class := classifyStatus(status, "")
	labels := attrs(
		"method", normalizeHTTPMethod(method),
		"route", normalizeRoute(route),
		"status", normalize(statusText),
		"status_class", normalize(class),
	)
	m.count("adsbao.http.requests", labels)
	if durationMS >= 0 {
		m.summary("adsbao.http.request.duration.seconds", float64(durationMS)/1000, labels)
	}
}

func (m *Metrics) RecordDBTransaction(operation, result string, durationMS int64) {
	labels := attrs(
		"operation", normalize(operation),
		"result", normalize(result),
	)
	m.count("adsbao.db.transactions", labels)
	if durationMS >= 0 {
		m.summary("adsbao.db.transaction.duration.seconds", float64(durationMS)/1000, labels)
	}
}

func (m *Metrics) RecordDynamic(uptimeSec float64, channels []realtime.DebugChannel) {
	m.gauge("adsbao.uptime.seconds", math.Round(uptimeSec), nil)

	type aggregate struct {
		active      int
		subscribers int
		failures    int
		maxInterval int64
		stale       int
	}

	byType := make(map[string]*aggregate, len(dynamicChannelTypes))
	for _, typ := range dynamicChannelTypes {
		byType[typ] = &aggregate{}
	}

	for _, channel := range channels {
		typ := normalize(channel.Type)
		item := byType[typ]
		if item == nil {
			item = &aggregate{}
			byType[typ] = item
		}
		item.active++
		item.subscribers += channel.SubscriberCount
		item.failures += channel.ConsecutiveFailures
		if channel.CurrentIntervalMS > item.maxInterval {
			item.maxInterval = channel.CurrentIntervalMS
		}
		if channel.Stale {
			item.stale++
		}
	}

	types := make([]string, 0, len(byType))
	for typ := range byType {
		types = append(types, typ)
	}
	sort.Strings(types)

	for _, typ := range types {
		item := byType[typ]
		labels := attrs("channel_type", typ)
		m.gauge("adsbao.active_channels.current", float64(item.active), labels)
		m.gauge("adsbao.subscriptions.current", float64(item.subscribers), labels)
		m.gauge("adsbao.channel_consecutive_failures.current", float64(item.failures), labels)
		m.gauge("adsbao.channel_poll_interval.seconds", float64(item.maxInterval)/1000, labels)
		m.gauge("adsbao.stale_channels.current", float64(item.stale), labels)
	}
}

func (m *Metrics) updateWSConnectionsCurrent(delta int) int {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.wsConnectionsCurrent += delta
	if m.wsConnectionsCurrent < 0 {
		m.wsConnectionsCurrent = 0
	}
	return m.wsConnectionsCurrent
}

func (m *Metrics) count(name string, attributes map[string]string) {
	m.sink.Record(Point{Name: name, Kind: Count, Value: 1, Attributes: attributes})
}

func (m *Metrics) gauge(name string, value float64, attributes map[string]string) {
	m.sink.Record(Point{Name: name, Kind: Gauge, Value: value, Attributes: attributes})
}

func (m *Metrics) summary(name string, value float64, attributes map[string]string) {
	m.sink.Record(Point{Name: name, Kind: Summary, Value: value, Attributes: attributes})
}

func (m *Metrics) recordExternalRequestLog(input realtime.ExternalRequestMetricInput, status, class string) {
	if m.logSink == nil {
		return
	}
	provider := normalize(input.Provider)
	endpoint := normalize(input.Endpoint)
	result := normalize(input.Result)
	status = normalize(status)
	class = normalize(class)
	requestURL, queryParams := externalRequestURLParts(input.URL)
	errorText := truncateExternalLogValue(strings.TrimSpace(input.Error))
	durationSeconds := float64(input.DurationMS) / 1000
	attributes := map[string]any{
		"event.name":       "external_request_done",
		"provider":         provider,
		"endpoint":         endpoint,
		"result":           result,
		"status":           status,
		"status_code":      status,
		"status.class":     class,
		"status_class":     class,
		"duration.ms":      input.DurationMS,
		"duration_ms":      input.DurationMS,
		"duration.seconds": durationSeconds,
		"duration_seconds": durationSeconds,
	}
	if requestURL != "" {
		attributes["url"] = requestURL
	}
	if queryParams != "" {
		attributes["query_params"] = queryParams
	}
	if errorText != "" {
		attributes["error"] = errorText
	}
	m.logSink.RecordLog(
		externalRequestLogLevel(result, class),
		externalRequestLogMessage(status, requestURL, queryParams, errorText, input.DurationMS),
		attributes,
	)
}

func externalRequestLogMessage(status, requestURL, queryParams, errorText string, durationMS int64) string {
	if requestURL == "" {
		requestURL = "unknown"
	}
	parts := []string{fmt.Sprintf("[%s]%s", normalize(status), requestURL)}
	if queryParams != "" {
		parts = append(parts, "params: "+queryParams)
	}
	if errorText != "" {
		parts = append(parts, "error: "+errorText)
	}
	parts = append(parts, fmt.Sprintf("duration: %dms", durationMS))
	return strings.Join(parts, ", ")
}

func externalRequestURLParts(rawURL string) (string, string) {
	rawURL = strings.TrimSpace(rawURL)
	if rawURL == "" {
		return "", ""
	}
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return truncateExternalLogValue(rawURL), ""
	}
	query := sanitizedQuery(parsed.Query())
	parsed.RawQuery = ""
	parsed.Fragment = ""
	return truncateExternalLogValue(parsed.String()), query
}

func sanitizedQuery(values url.Values) string {
	if len(values) == 0 {
		return ""
	}
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	parts := make([]string, 0, len(values))
	for _, key := range keys {
		vals := values[key]
		if sensitiveQueryKey(key) {
			parts = append(parts, key+"=[redacted]")
			continue
		}
		for _, value := range vals {
			parts = append(parts, key+"="+value)
		}
	}
	return truncateExternalLogValue(strings.Join(parts, "&"))
}

func sensitiveQueryKey(key string) bool {
	key = strings.ToLower(key)
	return strings.Contains(key, "key") ||
		strings.Contains(key, "token") ||
		strings.Contains(key, "secret") ||
		strings.Contains(key, "password")
}

func truncateExternalLogValue(value string) string {
	const maxLogValueBytes = 4094
	if len(value) <= maxLogValueBytes {
		return value
	}
	return value[:maxLogValueBytes]
}

func externalRequestLogLevel(result, class string) string {
	normalizedResult := normalize(result)
	normalizedClass := normalize(class)
	switch {
	case normalizedResult == "success" && normalizedClass != "4xx" && normalizedClass != "5xx":
		return "info"
	case normalizedClass == "4xx":
		return "warn"
	default:
		return "error"
	}
}

type noopSink struct{}

func (noopSink) Record(Point)                   {}
func (noopSink) Flush(context.Context) error    { return nil }
func (noopSink) Shutdown(context.Context) error { return nil }

type BetterStackOptions struct {
	SourceToken string
	Endpoint    string
	ServiceName string
	Environment string
	HTTPClient  *http.Client
	Now         func() time.Time
	MaxBatch    int
}

type betterStackSink struct {
	mu          sync.Mutex
	points      []Point
	sourceToken string
	endpoint    string
	serviceName string
	environment string
	client      *http.Client
	now         func() time.Time
	maxBatch    int
}

func BetterStackSink(options BetterStackOptions) Sink {
	sourceToken := strings.TrimSpace(options.SourceToken)
	endpoint := betterStackMetricsEndpoint(options.Endpoint)
	if sourceToken == "" || endpoint == "" {
		return noopSink{}
	}
	serviceName := strings.TrimSpace(options.ServiceName)
	if serviceName == "" {
		serviceName = "adsbao-data-service"
	}
	environment := strings.TrimSpace(options.Environment)
	if environment == "" {
		environment = "production"
	}
	client := options.HTTPClient
	if client == nil {
		client = &http.Client{Timeout: 10 * time.Second}
	}
	now := options.Now
	if now == nil {
		now = time.Now
	}
	maxBatch := options.MaxBatch
	if maxBatch <= 0 {
		maxBatch = 1000
	}
	return &betterStackSink{
		sourceToken: sourceToken,
		endpoint:    endpoint,
		serviceName: serviceName,
		environment: environment,
		client:      client,
		now:         now,
		maxBatch:    maxBatch,
	}
}

func (s *betterStackSink) Record(point Point) {
	if point.Name == "" || point.Kind == "" {
		return
	}
	point.Attributes = copyAttributes(point.Attributes)
	s.mu.Lock()
	defer s.mu.Unlock()
	if len(s.points) >= s.maxBatch {
		copy(s.points, s.points[1:])
		s.points[len(s.points)-1] = point
		return
	}
	s.points = append(s.points, point)
}

func (s *betterStackSink) Flush(ctx context.Context) error {
	points := s.drain()
	if len(points) == 0 {
		return nil
	}
	body, err := json.Marshal(s.betterStackMetrics(points))
	if err != nil {
		s.requeue(points)
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.endpoint, bytes.NewReader(body))
	if err != nil {
		s.requeue(points)
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.sourceToken)
	resp, err := s.client.Do(req)
	if err != nil {
		s.requeue(points)
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusAccepted {
		responseBody, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		s.requeue(points)
		return fmt.Errorf("better stack metrics status %d: %s", resp.StatusCode, strings.TrimSpace(string(responseBody)))
	}
	return nil
}

func (s *betterStackSink) Shutdown(ctx context.Context) error {
	return s.Flush(ctx)
}

func (s *betterStackSink) drain() []Point {
	s.mu.Lock()
	defer s.mu.Unlock()
	points := s.points
	s.points = nil
	return points
}

func (s *betterStackSink) requeue(points []Point) {
	s.mu.Lock()
	defer s.mu.Unlock()
	combined := append(points, s.points...)
	if len(combined) > s.maxBatch {
		combined = combined[len(combined)-s.maxBatch:]
	}
	s.points = combined
}

type betterStackMetric struct {
	Name      string                `json:"name"`
	Dt        string                `json:"dt"`
	Tags      map[string]string     `json:"tags,omitempty"`
	Counter   *betterStackValue     `json:"counter,omitempty"`
	Gauge     *betterStackValue     `json:"gauge,omitempty"`
	Histogram *betterStackHistogram `json:"histogram,omitempty"`
}

type betterStackValue struct {
	Value float64 `json:"value"`
}

type betterStackHistogram struct {
	Count   int                          `json:"count"`
	Sum     float64                      `json:"sum"`
	Buckets []betterStackHistogramBucket `json:"buckets"`
}

type betterStackHistogramBucket struct {
	UpperLimit float64 `json:"upper_limit"`
	Count      int     `json:"count"`
}

func (s *betterStackSink) betterStackMetrics(points []Point) []betterStackMetric {
	out := make([]betterStackMetric, 0, len(points))
	dt := s.now().UTC().Format(time.RFC3339Nano)
	for _, point := range points {
		metric := betterStackMetric{
			Name: point.Name,
			Dt:   dt,
			Tags: s.metricTags(point.Attributes),
		}
		switch point.Kind {
		case Count:
			metric.Counter = &betterStackValue{Value: point.Value}
		case Summary:
			metric.Histogram = histogramObservation(point.Name, point.Value)
		default:
			metric.Gauge = &betterStackValue{Value: point.Value}
		}
		out = append(out, metric)
	}
	return out
}

func (s *betterStackSink) metricTags(attrs map[string]string) map[string]string {
	tags := map[string]string{
		"service.name":   s.serviceName,
		"adsbao.service": s.serviceName,
		"environment":    s.environment,
	}
	for key, value := range attrs {
		if strings.TrimSpace(key) != "" && strings.TrimSpace(value) != "" {
			tags[key] = value
		}
	}
	return tags
}

func histogramObservation(name string, value float64) *betterStackHistogram {
	limits := histogramLimits(name, value)
	buckets := make([]betterStackHistogramBucket, 0, len(limits))
	for _, limit := range limits {
		count := 0
		if value <= limit {
			count = 1
		}
		buckets = append(buckets, betterStackHistogramBucket{UpperLimit: limit, Count: count})
	}
	return &betterStackHistogram{Count: 1, Sum: value, Buckets: buckets}
}

func histogramLimits(name string, value float64) []float64 {
	var limits []float64
	if strings.Contains(name, ".bytes") {
		limits = []float64{64, 256, 1024, 4096, 16384, 65536, 262144, 1048576}
	} else {
		limits = []float64{0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60}
	}
	if value > limits[len(limits)-1] {
		limits = append(limits, value)
	}
	return limits
}

func attrs(pairs ...string) map[string]string {
	if len(pairs) == 0 {
		return nil
	}
	out := make(map[string]string, len(pairs)/2)
	for i := 0; i+1 < len(pairs); i += 2 {
		out[pairs[i]] = pairs[i+1]
	}
	return out
}

func copyAttributes(input map[string]string) map[string]string {
	if len(input) == 0 {
		return nil
	}
	out := make(map[string]string, len(input))
	for key, value := range input {
		out[key] = value
	}
	return out
}

func classifyStatus(status any, result string) (string, string) {
	switch value := status.(type) {
	case int:
		return strconv.Itoa(value), fmt.Sprintf("%dxx", value/100)
	case int64:
		return strconv.FormatInt(value, 10), fmt.Sprintf("%dxx", value/100)
	case float64:
		if math.Trunc(value) == value {
			return strconv.Itoa(int(value)), fmt.Sprintf("%dxx", int(value)/100)
		}
	}
	normalized := normalize(status)
	if normalized != "unknown" {
		return normalized, strings.ToLower(normalized)
	}
	if result == "success" {
		return "unknown", "ok"
	}
	return "unknown", "unknown"
}

func normalize(value any) string {
	text := strings.TrimSpace(fmt.Sprint(value))
	if text == "" || text == "<nil>" {
		text = "unknown"
	}
	var b strings.Builder
	for _, r := range text {
		switch {
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z', r >= '0' && r <= '9', r == '_', r == '.', r == ':', r == '+', r == '-':
			b.WriteRune(r)
		default:
			b.WriteRune('_')
		}
		if b.Len() >= 80 {
			break
		}
	}
	out := b.String()
	if out == "" {
		return "unknown"
	}
	return out
}

func normalizeHTTPMethod(value string) string {
	value = strings.ToUpper(strings.TrimSpace(value))
	if value == "" {
		return "UNKNOWN"
	}
	return normalize(value)
}

func normalizeRoute(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return "unknown"
	}
	if len(value) > 120 {
		value = value[:120]
	}
	return value
}

func normalizeMessageType(value string) string {
	switch value {
	case "aircraft:update", "channel:error", "connection:ready", "error", "invalid", "ping", "pong", "route:update", "subscribe", "subscribe:error", "subscribed:ready", "subscribed:removed", "unsubscribe":
		return value
	default:
		return "unknown"
	}
}

func betterStackMetricsEndpoint(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	if !strings.HasPrefix(raw, "http://") && !strings.HasPrefix(raw, "https://") {
		raw = "https://" + raw
	}
	parsed, err := url.Parse(raw)
	if err != nil || parsed.Host == "" {
		return ""
	}
	path := strings.TrimRight(parsed.Path, "/")
	if path == "" {
		parsed.Path = "/metrics"
	} else {
		parsed.Path = path
	}
	return parsed.String()
}
