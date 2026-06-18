package metrics

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/adsbao/adsbao/services/data-service/internal/realtime"
)

type recordingSink struct {
	points []Point
}

type recordingLogSink struct {
	entries []recordedLog
}

type recordedLog struct {
	level      string
	message    string
	attributes map[string]any
}

func (s *recordingSink) Record(point Point) {
	s.points = append(s.points, point)
}

func (s *recordingSink) Flush(context.Context) error {
	return nil
}

func (s *recordingSink) Shutdown(context.Context) error {
	return nil
}

func (s *recordingLogSink) RecordLog(level, message string, attributes map[string]any) {
	s.entries = append(s.entries, recordedLog{
		level:      level,
		message:    message,
		attributes: attributes,
	})
}

func TestMetricsReportDimensionalBetterStackPoints(t *testing.T) {
	sink := &recordingSink{}
	m := New(WithSink(sink))

	m.RecordWSSubscribe(realtime.ChannelTraffic, "ok")
	m.RecordExternalRequest(realtime.ExternalRequestMetricInput{
		Provider:   "adsb.lol",
		Endpoint:   "positions",
		Result:     "success",
		Status:     200,
		DurationMS: 123,
	})
	m.RecordHTTPRequest("GET", "/api/*", 200, 42)
	m.RecordDBTransaction("read_map_settings", "success", 17)
	lastFetched := "1970-01-01T00:00:00.000Z"
	m.RecordDynamic(10, []realtime.DebugChannel{
		{
			Key:                 "traffic:center:42.4:-71:40",
			Channel:             "traffic:center:42.4:-71:40",
			Type:                realtime.ChannelTraffic,
			SubscriberCount:     2,
			CurrentIntervalMS:   5000,
			LastFetchedAt:       &lastFetched,
			Stale:               true,
			ConsecutiveFailures: 2,
		},
	})

	assertPoint(t, sink.points, "adsbao.ws.subscribe", Count, 1, map[string]string{
		"channel_type": "traffic",
		"result":       "ok",
	})
	assertPoint(t, sink.points, "adsbao.external_requests", Count, 1, map[string]string{
		"endpoint":     "positions",
		"provider":     "adsb.lol",
		"result":       "success",
		"status":       "200",
		"status_class": "2xx",
	})
	assertSummaryPoint(t, sink.points, "adsbao.external_request.duration.seconds", 0.123, map[string]string{
		"endpoint":     "positions",
		"provider":     "adsb.lol",
		"result":       "success",
		"status":       "200",
		"status_class": "2xx",
	})
	assertPoint(t, sink.points, "adsbao.http.requests", Count, 1, map[string]string{
		"method":       "GET",
		"route":        "/api/*",
		"status":       "200",
		"status_class": "2xx",
	})
	assertSummaryPoint(t, sink.points, "adsbao.http.request.duration.seconds", 0.042, map[string]string{
		"method":       "GET",
		"route":        "/api/*",
		"status":       "200",
		"status_class": "2xx",
	})
	assertPoint(t, sink.points, "adsbao.db.transactions", Count, 1, map[string]string{
		"operation": "read_map_settings",
		"result":    "success",
	})
	assertSummaryPoint(t, sink.points, "adsbao.db.transaction.duration.seconds", 0.017, map[string]string{
		"operation": "read_map_settings",
		"result":    "success",
	})
	assertPoint(t, sink.points, "adsbao.active_channels.current", Gauge, 1, map[string]string{"channel_type": "traffic"})
	assertPoint(t, sink.points, "adsbao.subscriptions.current", Gauge, 2, map[string]string{"channel_type": "traffic"})
	assertPoint(t, sink.points, "adsbao.channel_consecutive_failures.current", Gauge, 2, map[string]string{"channel_type": "traffic"})
	assertPoint(t, sink.points, "adsbao.channel_poll_interval.seconds", Gauge, 5, map[string]string{"channel_type": "traffic"})
	assertPoint(t, sink.points, "adsbao.stale_channels.current", Gauge, 1, map[string]string{"channel_type": "traffic"})

	for _, point := range sink.points {
		for key, value := range point.Attributes {
			if key == "channel" || key == "key" || value == "traffic:center:42.4:-71:40" {
				t.Fatalf("high-cardinality channel identity leaked into point %#v", point)
			}
		}
	}
}

