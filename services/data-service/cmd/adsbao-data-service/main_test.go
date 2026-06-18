package main

import (
	"context"
	"net/http"
	"net/url"
	"testing"
	"time"

	"github.com/adsbao/adsbao/services/data-service/internal/metrics"
)

type mainRecordingSink struct {
	points []metrics.Point
}

func (s *mainRecordingSink) Record(point metrics.Point) {
	s.points = append(s.points, point)
}

func (s *mainRecordingSink) Flush(context.Context) error {
	return nil
}

func (s *mainRecordingSink) Shutdown(context.Context) error {
	return nil
}

func TestInstrumentHTTPHandlerRecordsRequestMetrics(t *testing.T) {
	sink := &mainRecordingSink{}
	registry := metrics.New(metrics.WithSink(sink))
	handler := instrumentHTTPHandler(registry, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(time.Millisecond)
		w.WriteHeader(http.StatusTeapot)
	}))

	req := &http.Request{
		Method: http.MethodPost,
		URL:    &url.URL{Path: "/api/search"},
	}
	handler.ServeHTTP(noopResponseWriter{}, req)

	if !hasMetricPoint(sink.points, "adsbao.http.requests", metrics.Count, map[string]string{
		"method":       "POST",
		"route":        "/api/*",
		"status":       "418",
		"status_class": "4xx",
	}) {
		t.Fatalf("missing http request count in %#v", sink.points)
	}
	if !hasMetricPoint(sink.points, "adsbao.http.request.duration.seconds", metrics.Summary, map[string]string{
		"method":       "POST",
		"route":        "/api/*",
		"status":       "418",
		"status_class": "4xx",
	}) {
		t.Fatalf("missing http request duration in %#v", sink.points)
	}
}

type noopResponseWriter struct{}

func (noopResponseWriter) Header() http.Header {
	return http.Header{}
}

func (noopResponseWriter) Write(p []byte) (int, error) {
	return len(p), nil
}

func (noopResponseWriter) WriteHeader(int) {}

func hasMetricPoint(points []metrics.Point, name string, kind metrics.Kind, attrs map[string]string) bool {
	for _, point := range points {
		if point.Name != name || point.Kind != kind {
			continue
		}
		matches := true
		for key, value := range attrs {
			if point.Attributes[key] != value {
				matches = false
				break
			}
		}
		if matches {
			return true
		}
	}
	return false
}

func TestRouteNameKnownEndpoints(t *testing.T) {
	tests := []struct {
		path string
		want string
	}{
		{"/ws", "/ws"},
		{"/health", "/health"},
		{"/debug/channels", "/debug/channels"},
		{"/debug/pprof", "/debug/pprof"},
		{"/debug/pprof/", "/debug/pprof"},
		{"/debug/pprof/cmdline", "/debug/pprof"},
		{"/debug/pprof/profile", "/debug/pprof"},
		{"/debug/pprof/symbol", "/debug/pprof"},
		{"/debug/pprof/trace", "/debug/pprof"},
		{"/debug/pprof/heap", "/debug/pprof"},
	}
	for _, tc := range tests {
		r := &http.Request{URL: &url.URL{Path: tc.path}}
		got := routeName(r)
		if got != tc.want {
			t.Errorf("%s: got %q, want %q", tc.path, got, tc.want)
		}
	}
}

func TestRouteNameApiRoutes(t *testing.T) {
	tests := []string{"/api", "/api/airports", "/api/v1/airports/KBOS", "/api/status"}
	for _, path := range tests {
		r := &http.Request{URL: &url.URL{Path: path}}
		got := routeName(r)
		if got != "/api/*" {
			t.Errorf("%s: got %q, want /api/*", path, got)
		}
	}
}

func TestRouteNameStaticAssets(t *testing.T) {
	// Paths with file extensions are static/hashed assets
	tests := []struct {
		path string
		want string
	}{
		{"/assets/app-abc123.js", "/assets/*"},
		{"/assets/styles.css", "/assets/*"},
		{"/favicon.ico", "/*"}, // root-level asset
		{"/logo.png", "/*"},
	}
	for _, tc := range tests {
		r := &http.Request{URL: &url.URL{Path: tc.path}}
		got := routeName(r)
		if got != tc.want {
			t.Errorf("%s: got %q, want %q", tc.path, got, tc.want)
		}
	}
}

func TestRouteNameSpaFallback(t *testing.T) {
	// Deep links without file extensions → SPA fallback
	tests := []string{"/airport/KBOS", "/airport/ZBAA", "/about", "/settings/profile"}
	for _, path := range tests {
		r := &http.Request{URL: &url.URL{Path: path}}
		got := routeName(r)
		if got != "spa_fallback" {
			t.Errorf("%s: got %q, want spa_fallback", path, got)
		}
	}
}

func TestRouteNameNilSafety(t *testing.T) {
	if got := routeName(nil); got != "unknown" {
		t.Fatalf("nil request: got %q, want unknown", got)
	}
	if got := routeName(&http.Request{}); got != "unknown" {
		t.Fatalf("request with nil URL: got %q, want unknown", got)
	}
}
