package webapi

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

type fakeSpotterLocationReader struct {
	locations map[string][]spotterLocationRecord
}

func (r fakeSpotterLocationReader) readSpotterLocations(ctx context.Context, ident string) ([]spotterLocationRecord, error) {
	return r.locations[normalizeAirportIdent(ident)], nil
}

func TestAirportDetailIncludesSpotterLocationsByIdent(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.URL.Path == "/openaip/airports/airport-kbos" {
			_, _ = w.Write([]byte(`{
				"_id":"airport-kbos",
				"icaoCode":"KBOS",
				"iataCode":"BOS",
				"name":"Boston Logan International Airport",
				"country":"US",
				"geometry":{"type":"Point","coordinates":[-71.0052,42.3643]}
			}`))
			return
		}
		if r.URL.Path != "/openaip/airports" {
			t.Fatalf("unexpected request: %s", r.URL.String())
		}
		_, _ = w.Write([]byte(`{"items":[{
			"_id":"airport-kbos",
			"icaoCode":"KBOS",
			"iataCode":"BOS",
			"name":"Boston Logan International Airport",
			"country":"US",
			"geometry":{"type":"Point","coordinates":[-71.0052,42.3643]}
		}]}`))
	}))
	defer upstream.Close()

	handler := New(Options{
		HTTPClient:     upstream.Client(),
		OpenAIPAPIKey:  "test-key",
		OpenAIPBaseURL: upstream.URL + "/openaip",
		Timeout:        time.Second,
	})
	handler.spotterLocationReader = fakeSpotterLocationReader{locations: map[string][]spotterLocationRecord{
		"KBOS": {
			{
				id:                "spotter-kbos-1",
				airportIdent:      "KBOS",
				spotNumber:        1,
				title:             "Shirley Beach - 27 arrivals",
				category:          "spotting location",
				latitudeDeg:       42.3587062,
				longitudeDeg:      -70.968364,
				what:              "27 arrivals",
				whereText:         "Shirley Beach",
				whenText:          "late morning to afternoon",
				misc:              "limited shade",
				focalLength:       "100-400 mm",
				sourceURI:         "https://www.spotterguide.net/planespotting/north-america/united-states-of-america/boston-bos-kbos/",
				sourceAttribution: "spotterguide.net",
			},
		},
	}}

	req := httptest.NewRequest(http.MethodGet, "/api/airport/kbos", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
	var payload map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
		t.Fatalf("invalid json: %v", err)
	}
	locations := payload["spotterLocations"].([]any)
	if len(locations) != 1 {
		t.Fatalf("expected one spotter location, got %#v", locations)
	}
	location := locations[0].(map[string]any)
	if location["airportIdent"] != "KBOS" || location["source"] != "spotterguide" {
		t.Fatalf("unexpected spotter location payload: %#v", location)
	}
	if location["name"] != "Shirley Beach - 27 arrivals" || location["sourceLabel"] != "Photo guide" {
		t.Fatalf("unexpected display fields: %#v", location)
	}
}
