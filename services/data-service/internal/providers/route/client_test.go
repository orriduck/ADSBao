package route

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/adsbao/adsbao/services/data-service/internal/realtime"
)

func TestADSBDBRouteNormalizesRoutePayload(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v0/callsign/DAL123" {
			t.Fatalf("path = %s", r.URL.Path)
		}
		_, _ = w.Write([]byte(`{"response":{"flightroute":{"callsign":"DAL123","callsign_icao":"DAL123","airline":{"icao":"DAL","iata":"DL","name":"Delta Air Lines"},"origin":{"icao_code":"KATL","iata_code":"ATL","name":"Hartsfield Jackson Atlanta Intl","latitude":33.6367,"longitude":-84.4281},"destination":{"icao_code":"KBOS","iata_code":"BOS","name":"Boston Logan","latitude":42.3656,"longitude":-71.0096}}}}`))
	}))
	defer server.Close()

	client := NewClient(Options{ADSBDBBaseURL: server.URL + "/v0", QueueInterval: 0})
	event, err := client.Fetch(context.Background(), realtime.FetchInput{
		Channel:     "route:DAL123",
		ChannelType: realtime.ChannelRoute,
		Target:      realtime.PollingTarget{Kind: "route", Callsign: "DAL123"},
	})
	if err != nil {
		t.Fatalf("Fetch returned error: %v", err)
	}
	if event.Type != "route:update" || event.Source != "adsbdb" {
		t.Fatalf("event = %#v", event)
	}
	data := event.Data.(map[string]any)
	route := data["route"].(map[string]any)
	routeCodes := route["route"].(map[string]any)
	if routeCodes["iata"] != "ATL-BOS" {
		t.Fatalf("route data = %#v", route)
	}
}

func TestFlightAwareRouteUsesInjectedPrivateServiceFetcher(t *testing.T) {
	var requestedCallsign string
	client := NewClient(Options{
		FlightAwareRouteFetcher: func(ctx context.Context, callsign string, metrics realtime.MetricsSink) (map[string]any, error) {
			requestedCallsign = callsign
			return map[string]any{
				"callsign":    callsign,
				"origin":      map[string]any{"icao": "KBOS", "iata": "BOS", "lat": 42.3656, "lon": -71.0096},
				"destination": map[string]any{"icao": "KLAX", "iata": "LAX", "lat": 33.9416, "lon": -118.4085},
				"route":       map[string]any{"iata": "BOS-LAX", "icao": "KBOS-KLAX"},
				"airline":     map[string]any{"icao": "AAL", "iata": "AA"},
				"source":      "flightaware",
				"confidence":  "scraped-reference",
			}, nil
		},
		QueueInterval: 0,
	})
	event, err := client.Fetch(context.Background(), realtime.FetchInput{
		Channel:     "route:AAL1234:airport:KBOS",
		ChannelType: realtime.ChannelRoute,
		Target: realtime.PollingTarget{
			Kind:          "route",
			Callsign:      "AAL1234",
			RouteProvider: "flightaware",
		},
	})
	if err != nil {
		t.Fatalf("Fetch returned error: %v", err)
	}
	if requestedCallsign != "AAL1234" {
		t.Fatalf("requested callsign = %q", requestedCallsign)
	}
	if event.Source != "flightaware" {
		t.Fatalf("source = %q", event.Source)
	}
	data := event.Data.(map[string]any)
	route := data["route"].(map[string]any)
	routeCodes := route["route"].(map[string]any)
	if routeCodes["iata"] != "BOS-LAX" || route["source"] != "flightaware" {
		t.Fatalf("route = %#v", route)
	}
}

func TestRouteEventCompactsRealtimeRoutePayload(t *testing.T) {
	event := routeEvent("route:AAL1234:airport:KBOS", "flightaware", "AAL1234", map[string]any{
		"callsign":     "AAL1234",
		"callsignIcao": "AAL1234",
		"callsignIata": "AA1234",
		"number":       "1234",
		"airline": map[string]any{
			"icao":     "AAL",
			"iata":     "AA",
			"name":     "American Airlines",
			"callsign": "",
			"iconUrl":  "https://www.flightaware.com/images/airline_logos/90p/AAL.png",
		},
		"origin": map[string]any{
			"icao":         "KBOS",
			"iata":         "BOS",
			"name":         "Boston Logan",
			"municipality": "Boston",
			"country":      "US",
			"lat":          42.3656,
			"lon":          -71.0096,
		},
		"destination": map[string]any{
			"icao":         "KLAX",
			"iata":         "LAX",
			"name":         "Los Angeles Intl",
			"municipality": "Los Angeles",
			"country":      "US",
			"lat":          33.9416,
			"lon":          -118.4085,
		},
		"route":      map[string]any{"icao": "KBOS-KLAX", "iata": "BOS-LAX"},
		"airports":   []any{map[string]any{"icao": "KBOS"}, map[string]any{"icao": "KLAX"}},
		"source":     "flightaware",
		"confidence": "scraped-reference",
	})
	data := event.Data.(map[string]any)
	route := data["route"].(map[string]any)

	if _, ok := route["airports"]; ok {
		t.Fatalf("compact route should omit airports duplication: %#v", route)
	}
	if _, ok := route["airline"]; ok {
		t.Fatalf("compact route should omit nested airline object: %#v", route)
	}
	if route["airlineIcao"] != "AAL" {
		t.Fatalf("airlineIcao = %#v", route["airlineIcao"])
	}
	origin := route["origin"].(map[string]any)
	destination := route["destination"].(map[string]any)
	for _, airport := range []map[string]any{origin, destination} {
		for _, key := range []string{"name", "municipality", "country"} {
			if _, ok := airport[key]; ok {
				t.Fatalf("compact airport should omit %s: %#v", key, airport)
			}
		}
	}
	if origin["icao"] != "KBOS" || origin["iata"] != "BOS" || origin["lat"] != 42.3656 || origin["lon"] != -71.0096 {
		t.Fatalf("origin = %#v", origin)
	}
	if destination["icao"] != "KLAX" || destination["iata"] != "LAX" || destination["lat"] != 33.9416 || destination["lon"] != -118.4085 {
		t.Fatalf("destination = %#v", destination)
	}
}
