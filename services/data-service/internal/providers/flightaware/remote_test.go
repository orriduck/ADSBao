package flightaware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
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
