package webapi

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"
)

type fakeTraceCache struct {
	mu       sync.Mutex
	raw      json.RawMessage
	age      time.Duration
	ok       bool
	ttl      time.Duration
	getCalls int
	failGet  bool
	t        *testing.T
	putCh    chan json.RawMessage
}

func (c *fakeTraceCache) GetTrace(ctx context.Context, hex string) (json.RawMessage, time.Duration, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.getCalls++
	if c.failGet {
		c.t.Fatalf("GetTrace must not be called")
	}
	return c.raw, c.age, c.ok
}

func (c *fakeTraceCache) PutTrace(ctx context.Context, hex string, response json.RawMessage) {
	if c.putCh != nil {
		c.putCh <- response
	}
}

func (c *fakeTraceCache) TTL() time.Duration { return c.ttl }

func TestAircraftTraceServesFreshCache(t *testing.T) {
	cache := &fakeTraceCache{
		raw: json.RawMessage(`{"hex":"C00DEA","recent":{"trace":[1]},"source":"adsb.lol","cached":true}`),
		age: time.Minute,
		ok:  true,
		ttl: 5 * time.Minute,
	}
	handler := New(Options{
		TraceCache: cache,
		HTTPClient: &http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			t.Fatalf("upstream must not be called on a fresh cache hit")
			return nil, nil
		})},
	})

	req := httptest.NewRequest(http.MethodGet, "/api/proxy/aircraft/trace/C00DEA", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d body=%s", rr.Code, rr.Body.String())
	}
	if rr.Header().Get("X-Cache") != "fresh" {
		t.Fatalf("X-Cache = %q", rr.Header().Get("X-Cache"))
	}
	if rr.Body.String() != string(cache.raw) {
		t.Fatalf("body = %s", rr.Body.String())
	}
}

func TestAircraftTraceCachesRecentMiss(t *testing.T) {
	putCh := make(chan json.RawMessage, 1)
	cache := &fakeTraceCache{ok: false, ttl: 5 * time.Minute, putCh: putCh}
	handler := New(Options{
		TraceCache: cache,
		HTTPClient: &http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			return jsonResponse(http.StatusOK, `{"trace":[[0,42.3,-71.0]]}`), nil
		})},
	})

	req := httptest.NewRequest(http.MethodGet, "/api/proxy/aircraft/trace/C00DEA", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d body=%s", rr.Code, rr.Body.String())
	}
	if rr.Header().Get("X-Cache") != "miss" {
		t.Fatalf("X-Cache = %q", rr.Header().Get("X-Cache"))
	}
	select {
	case raw := <-putCh:
		var stored map[string]any
		if err := json.Unmarshal(raw, &stored); err != nil {
			t.Fatalf("stored json: %v", err)
		}
		if stored["source"] != "adsb.lol" || stored["hex"] != "C00DEA" {
			t.Fatalf("stored = %#v", stored)
		}
	case <-time.After(time.Second):
		t.Fatalf("expected PutTrace on a successful recent fetch")
	}
}

func TestAircraftTraceFullBypassesCache(t *testing.T) {
	cache := &fakeTraceCache{ttl: 5 * time.Minute, failGet: true, t: t, putCh: make(chan json.RawMessage, 1)}
	handler := New(Options{
		TraceCache: cache,
		HTTPClient: &http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			return jsonResponse(http.StatusOK, `{"trace":[[0,42.3,-71.0]]}`), nil
		})},
	})

	req := httptest.NewRequest(http.MethodGet, "/api/proxy/aircraft/trace/C00DEA?full=1", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d body=%s", rr.Code, rr.Body.String())
	}
	if cache.getCalls != 0 {
		t.Fatalf("full trace must not read the cache (getCalls=%d)", cache.getCalls)
	}
	select {
	case <-cache.putCh:
		t.Fatalf("full trace must not be cached")
	default:
	}
}

func TestAircraftTraceStaleServesAndRevalidates(t *testing.T) {
	putCh := make(chan json.RawMessage, 1)
	cache := &fakeTraceCache{
		raw:   json.RawMessage(`{"hex":"C00DEA","recent":{"trace":[1]},"source":"adsb.lol","stale":true}`),
		age:   10 * time.Minute,
		ok:    true,
		ttl:   5 * time.Minute,
		putCh: putCh,
	}
	handler := New(Options{
		TraceCache: cache,
		HTTPClient: &http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			return jsonResponse(http.StatusOK, `{"trace":[[0,42.3,-71.0]]}`), nil
		})},
	})

	req := httptest.NewRequest(http.MethodGet, "/api/proxy/aircraft/trace/C00DEA", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Header().Get("X-Cache") != "stale" {
		t.Fatalf("X-Cache = %q", rr.Header().Get("X-Cache"))
	}
	if rr.Body.String() != string(cache.raw) {
		t.Fatalf("stale body = %s", rr.Body.String())
	}
	select {
	case <-putCh: // background revalidation refreshed the cache
	case <-time.After(2 * time.Second):
		t.Fatalf("expected background revalidation to refresh the cache")
	}
}
