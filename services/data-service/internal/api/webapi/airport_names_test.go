package webapi

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

type fakeAirportNameReader struct {
	names map[string]airportNameRecord
}

func (r fakeAirportNameReader) readAirportNames(_ context.Context, idents []string) (map[string]airportNameRecord, error) {
	out := map[string]airportNameRecord{}
	for _, ident := range idents {
		if name, ok := r.names[normalizeAirportIdent(ident)]; ok {
			out[normalizeAirportIdent(ident)] = name
		}
	}
	return out, nil
}

func TestAirportNamesUseOurAirportsWithoutOpenAIPFallback(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/openaip/airports" {
			t.Fatalf("unexpected request: %s", r.URL.String())
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"items":[
			{
				"_id":"airport-kbos",
				"icaoCode":"KBOS",
				"iataCode":"BOS",
				"name":"OpenAIP Logan Name",
				"country":"US",
				"geometry":{"type":"Point","coordinates":[-71.0096,42.3656]}
			},
			{
				"_id":"airport-kzzz",
				"icaoCode":"KZZZ",
				"name":"OpenAIP Only Name",
				"country":"US",
				"geometry":{"type":"Point","coordinates":[-70.1,42.1]}
			}
		]}`))
	}))
	defer upstream.Close()

	handler := New(Options{
		HTTPClient:     upstream.Client(),
		OpenAIPAPIKey:  "test-key",
		OpenAIPBaseURL: upstream.URL + "/openaip",
		Timeout:        time.Second,
	})
	handler.airportNameReader = fakeAirportNameReader{names: map[string]airportNameRecord{
		"KBOS": {
			name: "General Edward Lawrence Logan International Airport",
			city: "Boston",
		},
	}}

	req := httptest.NewRequest(http.MethodGet, "/api/search?q=K&limit=2", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
	var payload map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
		t.Fatalf("invalid json: %v", err)
	}
	airports := payload["airports"].([]any)
	if len(airports) != 2 {
		t.Fatalf("expected two airports, got %#v", airports)
	}
	byICAO := map[string]map[string]any{}
	for _, raw := range airports {
		airport := raw.(map[string]any)
		byICAO[stringValue(airport["icao"])] = airport
	}
	if byICAO["KBOS"]["name"] != "General Edward Lawrence Logan International Airport" ||
		byICAO["KBOS"]["city"] != "Boston" {
		t.Fatalf("KBOS did not use OurAirports name: %#v", byICAO["KBOS"])
	}
	if strings.Contains(stringValue(byICAO["KZZZ"]["name"]), "OpenAIP") || byICAO["KZZZ"]["name"] != "" {
		t.Fatalf("KZZZ fell back to OpenAIP name: %#v", byICAO["KZZZ"])
	}
}
