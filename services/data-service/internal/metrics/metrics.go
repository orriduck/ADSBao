package metrics

import (
	"bytes"
	"fmt"
	"math"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"

	"github.com/adsbao/adsbao/services/data-service/internal/realtime"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/prometheus/common/expfmt"
)

var durationBuckets = []float64{0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30}
var messageByteBuckets = []float64{128, 512, 1024, 4 * 1024, 16 * 1024, 64 * 1024, 256 * 1024, 1024 * 1024}
var dynamicChannelTypes = []string{
	string(realtime.ChannelAircraft),
	string(realtime.ChannelCallsign),
	string(realtime.ChannelRoute),
	string(realtime.ChannelTraffic),
}

type Metrics struct {
	mu       sync.Mutex
	registry *prometheus.Registry

	uptimeSeconds             prometheus.Gauge
	wsConnectionsCurrent      prometheus.Gauge
	wsUpgradesTotal           *prometheus.CounterVec
	wsConnectionsTotal        prometheus.Counter
	wsDisconnectsTotal        *prometheus.CounterVec
	wsConnectionDuration      *prometheus.HistogramVec
	wsMessagesTotal           *prometheus.CounterVec
	wsMessageBytes            *prometheus.HistogramVec
	wsSubscribeTotal          *prometheus.CounterVec
	wsUnsubscribeTotal        *prometheus.CounterVec
	pollRequestsTotal         *prometheus.CounterVec
	pollDuration              *prometheus.HistogramVec
	externalRequestsTotal     *prometheus.CounterVec
	externalRequestDuration   *prometheus.HistogramVec
	activeChannelsCurrent     *prometheus.GaugeVec
	subscriptionsCurrent      *prometheus.GaugeVec
	channelFailuresCurrent    *prometheus.GaugeVec
	channelPollIntervalSecond *prometheus.GaugeVec
	staleChannelsCurrent      *prometheus.GaugeVec
}

