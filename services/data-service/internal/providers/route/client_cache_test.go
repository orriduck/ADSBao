package route

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/adsbao/adsbao/services/data-service/internal/realtime"
)

type fakeRouteCache struct {
	mu      sync.Mutex
	entries map[string]json.RawMessage
	age     time.Duration
	ttl     time.Duration
	puts    int
}

func newFakeRouteCache(ttl time.Duration) *fakeRouteCache {
	return &fakeRouteCache{entries: map[string]json.RawMessage{}, ttl: ttl}
}

func (c *fakeRouteCache) key(callsign, provider string) string { return provider + "|" + callsign }

func (c *fakeRouteCache) GetRoute(ctx context.Context, callsign, provider string) (json.RawMessage, time.Duration, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	raw, ok := c.entries[c.key(callsign, provider)]
	if !ok {
		return nil, 0, false
	}
	return raw, c.age, true
}

func (c *fakeRouteCache) PutRoute(ctx context.Context, callsign, provider string, route json.RawMessage) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.entries[c.key(callsign, provider)] = route
	c.puts++
}

func (c *fakeRouteCache) TTL() time.Duration { return c.ttl }

func routeInput(channel, callsign, provider string) realtime.FetchInput {
	return realtime.FetchInput{
		Channel:     channel,
		ChannelType: realtime.ChannelRoute,
		Target:      realtime.PollingTarget{Kind: "route", Callsign: callsign, RouteProvider: provider},
	}
}

func TestRouteCacheFreshHitSkipsUpstream(t *testing.T) {
	cache := newFakeRouteCache(5 * time.Minute)
	cache.age = time.Minute
	cache.entries[cache.key("DAL123", "adsbdb")] =
		json.RawMessage(`{"origin":{"icao":"KATL"},"destination":{"icao":"KBOS"},"source":"adsbdb"}`)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatalf("upstream must not be called on a fresh cache hit")
	}))
	defer server.Close()

	client := NewClient(Options{ADSBDBBaseURL: server.URL + "/v0", QueueInterval: 0, Cache: cache})
	event, err := client.Fetch(context.Background(), routeInput("route:DAL123", "DAL123", ""))
	if err != nil {
		t.Fatalf("Fetch error: %v", err)
	}
	route := event.Data.(map[string]any)["route"].(map[string]any)
	if route["source"] != "adsbdb" {
		t.Fatalf("route = %#v", route)
	}
	if cache.puts != 0 {
		t.Fatalf("a fresh hit should not rewrite the cache")
	}
}

func TestRouteCacheStoresSuccessfulLookup(t *testing.T) {
	cache := newFakeRouteCache(5 * time.Minute)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"response":{"flightroute":{"callsign":"DAL123","airline":{"icao":"DAL"},"origin":{"icao_code":"KATL","latitude":33.6,"longitude":-84.4},"destination":{"icao_code":"KBOS","latitude":42.3,"longitude":-71.0}}}}`))
	}))
	defer server.Close()

	client := NewClient(Options{ADSBDBBaseURL: server.URL + "/v0", QueueInterval: 0, Cache: cache})
	if _, err := client.Fetch(context.Background(), routeInput("route:DAL123", "DAL123", "")); err != nil {
		t.Fatalf("Fetch error: %v", err)
	}
	if cache.puts != 1 {
		t.Fatalf("expected one cache write, got %d", cache.puts)
	}
	if _, _, ok := cache.GetRoute(context.Background(), "DAL123", "adsbdb"); !ok {
		t.Fatalf("expected an adsbdb-keyed cache entry")
	}
}

func TestRouteCacheServesStaleOnUpstreamError(t *testing.T) {
	cache := newFakeRouteCache(5 * time.Minute)
	cache.age = 10 * time.Minute // stale
	cache.entries[cache.key("DAL123", "adsbdb")] =
		json.RawMessage(`{"origin":{"icao":"KATL"},"destination":{"icao":"KBOS"},"source":"adsbdb"}`)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	client := NewClient(Options{ADSBDBBaseURL: server.URL + "/v0", QueueInterval: 0, Cache: cache})
	event, err := client.Fetch(context.Background(), routeInput("route:DAL123", "DAL123", ""))
	if err != nil {
		t.Fatalf("expected stale fallback, got error: %v", err)
	}
	if event.Data.(map[string]any)["route"] == nil {
		t.Fatalf("expected last-known route on upstream failure")
	}
}

func TestRouteCacheKeyedByProvider(t *testing.T) {
	cache := newFakeRouteCache(5 * time.Minute)
	cache.age = time.Minute
	// Only an adsbdb entry exists; a FlightAware lookup must not read it.
	cache.entries[cache.key("AAL1234", "adsbdb")] =
		json.RawMessage(`{"origin":{"icao":"KATL"},"destination":{"icao":"KBOS"},"source":"adsbdb"}`)

	var flightAwareCalled bool
	client := NewClient(Options{
		QueueInterval: 0,
		Cache:         cache,
		FlightAwareRouteFetcher: func(ctx context.Context, callsign string, m realtime.MetricsSink) (map[string]any, error) {
			flightAwareCalled = true
			return map[string]any{
				"origin":      map[string]any{"icao": "KBOS", "lat": 42.3, "lon": -71.0},
				"destination": map[string]any{"icao": "KLAX", "lat": 33.9, "lon": -118.4},
				"source":      "flightaware",
			}, nil
		},
	})

	event, err := client.Fetch(context.Background(), routeInput("route:AAL1234", "AAL1234", "flightaware"))
	if err != nil {
		t.Fatalf("Fetch error: %v", err)
	}
	if !flightAwareCalled {
		t.Fatalf("a FlightAware lookup must not be served from an adsbdb cache entry")
	}
	route := event.Data.(map[string]any)["route"].(map[string]any)
	if route["source"] != "flightaware" {
		t.Fatalf("route = %#v", route)
	}
	if _, _, ok := cache.GetRoute(context.Background(), "AAL1234", "flightaware"); !ok {
		t.Fatalf("expected a flightaware-keyed cache entry")
	}
}
