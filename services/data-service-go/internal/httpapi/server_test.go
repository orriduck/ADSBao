package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/adsbao/adsbao/services/data-service-go/internal/metrics"
	"github.com/adsbao/adsbao/services/data-service-go/internal/realtime"
)

type fakeDebugScheduler struct{}

func (fakeDebugScheduler) DebugChannels() []realtime.DebugChannel {
	return []realtime.DebugChannel{
		{Key: "traffic:center:42.4:-71:40", Channel: "traffic:center:42.4:-71:40", Type: realtime.ChannelTraffic, SubscriberCount: 2, CurrentIntervalMS: 3000},
	}
}

func TestHealthAndDebugEndpoints(t *testing.T) {
	m := metrics.New()
	server := New(ServerOptions{
		Metrics:       m,
		DebugChannels: fakeDebugScheduler{}.DebugChannels,
		Uptime:        func() time.Duration { return 42 * time.Second },
	})

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rr := httptest.NewRecorder()
	server.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("health status = %d", rr.Code)
	}
	var health map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &health); err != nil {
		t.Fatalf("health JSON error: %v", err)
	}
	if health["ok"] != true || health["service"] != "adsbao-data-service" || health["activeChannels"] != float64(1) {
		t.Fatalf("health = %#v", health)
	}

	req = httptest.NewRequest(http.MethodGet, "/debug/channels", nil)
	rr = httptest.NewRecorder()
	server.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), `"channel":"traffic:center:42.4:-71:40"`) {
		t.Fatalf("debug response status=%d body=%s", rr.Code, rr.Body.String())
	}
}

func TestMetricsEndpoint(t *testing.T) {
	m := metrics.New()
	server := New(ServerOptions{
		Metrics:       m,
		DebugChannels: fakeDebugScheduler{}.DebugChannels,
		Uptime:        func() time.Duration { return 42 * time.Second },
	})
	req := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	rr := httptest.NewRecorder()
	server.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("metrics status = %d", rr.Code)
	}
	if !strings.Contains(rr.Header().Get("Content-Type"), "text/plain") {
		t.Fatalf("metrics content type = %q", rr.Header().Get("Content-Type"))
	}
	if !strings.Contains(rr.Body.String(), "adsbao_uptime_seconds 42") {
		t.Fatalf("metrics body = %s", rr.Body.String())
	}
}
