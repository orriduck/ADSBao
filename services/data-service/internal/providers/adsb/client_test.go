package adsb

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/adsbao/adsbao/services/data-service/internal/realtime"
)

type recordingMetricsSink struct {
	external []realtime.ExternalRequestMetricInput
}

func (s *recordingMetricsSink) RecordExternalRequest(input realtime.ExternalRequestMetricInput) {
	s.external = append(s.external, input)
}

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

func TestFlightAwareFallbackStartsBeforeEmptyADSBCallsignFinishes(t *testing.T) {
	const adsbDelay = 250 * time.Millisecond
	started := time.Now()
	var fallbackStarted time.Time

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(adsbDelay)
		_, _ = w.Write([]byte(`{"ac":[]}`))
	}))
	defer server.Close()

	client := NewClient(Options{
		Providers: []Provider{
			{ID: "adsb.lol", CallsignURL: func(callsign string) string { return server.URL + "/" + callsign }},
		},
		FlightAwareFallback: func(ctx context.Context, callsign string, metrics realtime.MetricsSink) (FallbackResult, error) {
			fallbackStarted = time.Now()
			return FallbackResult{
				OK:          true,
				HasPosition: true,
				FetchedAt:   "2026-06-14T00:00:00Z",
				Position: map[string]any{
					"lat":      49.05,
					"lon":      -48.9,
					"callsign": callsign,
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
	if fallbackStarted.IsZero() {
		t.Fatal("FlightAware fallback was not called")
	}
	if delay := fallbackStarted.Sub(started); delay >= adsbDelay/2 {
		t.Fatalf("FlightAware fallback started after %s; expected it to hedge before ADS-B finished", delay)
	}
}

func TestFlightAwareFallbackIsCanceledWhenADSBCallsignWins(t *testing.T) {
	fallbackStarted := make(chan struct{}, 1)
	fallbackCanceled := make(chan struct{}, 1)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"ac":[{"hex":"a50370","type":"adsc","flight":"DAL58   ","lat":49.05,"lon":-48.9}]}`))
	}))
	defer server.Close()

	client := NewClient(Options{
		Providers: []Provider{
			{ID: "adsb.lol", CallsignURL: func(callsign string) string { return server.URL + "/" + callsign }},
		},
		FlightAwareFallback: func(ctx context.Context, callsign string, metrics realtime.MetricsSink) (FallbackResult, error) {
			fallbackStarted <- struct{}{}
			<-ctx.Done()
			fallbackCanceled <- struct{}{}
			return FallbackResult{}, ctx.Err()
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
	if event.Source != "adsb.lol" {
		t.Fatalf("source = %q", event.Source)
	}
	select {
	case <-fallbackStarted:
	case <-time.After(time.Second):
		t.Fatal("FlightAware fallback did not start")
	}
	select {
	case <-fallbackCanceled:
	case <-time.After(time.Second):
		t.Fatal("FlightAware fallback was not canceled after ADS-B won")
	}
}

func TestPositionProviderMetricsIncludeRequestURLAndError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "limited", http.StatusTooManyRequests)
	}))
	defer server.Close()

	metrics := &recordingMetricsSink{}
	client := NewClient(Options{
		Providers: []Provider{
			{ID: "adsb.lol", PositionURL: func(lat, lon float64, distNM int) string {
				return server.URL + "/adsb-lol/positions?lat=42.4&lon=-71&dist=40"
			}},
		},
	})

	_, err := client.Fetch(context.Background(), realtime.FetchInput{
		Channel:     "traffic:center:42.4:-71:40",
		ChannelType: realtime.ChannelTraffic,
		Metrics:     metrics,
		Target: realtime.PollingTarget{
			Kind:   "positions",
			Lat:    42.4,
			Lon:    -71,
			DistNM: 40,
		},
	})
	if err == nil {
		t.Fatal("Fetch returned nil error")
	}
	if len(metrics.external) != 1 {
		t.Fatalf("external metrics = %#v", metrics.external)
	}
	entry := metrics.external[0]
	if entry.URL != server.URL+"/adsb-lol/positions?lat=42.4&lon=-71&dist=40" ||
		entry.Error != "HTTP 429" ||
		entry.Status != http.StatusTooManyRequests ||
		entry.DurationMS < 0 {
		t.Fatalf("external metric = %#v", entry)
	}
}

func TestPositionProviderHedgesSlowFirstProvider(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.Contains(r.URL.Path, "/adsb-lol/"):
			time.Sleep(200 * time.Millisecond)
			_, _ = w.Write([]byte(`{"ac":[{"hex":"slow","flight":"SLOW1   ","lat":42.1,"lon":-71.1}]}`))
		case strings.Contains(r.URL.Path, "/airplanes/"):
			_, _ = w.Write([]byte(`{"ac":[{"hex":"fast","flight":"FAST1   ","lat":42.2,"lon":-71.2}]}`))
		default:
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
	}))
	defer server.Close()

	client := NewClient(Options{
		Providers: []Provider{
			{ID: "adsb.lol", PositionURL: func(lat, lon float64, distNM int) string { return server.URL + "/adsb-lol/positions" }},
			{ID: "airplanes.live", PositionURL: func(lat, lon float64, distNM int) string { return server.URL + "/airplanes/positions" }},
		},
		PositionHedgeDelay: 10 * time.Millisecond,
	})

	started := time.Now()
	event, err := client.Fetch(context.Background(), realtime.FetchInput{
		Channel:     "traffic:center:42.4:-71:40",
		ChannelType: realtime.ChannelTraffic,
		Target: realtime.PollingTarget{
			Kind:   "positions",
			Lat:    42.4,
			Lon:    -71,
			DistNM: 40,
		},
	})
	if err != nil {
		t.Fatalf("Fetch returned error: %v", err)
	}
	if elapsed := time.Since(started); elapsed >= 150*time.Millisecond {
		t.Fatalf("hedged fetch waited for slow provider: %s", elapsed)
	}
	if event.Source != "airplanes.live" {
		t.Fatalf("source = %q", event.Source)
	}
	attempts := event.Data.(map[string]any)["attempts"].([]string)
	if len(attempts) != 1 || attempts[0] != "airplanes.live:200" {
		t.Fatalf("attempts = %#v", attempts)
	}
}

func TestPositionProviderProbesWhenAllProvidersAreInCooldown(t *testing.T) {
	now := time.Unix(1_800_000_000, 0)
	var requests int
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests++
		if requests == 1 {
			http.Error(w, "temporary", http.StatusTooManyRequests)
			return
		}
		_, _ = w.Write([]byte(`{"ac":[{"hex":"a1","flight":"TEST1   ","lat":42.1,"lon":-71.1}]}`))
	}))
	defer server.Close()

	client := NewClient(Options{
		Providers: []Provider{
			{ID: "adsb.lol", PositionURL: func(lat, lon float64, distNM int) string { return server.URL + "/positions" }},
		},
		ProviderCooldown:   time.Minute,
		PositionHedgeDelay: time.Millisecond,
		Now:                func() time.Time { return now },
	})
	input := realtime.FetchInput{
		Channel:     "traffic:center:42.4:-71:40",
		ChannelType: realtime.ChannelTraffic,
		Target: realtime.PollingTarget{
			Kind:   "positions",
			Lat:    42.4,
			Lon:    -71,
			DistNM: 40,
		},
	}

	if _, err := client.Fetch(context.Background(), input); err == nil {
		t.Fatal("first Fetch returned nil error")
	}
	second, err := client.Fetch(context.Background(), input)
	if err != nil {
		t.Fatalf("second Fetch returned error: %v", err)
	}
	if second.Source != "adsb.lol" || requests != 2 {
		t.Fatalf("source=%q requests=%d", second.Source, requests)
	}
	attempts := second.Data.(map[string]any)["attempts"].([]string)
	if len(attempts) != 2 || attempts[0] != "adsb.lol:cooldown" || attempts[1] != "adsb.lol:200" {
		t.Fatalf("attempts = %#v", attempts)
	}
}

func TestPositionProviderReturnsStaleCacheWhenProvidersFail(t *testing.T) {
	now := time.Unix(1_800_000_000, 0)
	var requests int
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests++
		if requests > 1 {
			http.Error(w, "limited", http.StatusTooManyRequests)
			return
		}
		_, _ = w.Write([]byte(`{"ac":[{"hex":"a1","flight":"TEST1   ","lat":42.1,"lon":-71.1}]}`))
	}))
	defer server.Close()

	client := NewClient(Options{
		Providers: []Provider{
			{ID: "adsb.lol", PositionURL: func(lat, lon float64, distNM int) string { return server.URL + "/positions" }},
		},
		ProviderCooldown:   time.Minute,
		PositionCacheTTL:   20 * time.Second,
		PositionHedgeDelay: time.Millisecond,
		Now:                func() time.Time { return now },
	})
	input := realtime.FetchInput{
		Channel:     "traffic:center:42.4:-71:40",
		ChannelType: realtime.ChannelTraffic,
		Target: realtime.PollingTarget{
			Kind:   "positions",
			Lat:    42.4,
			Lon:    -71,
			DistNM: 40,
		},
	}

	first, err := client.Fetch(context.Background(), input)
	if err != nil {
		t.Fatalf("first Fetch returned error: %v", err)
	}
	if first.Stale {
		t.Fatalf("first event should not be stale: %#v", first)
	}
	second, err := client.Fetch(context.Background(), input)
	if err != nil {
		t.Fatalf("second Fetch returned error: %v", err)
	}
	if !second.Stale {
		t.Fatalf("second event should be stale: %#v", second)
	}
	if requests != 2 {
		t.Fatalf("requests = %d", requests)
	}
	attempts := second.Data.(map[string]any)["attempts"].([]string)
	if len(attempts) != 2 || attempts[0] != "adsb.lol:200" || attempts[1] != "cache:stale" {
		t.Fatalf("attempts = %#v", attempts)
	}
}

func TestPositionProviderCooldownSkipsRecentlyFailingProvider(t *testing.T) {
	now := time.Unix(1_800_000_000, 0)
	var adsbLolRequests int
	var airplanesRequests int
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.Contains(r.URL.Path, "/adsb-lol/"):
			adsbLolRequests++
			if adsbLolRequests == 1 {
				http.Error(w, "limited", http.StatusTooManyRequests)
				return
			}
			_, _ = w.Write([]byte(`{"ac":[{"hex":"a1","flight":"AAL100  ","lat":42.1,"lon":-71.1}]}`))
		case strings.Contains(r.URL.Path, "/airplanes/"):
			airplanesRequests++
			_, _ = w.Write([]byte(`{"ac":[{"hex":"b2","flight":"DAL200  ","lat":42.2,"lon":-71.2}]}`))
		default:
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
	}))
	defer server.Close()

	client := NewClient(Options{
		Providers: []Provider{
			{ID: "adsb.lol", PositionURL: func(lat, lon float64, distNM int) string { return server.URL + "/adsb-lol/positions" }},
			{ID: "airplanes.live", PositionURL: func(lat, lon float64, distNM int) string { return server.URL + "/airplanes/positions" }},
		},
		ProviderCooldown: time.Minute,
		Now:              func() time.Time { return now },
	})
	input := realtime.FetchInput{
		Channel:     "traffic:center:42.4:-71:40",
		ChannelType: realtime.ChannelTraffic,
		Target: realtime.PollingTarget{
			Kind:   "positions",
			Lat:    42.4,
			Lon:    -71,
			DistNM: 40,
		},
	}

	first, err := client.Fetch(context.Background(), input)
	if err != nil {
		t.Fatalf("first Fetch returned error: %v", err)
	}
	if first.Source != "airplanes.live" || adsbLolRequests != 1 || airplanesRequests != 1 {
		t.Fatalf("first source=%q adsb=%d airplanes=%d", first.Source, adsbLolRequests, airplanesRequests)
	}

	second, err := client.Fetch(context.Background(), input)
	if err != nil {
		t.Fatalf("second Fetch returned error: %v", err)
	}
	if second.Source != "airplanes.live" || adsbLolRequests != 1 || airplanesRequests != 2 {
		t.Fatalf("cooldown source=%q adsb=%d airplanes=%d", second.Source, adsbLolRequests, airplanesRequests)
	}
	secondAttempts := second.Data.(map[string]any)["attempts"].([]string)
	if len(secondAttempts) != 2 || secondAttempts[0] != "adsb.lol:cooldown" || secondAttempts[1] != "airplanes.live:200" {
		t.Fatalf("cooldown attempts = %#v", secondAttempts)
	}

	now = now.Add(time.Minute + time.Second)
	third, err := client.Fetch(context.Background(), input)
	if err != nil {
		t.Fatalf("third Fetch returned error: %v", err)
	}
	if third.Source != "adsb.lol" || adsbLolRequests != 2 || airplanesRequests != 2 {
		t.Fatalf("recovery source=%q adsb=%d airplanes=%d", third.Source, adsbLolRequests, airplanesRequests)
	}
}