func New() *Metrics {
	m := &Metrics{registry: prometheus.NewRegistry()}
	m.uptimeSeconds = prometheus.NewGauge(prometheus.GaugeOpts{Name: "adsbao_uptime_seconds", Help: "Process uptime in seconds."})
	m.wsConnectionsCurrent = prometheus.NewGauge(prometheus.GaugeOpts{Name: "adsbao_ws_connections_current", Help: "Current open WebSocket connections."})
	m.wsUpgradesTotal = prometheus.NewCounterVec(prometheus.CounterOpts{Name: "adsbao_ws_upgrades_total", Help: "Counter for adsbao_ws_upgrades_total."}, []string{"reason", "result"})
	m.wsConnectionsTotal = prometheus.NewCounter(prometheus.CounterOpts{Name: "adsbao_ws_connections_total", Help: "Counter for adsbao_ws_connections_total."})
	m.wsDisconnectsTotal = prometheus.NewCounterVec(prometheus.CounterOpts{Name: "adsbao_ws_disconnects_total", Help: "Counter for adsbao_ws_disconnects_total."}, []string{"close_code", "result"})
	m.wsConnectionDuration = prometheus.NewHistogramVec(prometheus.HistogramOpts{Name: "adsbao_ws_connection_duration_seconds", Help: "Histogram for adsbao_ws_connection_duration_seconds.", Buckets: durationBuckets}, []string{"close_code", "result"})
	m.wsMessagesTotal = prometheus.NewCounterVec(prometheus.CounterOpts{Name: "adsbao_ws_messages_total", Help: "Counter for adsbao_ws_messages_total."}, []string{"direction", "result", "type"})
	m.wsMessageBytes = prometheus.NewHistogramVec(prometheus.HistogramOpts{Name: "adsbao_ws_message_bytes", Help: "Histogram for adsbao_ws_message_bytes.", Buckets: messageByteBuckets}, []string{"direction", "result", "type"})
	m.wsSubscribeTotal = prometheus.NewCounterVec(prometheus.CounterOpts{Name: "adsbao_ws_subscribe_total", Help: "Counter for adsbao_ws_subscribe_total."}, []string{"channel_type", "result"})
	m.wsUnsubscribeTotal = prometheus.NewCounterVec(prometheus.CounterOpts{Name: "adsbao_ws_unsubscribe_total", Help: "Counter for adsbao_ws_unsubscribe_total."}, []string{"channel_type", "result"})
	m.pollRequestsTotal = prometheus.NewCounterVec(prometheus.CounterOpts{Name: "adsbao_poll_requests_total", Help: "Counter for adsbao_poll_requests_total."}, []string{"channel_type", "result", "source"})
	m.pollDuration = prometheus.NewHistogramVec(prometheus.HistogramOpts{Name: "adsbao_poll_duration_seconds", Help: "Histogram for adsbao_poll_duration_seconds.", Buckets: durationBuckets}, []string{"channel_type", "result", "source"})
	m.externalRequestsTotal = prometheus.NewCounterVec(prometheus.CounterOpts{Name: "adsbao_external_requests_total", Help: "Counter for adsbao_external_requests_total."}, []string{"endpoint", "provider", "result", "status", "status_class"})
	m.externalRequestDuration = prometheus.NewHistogramVec(prometheus.HistogramOpts{Name: "adsbao_external_request_duration_seconds", Help: "Histogram for adsbao_external_request_duration_seconds.", Buckets: durationBuckets}, []string{"endpoint", "provider", "result", "status", "status_class"})
	m.activeChannelsCurrent = prometheus.NewGaugeVec(prometheus.GaugeOpts{Name: "adsbao_active_channels_current", Help: "Current active polling channels by channel type."}, []string{"channel_type"})
	m.subscriptionsCurrent = prometheus.NewGaugeVec(prometheus.GaugeOpts{Name: "adsbao_subscriptions_current", Help: "Current active subscriptions by channel type."}, []string{"channel_type"})
	m.channelFailuresCurrent = prometheus.NewGaugeVec(prometheus.GaugeOpts{Name: "adsbao_channel_consecutive_failures_current", Help: "Current sum of consecutive polling failures by channel type."}, []string{"channel_type"})
	m.channelPollIntervalSecond = prometheus.NewGaugeVec(prometheus.GaugeOpts{Name: "adsbao_channel_poll_interval_seconds", Help: "Current maximum polling interval in seconds by channel type."}, []string{"channel_type"})
	m.staleChannelsCurrent = prometheus.NewGaugeVec(prometheus.GaugeOpts{Name: "adsbao_stale_channels_current", Help: "Current stale polling channels by channel type."}, []string{"channel_type"})

	for _, collector := range []prometheus.Collector{
		m.uptimeSeconds,
		m.wsConnectionsCurrent,
		m.wsUpgradesTotal,
		m.wsConnectionsTotal,
		m.wsDisconnectsTotal,
		m.wsConnectionDuration,
		m.wsMessagesTotal,
		m.wsMessageBytes,
		m.wsSubscribeTotal,
		m.wsUnsubscribeTotal,
		m.pollRequestsTotal,
		m.pollDuration,
		m.externalRequestsTotal,
		m.externalRequestDuration,
		m.activeChannelsCurrent,
		m.subscriptionsCurrent,
		m.channelFailuresCurrent,
		m.channelPollIntervalSecond,
		m.staleChannelsCurrent,
	} {
		m.registry.MustRegister(collector)
	}
	return m
}

func (m *Metrics) Handler(uptime func() float64, channels func() []realtime.DebugChannel) http.Handler {
	handler := promhttp.HandlerFor(m.registry, promhttp.HandlerOpts{})
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		m.UpdateDynamic(uptime(), channels())
		handler.ServeHTTP(w, r)
	})
}

func (m *Metrics) Render(uptimeSec float64, channels []realtime.DebugChannel) (string, error) {
	m.UpdateDynamic(uptimeSec, channels)
	families, err := m.registry.Gather()
	if err != nil {
		return "", err
	}
	sort.Slice(families, func(i, j int) bool { return families[i].GetName() < families[j].GetName() })
	var buf bytes.Buffer
	for _, family := range families {
		if _, err := expfmt.MetricFamilyToText(&buf, family); err != nil {
			return "", err
		}
	}
	return buf.String(), nil
}

