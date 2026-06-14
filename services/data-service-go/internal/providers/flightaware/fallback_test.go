package flightaware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestFallbackParsesBootstrapPositionAndCaches(t *testing.T) {
	requests := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests++
		if r.URL.Path != "/live/flight/DAL58" {
			t.Fatalf("path = %s", r.URL.Path)
		}
		_, _ = w.Write([]byte(`
			<html>
				<head>
					<meta name="origin" content="KATL">
					<meta name="destination" content="EGLL">
				</head>
				<body>
					<script>
						var trackpollBootstrap = {"flights":{"DAL58":{
							"coord":[-48.9,49.05],
							"altitude":370,
							"groundspeed":480,
							"heading":84,
							"timestamp":1710000000,
							"hexid":"A50370",
							"origin":{"icao":"KATL"},
							"destination":{"icao":"EGLL"},
							"flightPlan":{"route":"DCT OCEANIC","altitude":370,"speed":480}
						}}};
					</script>
				</body>
			</html>
		`))
	}))
	defer server.Close()

	client := NewFallbackClient(FallbackOptions{
		BaseURL: server.URL + "/live/flight",
		Now: func() time.Time {
			return time.Unix(1710000010, 0).UTC()
		},
	})

	first, err := client.ByCallsign(context.Background(), "DAL58", nil)
	if err != nil {
		t.Fatalf("ByCallsign returned error: %v", err)
	}
	if !first.OK || !first.HasPosition {
		t.Fatalf("first result = %#v", first)
	}
	if first.Position["lat"] != 49.05 || first.Position["lon"] != -48.9 {
		t.Fatalf("position = %#v", first.Position)
	}
	if first.Position["altitudeFt"] != float64(37000) {
		t.Fatalf("altitudeFt = %#v", first.Position["altitudeFt"])
	}

	second, err := client.ByCallsign(context.Background(), "DAL58", nil)
	if err != nil {
		t.Fatalf("second ByCallsign returned error: %v", err)
	}
	if !second.OK || !second.HasPosition {
		t.Fatalf("second result = %#v", second)
	}
	if requests != 1 {
		t.Fatalf("requests = %d, want 1 cache hit", requests)
	}
}

func TestBuildTrackpollURLPreservesPageQuery(t *testing.T) {
	result := buildTrackpollURL("https://example.test/live/flight/DAL58?flight=DAL58-1710000000-airline-0000&foo=bar", "token-123")

	if result != "https://example.test/ajax/trackpoll.rvt?flight=DAL58-1710000000-airline-0000&foo=bar&locale=en_US&summary=0&token=token-123" {
		t.Fatalf("trackpoll URL = %s", result)
	}
}
