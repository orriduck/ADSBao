package webapi

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/adsbao/adsbao/services/data-service/internal/realtime"
)

func TestAircraftPositionsRouteUsesUnifiedFetcher(t *testing.T) {
	var got realtime.FetchInput
	handler := New(Options{
		AircraftFetcher: func(ctx context.Context, input realtime.FetchInput) (realtime.Event, error) {
			got = input
			return realtime.Event{
				Type:      "aircraft:update",
				Channel:   input.Channel,
				Source:    "airplanes.live",
				FetchedAt: "2026-06-16T00:00:00Z",
				Data: map[string]any{
					"source":   "airplanes.live",
					"attempts": []string{"adsb.lol:ERR", "airplanes.live:200"},
					"ac": []any{
						map[string]any{
							"hex":    "a1",
							"flight": "TEST1",
							"lat":    42.4,
							"lon":    -71.0,
						},
					},
				},
			}, nil
		},
	})

	req := httptest.NewRequest(http.MethodGet, "/api/proxy/aircraft/positions/42.3656/-71.0096/40", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d body=%s", rr.Code, rr.Body.String())
	}
	if got.Channel != "traffic:center:42.4:-71:40" ||
		got.ChannelType != realtime.ChannelTraffic ||
		got.Target.Kind != "positions" ||
		got.Target.Lat != 42.4 ||
		got.Target.Lon != -71 ||
		got.Target.DistNM != 40 {
		t.Fatalf("fetch input = %#v", got)
	}
	if rr.Header().Get("X-Data-Source") != "airplanes.live" {
		t.Fatalf("source header = %q", rr.Header().Get("X-Data-Source"))
	}
	if rr.Header().Get("X-Provider-Attempts") != "adsb.lol:ERR;airplanes.live:200" {
		t.Fatalf("attempts header = %q", rr.Header().Get("X-Provider-Attempts"))
	}
	var payload map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
		t.Fatalf("invalid json: %v", err)
	}
	if payload["source"] != "airplanes.live" {
		t.Fatalf("payload = %#v", payload)
	}
}