func TestMetricsRecordExternalRequestWritesStructuredLog(t *testing.T) {
	logs := &recordingLogSink{}
	m := New(WithLogSink(logs))

	m.RecordExternalRequest(realtime.ExternalRequestMetricInput{
		Provider:   "adsb.lol",
		Endpoint:   "positions",
		Result:     "error",
		Status:     503,
		URL:        "https://api.adsb.lol/v2/aircraft?lat=42.3656&lon=-71.0096&api_key=secret",
		Error:      "HTTP 503",
		DurationMS: 2480,
	})

	if len(logs.entries) != 1 {
		t.Fatalf("logs = %#v", logs.entries)
	}
	entry := logs.entries[0]
	wantMessage := "[503]https://api.adsb.lol/v2/aircraft, params: api_key=[redacted]&lat=42.3656&lon=-71.0096, error: HTTP 503, duration: 2480ms"
	if entry.level != "error" || entry.message != wantMessage {
		t.Fatalf("entry = %#v", entry)
	}
	want := map[string]any{
		"event.name":       "external_request_done",
		"provider":         "adsb.lol",
		"endpoint":         "positions",
		"result":           "error",
		"status":           "503",
		"status.class":     "5xx",
		"status_class":     "5xx",
		"url":              "https://api.adsb.lol/v2/aircraft",
		"query_params":     "api_key=[redacted]&lat=42.3656&lon=-71.0096",
		"error":            "HTTP 503",
		"duration.ms":      int64(2480),
		"duration_ms":      int64(2480),
		"duration.seconds": 2.48,
		"duration_seconds": 2.48,
	}
	for key, value := range want {
		if entry.attributes[key] != value {
			t.Fatalf("attribute %s = %#v, want %#v in %#v", key, entry.attributes[key], value, entry.attributes)
		}
	}
}

func TestBetterStackSinkPostsMetricPayload(t *testing.T) {
	var gotAuth string
	var gotPayload []map[string]any
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		if r.URL.Path != "/metrics" {
			t.Fatalf("path = %q", r.URL.Path)
		}
		if r.Header.Get("Content-Type") != "application/json" {
			t.Fatalf("content-type = %q", r.Header.Get("Content-Type"))
		}
		if err := json.NewDecoder(r.Body).Decode(&gotPayload); err != nil {
			t.Fatalf("decode payload: %v", err)
		}
		w.WriteHeader(http.StatusAccepted)
	}))
	defer server.Close()

	sink := BetterStackSink(BetterStackOptions{
		SourceToken: "test-source-token",
		Endpoint:    server.URL,
		ServiceName: "adsbao-test",
		Environment: "test",
		HTTPClient:  server.Client(),
		Now:         func() time.Time { return time.Unix(1_700_000_000, 123_000_000) },
	})
	sink.Record(Point{
		Name:       "adsbao.ws.subscribe",
		Kind:       Count,
		Value:      1,
		Attributes: map[string]string{"channel_type": "traffic", "result": "ok"},
	})
	sink.Record(Point{
		Name:       "adsbao.http.request.duration.seconds",
		Kind:       Summary,
		Value:      0.42,
		Attributes: map[string]string{"route": "/api/*", "status_class": "2xx"},
	})

	if err := sink.Flush(context.Background()); err != nil {
		t.Fatalf("Flush returned error: %v", err)
	}
	if gotAuth != "Bearer test-source-token" {
		t.Fatalf("authorization header = %q", gotAuth)
	}
	if len(gotPayload) != 2 {
		t.Fatalf("payload length = %d", len(gotPayload))
	}
	counter := gotPayload[0]
	if counter["name"] != "adsbao.ws.subscribe" {
		t.Fatalf("counter = %#v", counter)
	}
	if counter["dt"] != "2023-11-14T22:13:20.123Z" {
		t.Fatalf("counter dt = %#v", counter["dt"])
	}
	counterValue := counter["counter"].(map[string]any)
	if counterValue["value"] != float64(1) {
		t.Fatalf("counter value = %#v", counterValue)
	}
	tags := counter["tags"].(map[string]any)
	if tags["service.name"] != "adsbao-test" ||
		tags["adsbao.service"] != "adsbao-test" ||
		tags["environment"] != "test" ||
		tags["channel_type"] != "traffic" ||
		tags["result"] != "ok" {
		t.Fatalf("tags = %#v", tags)
	}
	histogramMetric := gotPayload[1]
	if histogramMetric["name"] != "adsbao.http.request.duration.seconds" {
		t.Fatalf("histogram metric = %#v", histogramMetric)
	}
	histogram := histogramMetric["histogram"].(map[string]any)
	if histogram["count"] != float64(1) || histogram["sum"] != 0.42 {
		t.Fatalf("histogram = %#v", histogram)
	}
	if len(histogram["buckets"].([]any)) == 0 {
		t.Fatalf("histogram buckets = %#v", histogram)
	}
}

func assertPoint(t *testing.T, points []Point, name string, kind Kind, value float64, attrs map[string]string) {
	t.Helper()
	for _, point := range points {
		if point.Name == name && point.Kind == kind && point.Value == value && hasAttrs(point.Attributes, attrs) {
			return
		}
	}
	t.Fatalf("missing point name=%s kind=%s value=%f attrs=%#v in %#v", name, kind, value, attrs, points)
}

func assertSummaryPoint(t *testing.T, points []Point, name string, value float64, attrs map[string]string) {
	t.Helper()
	for _, point := range points {
		if point.Name == name && point.Kind == Summary && point.Value == value && hasAttrs(point.Attributes, attrs) {
			return
		}
	}
	t.Fatalf("missing summary point name=%s value=%f attrs=%#v in %#v", name, value, attrs, points)
}

func hasAttrs(got, want map[string]string) bool {
	for key, value := range want {
		if got[key] != value {
			return false
		}
	}
	return true
}
