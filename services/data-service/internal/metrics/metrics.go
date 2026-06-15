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

const defaultNewRelicEndpoint = "https://metric-api.newrelic.com/metric/v1"

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

type APMReporter interface {
	RecordCustomMetric(name string, value float64)
	RecordCustomEvent(eventType string, params map[string]interface{})
}

type Option func(*Metrics)

type Metrics struct {
	mu                   sync.Mutex
	sink                 Sink
	logSink              LogSink
	apmReporter          APMReporter
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

func WithAPMReporter(reporter APMReporter) Option {
	return func(m *Metrics) {
		if reporter != nil {
			m.apmReporter = reporter
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
	m.recordExternalRequestAPM(input, status, class)
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

func (m *Metrics) recordExternalRequestAPM(input realtime.ExternalRequestMetricInput, status, class string) {
	if m.apmReporter == nil {
		return
	}
	durationSeconds := float64(input.DurationMS) / 1000
	m.apmReporter.RecordCustomMetric("ExternalRequest/Count", 1)
	if input.DurationMS >= 0 {
		m.apmReporter.RecordCustomMetric("ExternalRequest/DurationSeconds", durationSeconds)
	}
	m.apmReporter.RecordCustomEvent("ADSBaoExternalRequest", map[string]interface{}{
		"provider":        normalize(input.Provider),
		"endpoint":        normalize(input.Endpoint),
		"result":          normalize(input.Result),
		"status":          normalize(status),
		"statusClass":     normalize(class),
		"durationMs":      input.DurationMS,
		"durationSeconds": durationSeconds,
	})
}

type noopSink struct{}

func (noopSink) Record(Point)                   {}
func (noopSink) Flush(context.Context) error    { return nil }
func (noopSink) Shutdown(context.Context) error { return nil }

type NewRelicOptions struct {
	LicenseKey string
	Endpoint   string
	AppName    string
	HTTPClient *http.Client
	Now        func() time.Time
	MaxBatch   int
}

type newRelicSink struct {
	mu         sync.Mutex
	points     []Point
	licenseKey string
	endpoint   string
	appName    string
	client     *http.Client
	now        func() time.Time
	maxBatch   int
}

func NewRelicSink(options NewRelicOptions) Sink {
	licenseKey := strings.TrimSpace(options.LicenseKey)
	if licenseKey == "" {
		return noopSink{}
	}
	endpoint := strings.TrimSpace(options.Endpoint)
	if endpoint == "" {
		endpoint = defaultNewRelicEndpoint
	}
	appName := strings.TrimSpace(options.AppName)
	if appName == "" {
		appName = "adsbao-data-service"
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
	return &newRelicSink{
		licenseKey: licenseKey,
		endpoint:   endpoint,
		appName:    appName,
		client:     client,
		now:        now,
		maxBatch:   maxBatch,
	}
}

func (s *newRelicSink) Record(point Point) {
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

func (s *newRelicSink) Flush(ctx context.Context) error {
	points := s.drain()
	if len(points) == 0 {
		return nil
	}
	body, err := json.Marshal([]newRelicPayload{{
		Common: newRelicCommon{
			Timestamp: s.now().UnixMilli(),
			Attributes: map[string]string{
				"app.name":     s.appName,
				"service.name": "adsbao-data-service",
			},
		},
		Metrics: newRelicMetrics(points),
	}})
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
	req.Header.Set("Api-Key", s.licenseKey)
	resp, err := s.client.Do(req)
	if err != nil {
		s.requeue(points)
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusAccepted {
		responseBody, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		s.requeue(points)
		return fmt.Errorf("new relic metrics status %d: %s", resp.StatusCode, strings.TrimSpace(string(responseBody)))
	}
	return nil
}

func (s *newRelicSink) Shutdown(ctx context.Context) error {
	return s.Flush(ctx)
}

func (s *newRelicSink) drain() []Point {
	s.mu.Lock()
	defer s.mu.Unlock()
	points := s.points
	s.points = nil
	return points
}

func (s *newRelicSink) requeue(points []Point) {
	s.mu.Lock()
	defer s.mu.Unlock()
	combined := append(points, s.points...)
	if len(combined) > s.maxBatch {
		combined = combined[len(combined)-s.maxBatch:]
	}
	s.points = combined
}

type newRelicPayload struct {
	Common  newRelicCommon   `json:"common"`
	Metrics []newRelicMetric `json:"metrics"`
}

type newRelicCommon struct {
	Timestamp  int64             `json:"timestamp"`
	Attributes map[string]string `json:"attributes"`
}

type newRelicMetric struct {
	Name       string            `json:"name"`
	Type       Kind              `json:"type"`
	Value      any               `json:"value"`
	IntervalMS int64             `json:"interval.ms,omitempty"`
	Attributes map[string]string `json:"attributes,omitempty"`
}

func newRelicMetrics(points []Point) []newRelicMetric {
	out := make([]newRelicMetric, 0, len(points))
	for _, point := range points {
		metric := newRelicMetric{
			Name:       point.Name,
			Type:       point.Kind,
			Attributes: point.Attributes,
		}
		switch point.Kind {
		case Count:
			metric.Value = point.Value
			metric.IntervalMS = 1000
		case Summary:
			metric.Value = map[string]float64{
				"count": 1,
				"sum":   point.Value,
				"min":   point.Value,
				"max":   point.Value,
			}
			metric.IntervalMS = 1000
		default:
			metric.Type = Gauge
			metric.Value = point.Value
		}
		out = append(out, metric)
	}
	return out
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

func normalizeMessageType(value string) string {
	switch value {
	case "aircraft:update", "channel:error", "connection:ready", "error", "invalid", "ping", "pong", "route:update", "subscribe", "subscribe:error", "subscribed:ready", "subscribed:removed", "unsubscribe":
		return value
	default:
		return "unknown"
	}
}
