package route

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

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

func TestFlightAwareRouteNormalizesScrapedRoute(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/live/flight/AAL1234" {
			t.Fatalf("path = %s", r.URL.Path)
		}
		if flusher, ok := w.(http.Flusher); ok {
			flusher.Flush()
			time.Sleep(20 * time.Millisecond)
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

func TestFlightAwareRouteUsesAirportDirectoryFallbackWhenPageOmitsEmbeddedAirports(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/live/flight/AAL1234":
			_, _ = w.Write([]byte(`
				<html>
					<head>
						<title>AA1234 (AAL1234) American Airlines Flight Tracking</title>
						<meta name="origin" content="KBOS">
						<meta name="destination" content="KLAX">
						<meta name="airline" content="AAL">
						<meta name="description" content="Track American Airlines (AA) #1234">
					</head>
				</html>
			`))
		case "/api/airport/KBOS":
			_, _ = w.Write([]byte(`{"airport":{"icao":"KBOS","iata":"BOS","name":"Boston Logan","city":"Boston","country":"US","lat":42.3656,"lon":-71.0096}}`))
		case "/api/airport/KLAX":
			_, _ = w.Write([]byte(`{"airport":{"icao":"KLAX","iata":"LAX","name":"Los Angeles Intl","city":"Los Angeles","country":"US","lat":33.9416,"lon":-118.4085}}`))
		default:
			t.Fatalf("unexpected path = %s", r.URL.Path)
		}
	}))
	defer server.Close()

	client := NewClient(Options{
		FlightAwareBase:         server.URL + "/live/flight",
		AirportDirectoryBaseURL: server.URL,
		QueueInterval:           0,
	})
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
	data := event.Data.(map[string]any)
	route := data["route"].(map[string]any)
	routeCodes := route["route"].(map[string]any)
	if routeCodes["iata"] != "BOS-LAX" || routeCodes["icao"] != "KBOS-KLAX" {
		t.Fatalf("route = %#v", route)
	}
}

func TestFlightAwareRouteAllowsLargeHTMLPage(t *testing.T) {
	padding := strings.Repeat(" ", 600*1024)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/live/flight/JBU1238" {
			t.Fatalf("path = %s", r.URL.Path)
		}
		_, _ = w.Write([]byte(padding + `
			<html>
				<head>
					<title>B61238 (JBU1238) JetBlue Flight Tracking</title>
					<meta name="origin" content="KBOS">
					<meta name="destination" content="KJFK">
					<meta name="airline" content="JBU">
					<meta name="description" content="Track JetBlue (B6) #1238">
				</head>
				<body>
					<script>
						var trackpollBootstrap = {"flights":{"JBU1238":{
							"origin":{"icao":"KBOS","iata":"BOS","coord":[-71.0096,42.3656],"friendlyName":"Boston Logan","friendlyLocation":"Boston, MA"},
							"destination":{"icao":"KJFK","iata":"JFK","coord":[-73.7781,40.6413],"friendlyName":"John F Kennedy Intl","friendlyLocation":"New York, NY"}
						}}};
					</script>
				</body>
			</html>
		`))
	}))
	defer server.Close()

	client := NewClient(Options{FlightAwareBase: server.URL + "/live/flight", QueueInterval: 0})
	event, err := client.Fetch(context.Background(), realtime.FetchInput{
		Channel:     "route:JBU1238:airport:KBOS",
		ChannelType: realtime.ChannelRoute,
		Target: realtime.PollingTarget{
			Kind:          "route",
			Callsign:      "JBU1238",
			RouteProvider: "flightaware",
			RouteContext:  &realtime.RouteContext{Type: "airport", ICAO: "KBOS"},
		},
	})
	if err != nil {
		t.Fatalf("Fetch returned error: %v", err)
	}
	data := event.Data.(map[string]any)
	route := data["route"].(map[string]any)
	routeCodes := route["route"].(map[string]any)
	if routeCodes["icao"] != "KBOS-KJFK" {
		t.Fatalf("route = %#v", route)
	}
}

func TestFlightAwareRouteRequestsStartInParallel(t *testing.T) {
	started := make(chan string, 3)
	release := make(chan struct{})
	var releaseOnce sync.Once
	releaseAll := func() {
		releaseOnce.Do(func() { close(release) })
	}
	var active atomic.Int64
	var maxActive atomic.Int64

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		current := active.Add(1)
		for {
			peak := maxActive.Load()
			if current <= peak || maxActive.CompareAndSwap(peak, current) {
				break
			}
		}
		started <- r.URL.Path
		defer active.Add(-1)
		<-release
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
	defer func() {
		releaseAll()
		server.Close()
	}()

	client := NewClient(Options{
		FlightAwareBase: server.URL + "/live/flight",
		QueueInterval:   150 * time.Millisecond,
	})
	var wg sync.WaitGroup
	for _, callsign := range []string{"AAL1234", "AAL1235"} {
		wg.Add(1)
		go func(callsign string) {
			defer wg.Done()
			_, _ = client.Fetch(context.Background(), realtime.FetchInput{
				Channel:     "route:" + callsign + ":airport:KBOS",
				ChannelType: realtime.ChannelRoute,
				Target: realtime.PollingTarget{
					Kind:          "route",
					Callsign:      callsign,
					RouteProvider: "flightaware",
					RouteContext:  &realtime.RouteContext{Type: "airport", ICAO: "KBOS"},
				},
			})
		}(callsign)
	}

	waitStartedPath(t, started, 250*time.Millisecond)
	waitStartedPath(t, started, 75*time.Millisecond)
	if maxActive.Load() < 2 {
		t.Fatalf("FlightAware route fetches did not overlap; max active = %d", maxActive.Load())
	}
	releaseAll()
	wg.Wait()
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

func waitStartedPath(t *testing.T, started <-chan string, timeout time.Duration) string {
	t.Helper()
	select {
	case path := <-started:
		return path
	case <-time.After(timeout):
		t.Fatal("timed out waiting for parallel FlightAware route request to start")
		return ""
	}
}
