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

func (s *recordingSink) Record(point Point) {
	s.points = append(s.points, point)
}

func (s *recordingSink) Flush(context.Context) error {
	return nil
}

func (s *recordingSink) Shutdown(context.Context) error {
	return nil
}

func TestMetricsReportDimensionalNewRelicPoints(t *testing.T) {
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

func TestNewRelicSinkPostsMetricPayload(t *testing.T) {
	var gotKey string
	var gotPayload []map[string]any
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotKey = r.Header.Get("Api-Key")
		if r.Header.Get("Content-Type") != "application/json" {
			t.Fatalf("content-type = %q", r.Header.Get("Content-Type"))
		}
		if err := json.NewDecoder(r.Body).Decode(&gotPayload); err != nil {
			t.Fatalf("decode payload: %v", err)
		}
		w.WriteHeader(http.StatusAccepted)
	}))
	defer server.Close()

	sink := NewRelicSink(NewRelicOptions{
		LicenseKey: "test-license",
		Endpoint:   server.URL,
		AppName:    "adsbao-test",
		HTTPClient: server.Client(),
		Now:        func() time.Time { return time.Unix(1_700_000_000, 123_000_000) },
	})
	sink.Record(Point{
		Name:       "adsbao.ws.subscribe",
		Kind:       Count,
		Value:      1,
		Attributes: map[string]string{"channel_type": "traffic", "result": "ok"},
	})

	if err := sink.Flush(context.Background()); err != nil {
		t.Fatalf("Flush returned error: %v", err)
	}
	if gotKey != "test-license" {
		t.Fatalf("api key header = %q", gotKey)
	}
	if len(gotPayload) != 1 {
		t.Fatalf("payload length = %d", len(gotPayload))
	}
	common := gotPayload[0]["common"].(map[string]any)
	attrs := common["attributes"].(map[string]any)
	if attrs["app.name"] != "adsbao-test" || attrs["service.name"] != "adsbao-data-service" {
		t.Fatalf("common attrs = %#v", attrs)
	}
	metric := gotPayload[0]["metrics"].([]any)[0].(map[string]any)
	if metric["name"] != "adsbao.ws.subscribe" || metric["type"] != "count" || metric["value"] != float64(1) {
		t.Fatalf("metric = %#v", metric)
	}
	if metric["interval.ms"] != float64(1000) {
		t.Fatalf("interval = %#v", metric["interval.ms"])
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
