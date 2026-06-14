package adsb

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/adsbao/adsbao/services/data-service/internal/realtime"
)

func TestCallsignProviderFallbackRetriesEmptyPayload(t *testing.T) {
	var requested []string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requested = append(requested, r.URL.Path)
		switch {
		case strings.Contains(r.URL.Path, "/adsb-lol/"):
			_, _ = w.Write([]byte(`{"ac":[]}`))
		case strings.Contains(r.URL.Path, "/airplanes/"):
			_, _ = w.Write([]byte(`{"ac":[{"hex":"a50370","type":"adsc","flight":"DAL58   ","lat":49.05,"lon":-48.9}]}`))
		default:
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
	}))
	defer server.Close()

	client := NewClient(Options{
		Providers: []Provider{
			{ID: "adsb.lol", CallsignURL: func(callsign string) string { return server.URL + "/adsb-lol/" + callsign }},
			{ID: "airplanes.live", CallsignURL: func(callsign string) string { return server.URL + "/airplanes/" + callsign }},
		},
	})

	event, err := client.Fetch(context.Background(), realtime.FetchInput{
		Channel:     "callsign:DAL58",
		ChannelType: realtime.ChannelCallsign,
		Target:      realtime.PollingTarget{Kind: "callsign", Callsign: "DAL58"},
	})
	if err != nil {
		t.Fatalf("Fetch returned error: %v", err)
	}
	if event.Type != "aircraft:update" || event.Source != "airplanes.live" {
		t.Fatalf("event = %#v", event)
	}
	data := event.Data.(map[string]any)
	attempts := data["attempts"].([]string)
	if len(attempts) != 2 || attempts[0] != "adsb.lol:200" || attempts[1] != "airplanes.live:200" {
		t.Fatalf("attempts = %#v", attempts)
	}
	if len(requested) != 2 {
		t.Fatalf("request count = %d", len(requested))
	}
}

func TestCallsignCanUseFlightAwareFallbackAfterEmptyADSB(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"ac":[]}`))
	}))
	defer server.Close()

	client := NewClient(Options{
		Providers: []Provider{
			{ID: "adsb.lol", CallsignURL: func(callsign string) string { return server.URL + "/" + callsign }},
		},
		FlightAwareFallback: func(ctx context.Context, callsign string, metrics realtime.MetricsSink) (FallbackResult, error) {
			return FallbackResult{
				OK:          true,
				HasPosition: true,
				FetchedAt:   "2026-06-14T00:00:00Z",
				Position: map[string]any{
					"lat":           49.05,
					"lon":           -48.9,
					"altitudeFt":    37000,
					"groundSpeedKt": 480,
					"trackDeg":      84,
					"callsign":      callsign,
				},
			}, nil
		},
	})

	event, err := client.Fetch(context.Background(), realtime.FetchInput{
		Channel:     "callsign:DAL58",
		ChannelType: realtime.ChannelCallsign,
		Target: realtime.PollingTarget{
			Kind:                "callsign",
			Callsign:            "DAL58",
			FlightAwareFallback: true,
		},
	})
	if err != nil {
		t.Fatalf("Fetch returned error: %v", err)
	}
	if event.Source != "flightaware" {
		t.Fatalf("source = %q", event.Source)
	}
	data := event.Data.(map[string]any)
	ac := data["ac"].([]any)
	if len(ac) != 1 {
		t.Fatalf("ac = %#v", ac)
	}
	aircraft := ac[0].(map[string]any)
	if aircraft["flight_position_source"] != "flightaware" || aircraft["lat"] != 49.05 {
		t.Fatalf("aircraft = %#v", aircraft)
	}
}
