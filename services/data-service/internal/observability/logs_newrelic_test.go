package observability

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestNewRelicLogForwarderWritesSourceAndPostsStructuredLogs(t *testing.T) {
	var source bytes.Buffer
	var gotAPIKey string
	var gotPayload []newRelicLogPayload
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAPIKey = r.Header.Get("Api-Key")
		if r.Method != http.MethodPost {
			t.Fatalf("method = %s", r.Method)
		}
		if r.Header.Get("Content-Type") != "application/json" {
			t.Fatalf("content type = %s", r.Header.Get("Content-Type"))
		}
		if err := json.NewDecoder(r.Body).Decode(&gotPayload); err != nil {
			t.Fatalf("decode payload: %v", err)
		}
		w.WriteHeader(http.StatusAccepted)
	}))
	defer server.Close()

	forwarder := NewRelicLogForwarder(NewRelicLogOptions{
		LicenseKey:  "test-license",
		Endpoint:    server.URL,
		AppName:     "adsbao-test",
		Environment: "production",
		Source:      &source,
		Now: func() time.Time {
			return time.UnixMilli(1710000000123)
		},
	})

	if _, err := forwarder.Write([]byte("metrics flush failed: boom\n")); err != nil {
		t.Fatalf("write: %v", err)
	}
	if err := forwarder.Flush(context.Background()); err != nil {
		t.Fatalf("flush: %v", err)
	}

	if source.String() != "metrics flush failed: boom\n" {
		t.Fatalf("source output = %q", source.String())
	}
	if gotAPIKey != "test-license" {
		t.Fatalf("api key = %q", gotAPIKey)
	}
	if len(gotPayload) != 1 || len(gotPayload[0].Logs) != 1 {
		t.Fatalf("payload = %#v", gotPayload)
	}
	attrs := gotPayload[0].Common.Attributes
	if attrs["app.name"] != "adsbao-test" ||
		attrs["service.name"] != "adsbao-data-service" ||
		attrs["environment"] != "production" ||
		attrs["logtype"] != "adsbao-data-service" {
		t.Fatalf("common attrs = %#v", attrs)
	}
	log := gotPayload[0].Logs[0]
	if log.Timestamp != 1710000000123 ||
		log.Message != "metrics flush failed: boom" ||
		log.Level != "error" {
		t.Fatalf("log = %#v", log)
	}
}

func TestNewRelicLogForwarderPostsStructuredAttributes(t *testing.T) {
	var gotPayload []newRelicLogPayload
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := json.NewDecoder(r.Body).Decode(&gotPayload); err != nil {
			t.Fatalf("decode payload: %v", err)
		}
		w.WriteHeader(http.StatusAccepted)
	}))
	defer server.Close()

	forwarder := NewRelicLogForwarder(NewRelicLogOptions{
		LicenseKey: "test-license",
		Endpoint:   server.URL,
		AppName:    "adsbao-test",
		Now: func() time.Time {
			return time.UnixMilli(1710000000456)
		},
	})

	forwarder.RecordLog("warn", "external_request_done", map[string]any{
		"provider":    "adsb.lol",
		"endpoint":    "positions",
		"status":      "429",
		"duration.ms": int64(982),
	})
	if err := forwarder.Flush(context.Background()); err != nil {
		t.Fatalf("flush: %v", err)
	}

	if len(gotPayload) != 1 || len(gotPayload[0].Logs) != 1 {
		t.Fatalf("payload = %#v", gotPayload)
	}
	log := gotPayload[0].Logs[0]
	if log.Timestamp != 1710000000456 ||
		log.Message != "external_request_done" ||
		log.Level != "warn" {
		t.Fatalf("log = %#v", log)
	}
	if log.Attributes["provider"] != "adsb.lol" ||
		log.Attributes["endpoint"] != "positions" ||
		log.Attributes["status"] != "429" ||
		log.Attributes["duration.ms"] != float64(982) {
		t.Fatalf("attributes = %#v", log.Attributes)
	}
}

func TestNewRelicLogForwarderRequeuesOnFailedFlush(t *testing.T) {
	var attempts int
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		if attempts == 1 {
			http.Error(w, "retry later", http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusAccepted)
	}))
	defer server.Close()

	forwarder := NewRelicLogForwarder(NewRelicLogOptions{
		LicenseKey: "test-license",
		Endpoint:   server.URL,
		AppName:    "adsbao-test",
		Source:     &bytes.Buffer{},
	})

	if _, err := forwarder.Write([]byte("server failed: listen tcp\n")); err != nil {
		t.Fatalf("write: %v", err)
	}
	err := forwarder.Flush(context.Background())
	if err == nil || !strings.Contains(err.Error(), "new relic logs status 503") {
		t.Fatalf("first flush error = %v", err)
	}
	if err := forwarder.Flush(context.Background()); err != nil {
		t.Fatalf("second flush: %v", err)
	}
	if attempts != 2 {
		t.Fatalf("attempts = %d", attempts)
	}
}
