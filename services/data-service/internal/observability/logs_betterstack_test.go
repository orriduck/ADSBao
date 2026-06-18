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

func TestBetterStackLogForwarderWritesSourceAndPostsStructuredLogs(t *testing.T) {
	var source bytes.Buffer
	var gotAuth string
	var gotPayload []betterStackLogEntry
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
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

	forwarder := NewBetterStackLogForwarder(BetterStackLogOptions{
		SourceToken: "test-source-token",
		Endpoint:    server.URL,
		ServiceName: "adsbao-test",
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
	if gotAuth != "Bearer test-source-token" {
		t.Fatalf("authorization = %q", gotAuth)
	}
	if len(gotPayload) != 1 {
		t.Fatalf("payload = %#v", gotPayload)
	}
	log := gotPayload[0]
	if log.Timestamp != "2024-03-09T16:00:00.123Z" ||
		log.Message != "metrics flush failed: boom" ||
		log.Level != "error" ||
		log.ServiceName != "adsbao-test" ||
		log.ADSBaoService != "adsbao-test" ||
		log.Environment != "production" {
		t.Fatalf("log = %#v", log)
	}
}

func TestBetterStackLogForwarderPostsStructuredAttributes(t *testing.T) {
	var gotPayload []betterStackLogEntry
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := json.NewDecoder(r.Body).Decode(&gotPayload); err != nil {
			t.Fatalf("decode payload: %v", err)
		}
		w.WriteHeader(http.StatusAccepted)
	}))
	defer server.Close()

	forwarder := NewBetterStackLogForwarder(BetterStackLogOptions{
		SourceToken: "test-source-token",
		Endpoint:    server.URL,
		ServiceName: "adsbao-test",
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

	if len(gotPayload) != 1 {
		t.Fatalf("payload = %#v", gotPayload)
	}
	log := gotPayload[0]
	if log.Timestamp != "2024-03-09T16:00:00.456Z" ||
		log.Message != "external_request_done" ||
		log.Level != "warn" {
		t.Fatalf("log = %#v", log)
	}
	if log.Provider != "adsb.lol" ||
		log.Endpoint != "positions" ||
		log.Status != "429" ||
		log.DurationMS != float64(982) {
		t.Fatalf("log attributes = %#v", log)
	}
}

func TestBetterStackLogForwarderRequeuesOnFailedFlush(t *testing.T) {
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

	forwarder := NewBetterStackLogForwarder(BetterStackLogOptions{
		SourceToken: "test-source-token",
		Endpoint:    server.URL,
		ServiceName: "adsbao-test",
		Source:      &bytes.Buffer{},
	})

	if _, err := forwarder.Write([]byte("server failed: listen tcp\n")); err != nil {
		t.Fatalf("write: %v", err)
	}
	err := forwarder.Flush(context.Background())
	if err == nil || !strings.Contains(err.Error(), "better stack logs status 503") {
		t.Fatalf("first flush error = %v", err)
	}
	if err := forwarder.Flush(context.Background()); err != nil {
		t.Fatalf("second flush: %v", err)
	}
	if attempts != 2 {
		t.Fatalf("attempts = %d", attempts)
	}
}
