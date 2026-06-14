package route

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/adsbao/adsbao/services/data-service-go/internal/realtime"
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

func TestFlightAwareRouteNormalizesScrapedRoute(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/live/flight/AAL1234" {
			t.Fatalf("path = %s", r.URL.Path)
		}
		_, _ = w.Write([]byte(`
			<html>
				<head>
					<title>AA1234 (AAL1234) American Airlines Flight Tracking</title>
					<meta name="origin" content="KBOS">
					<meta name="destination" content="KLAX">
					<meta name="airline" content="AAL">
					<meta name="description" content="Track American Airlines (AA) #1234">
				</head>
				<body>
					<script>
						var trackpollBootstrap = {"flights":{"AAL1234":{
							"origin":{"icao":"KBOS","iata":"BOS","coord":[-71.0096,42.3656],"friendlyName":"Boston Logan","friendlyLocation":"Boston, MA"},
							"destination":{"icao":"KLAX","iata":"LAX","coord":[-118.4085,33.9416],"friendlyName":"Los Angeles Intl","friendlyLocation":"Los Angeles, CA"}
						}}};
					</script>
				</body>
			</html>
		`))
	}))
	defer server.Close()

	client := NewClient(Options{FlightAwareBase: server.URL + "/live/flight", QueueInterval: 0})
	event, err := client.Fetch(context.Background(), realtime.FetchInput{
		Channel:     "route:AAL1234:airport:KBOS",
		ChannelType: realtime.ChannelRoute,
		Target: realtime.PollingTarget{
			Kind:          "route",
			Callsign:      "AAL1234",
			RouteProvider: "flightaware",
			RouteContext:  &realtime.RouteContext{Type: "airport", ICAO: "KBOS"},
		},
	})
	if err != nil {
		t.Fatalf("Fetch returned error: %v", err)
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
