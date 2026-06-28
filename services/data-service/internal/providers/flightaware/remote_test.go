package flightaware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestRemoteClientUsesPrivateService(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/flightaware/callsign/DAL58" {
			t.Fatalf("path = %s", r.URL.Path)
		}
		if r.Header.Get("Authorization") != "Bearer secret" {
			t.Fatalf("authorization = %q", r.Header.Get("Authorization"))
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"ok": true,
			"hasPosition": true,
			"fetchedAt": "2026-06-19T18:00:00Z",
			"position": {"lat": 49.05, "lon": -48.9, "callsign": "DAL58"}
		}`))
	}))
	defer server.Close()

	client := NewRemoteClient(RemoteOptions{
		BaseURL:    server.URL,
		Token:      "secret",
		HTTPClient: server.Client(),
	})
	result, err := client.ByCallsign(context.Background(), "DAL58", nil)
	if err != nil {
		t.Fatalf("ByCallsign returned error: %v", err)
	}
	if !result.OK || !result.HasPosition || result.Position["lat"] != 49.05 {
		t.Fatalf("result = %#v", result)
	}
}

func TestRemoteClientFetchesPrivateRoute(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/flightaware/route/AAL1234" {
			t.Fatalf("path = %s", r.URL.Path)
		}
		if r.Header.Get("Authorization") != "Bearer secret" {
			t.Fatalf("authorization = %q", r.Header.Get("Authorization"))
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"callsign": "AAL1234",
			"route": {
				"callsign": "AAL1234",
				"origin": {"icao": "KBOS", "iata": "BOS", "lat": 42.3656, "lon": -71.0096},
				"destination": {"icao": "KLAX", "iata": "LAX", "lat": 33.9416, "lon": -118.4085},
				"route": {"iata": "BOS-LAX", "icao": "KBOS-KLAX"},
				"source": "flightaware"
			}
		}`))
	}))
	defer server.Close()

	client := NewRemoteClient(RemoteOptions{
		BaseURL:    server.URL,
		Token:      "secret",
		HTTPClient: server.Client(),
	})
	route, err := client.Route(context.Background(), "AAL1234", nil)
	if err != nil {
		t.Fatalf("Route returned error: %v", err)
	}
	codes := route["route"].(map[string]any)
	if route["source"] != "flightaware" || codes["iata"] != "BOS-LAX" {
		t.Fatalf("route = %#v", route)
	}
}

// The route layer owns the route timeout (via the caller's ctx deadline), not
// remote.go. Route must honor that deadline rather than imposing the tighter
// callsign-fallback timeout on the scrape.
func TestRemoteClientRouteHonorsCallerDeadline(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(120 * time.Millisecond)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"callsign":"AAL1234","route":{"origin":{"icao":"KBOS","lat":42.3,"lon":-71.0},"destination":{"icao":"KLAX","lat":33.9,"lon":-118.4},"source":"flightaware"}}`))
	}))
	defer server.Close()

	// The tight 20ms callsign-fallback timeout must NOT apply to route scrapes; a
	// generous caller deadline lets this one complete.
	client := NewRemoteClient(RemoteOptions{
		BaseURL:    server.URL,
		Token:      "secret",
		HTTPClient: server.Client(),
		Timeout:    20 * time.Millisecond,
	})
	okCtx, cancelOK := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancelOK()
	route, err := client.Route(okCtx, "AAL1234", nil)
	if err != nil {
		t.Fatalf("Route returned error despite a generous caller deadline: %v", err)
	}
	if route["source"] != "flightaware" {
		t.Fatalf("route = %#v", route)
	}

	// A tight caller deadline is honored and surfaces a timeout.
	tightCtx, cancelTight := context.WithTimeout(context.Background(), 10*time.Millisecond)
	defer cancelTight()
	if _, err := client.Route(tightCtx, "AAL1234", nil); err == nil {
		t.Fatalf("expected a deadline error from a tight caller context")
	}
}