func (m *Metrics) RecordWSUpgrade(reason, result string) {
	m.wsUpgradesTotal.WithLabelValues(normalize(reason), normalize(result)).Inc()
}

func (m *Metrics) RecordWSConnectionOpened() {
	m.wsConnectionsCurrent.Inc()
	m.wsConnectionsTotal.Inc()
}

func (m *Metrics) RecordWSConnectionClosed(code any, result string, durationMS int64) {
	m.wsConnectionsCurrent.Dec()
	labels := []string{normalize(code), normalize(result)}
	m.wsDisconnectsTotal.WithLabelValues(labels...).Inc()
	if durationMS > 0 {
		m.wsConnectionDuration.WithLabelValues(labels...).Observe(float64(durationMS) / 1000)
	}
}

func (m *Metrics) RecordWSMessage(direction, typ, result string, bytes int) {
	labels := []string{normalize(direction), normalizeMessageType(typ), normalize(result)}
	m.wsMessagesTotal.WithLabelValues(labels[0], labels[2], labels[1]).Inc()
	if bytes >= 0 {
		m.wsMessageBytes.WithLabelValues(labels[0], labels[2], labels[1]).Observe(float64(bytes))
	}
}

func (m *Metrics) RecordWSSubscribe(channelType realtime.ChannelType, result string) {
	m.wsSubscribeTotal.WithLabelValues(normalize(channelType), normalize(result)).Inc()
}

func (m *Metrics) RecordWSUnsubscribe(channelType realtime.ChannelType, result string) {
	m.wsUnsubscribeTotal.WithLabelValues(normalize(channelType), normalize(result)).Inc()
}

func (m *Metrics) RecordPoll(channelType realtime.ChannelType, source, result string, durationMS int64) {
	labels := []string{normalize(channelType), normalize(result), normalize(source)}
	m.pollRequestsTotal.WithLabelValues(labels...).Inc()
	m.pollDuration.WithLabelValues(labels...).Observe(float64(durationMS) / 1000)
}

func (m *Metrics) RecordExternalRequest(input realtime.ExternalRequestMetricInput) {
	status, class := classifyStatus(input.Status, input.Result)
	labels := []string{normalize(input.Endpoint), normalize(input.Provider), normalize(input.Result), normalize(status), normalize(class)}
	m.externalRequestsTotal.WithLabelValues(labels...).Inc()
	m.externalRequestDuration.WithLabelValues(labels...).Observe(float64(input.DurationMS) / 1000)
}

func (m *Metrics) UpdateDynamic(uptimeSec float64, channels []realtime.DebugChannel) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.uptimeSeconds.Set(math.Round(uptimeSec))
	m.activeChannelsCurrent.Reset()
	m.subscriptionsCurrent.Reset()
	m.channelFailuresCurrent.Reset()
	m.channelPollIntervalSecond.Reset()
	m.staleChannelsCurrent.Reset()

	for _, typ := range dynamicChannelTypes {
		m.activeChannelsCurrent.WithLabelValues(typ).Set(0)
		m.subscriptionsCurrent.WithLabelValues(typ).Set(0)
		m.channelFailuresCurrent.WithLabelValues(typ).Set(0)
		m.channelPollIntervalSecond.WithLabelValues(typ).Set(0)
		m.staleChannelsCurrent.WithLabelValues(typ).Set(0)
	}

	type aggregate struct {
		active      int
		subscribers int
		failures    int
		maxInterval int64
		stale       int
	}
	byType := map[string]*aggregate{}
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
	for typ, item := range byType {
		m.activeChannelsCurrent.WithLabelValues(typ).Set(float64(item.active))
		m.subscriptionsCurrent.WithLabelValues(typ).Set(float64(item.subscribers))
		m.channelFailuresCurrent.WithLabelValues(typ).Set(float64(item.failures))
		m.channelPollIntervalSecond.WithLabelValues(typ).Set(float64(item.maxInterval) / 1000)
		m.staleChannelsCurrent.WithLabelValues(typ).Set(float64(item.stale))
	}
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
