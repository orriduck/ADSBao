package flightaware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRemoteFallbackClientUsesPrivateService(t *testing.T) {
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

	client := NewRemoteFallbackClient(RemoteFallbackOptions{
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
