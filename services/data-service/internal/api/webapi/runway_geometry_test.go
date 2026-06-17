package webapi

import (
	"context"
	"database/sql"
	"encoding/json"
	"math"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

type fakeRunwayMapReader struct {
	maps map[string]map[string]any
}

func (r fakeRunwayMapReader) readRunwayMaps(_ context.Context, idents []string) (map[string]map[string]any, error) {
	out := map[string]map[string]any{}
	for _, ident := range idents {
		if runwayMap := r.maps[normalizeAirportIdent(ident)]; runwayMap != nil {
			out[normalizeAirportIdent(ident)] = runwayMap
		}
	}
	return out, nil
}

func TestBuildRunwayMapFromGeometryRows(t *testing.T) {
	runwayMap := buildRunwayMapFromGeometryRows("kbos", []runwayGeometryRow{
		{
			lengthFt:      sql.NullFloat64{Float64: 10_083, Valid: true},
			widthFt:       sql.NullFloat64{Float64: 150, Valid: true},
			leIdent:       "22L",
			leLatitudeDeg: sql.NullFloat64{Float64: 42.377344, Valid: true},
			leLongitudeDeg: sql.NullFloat64{
				Float64: -70.999076,
				Valid:   true,
			},
			heIdent:       "04R",
			heLatitudeDeg: sql.NullFloat64{Float64: 42.35404, Valid: true},
			heLongitudeDeg: sql.NullFloat64{
				Float64: -71.010352,
				Valid:   true,
			},
		},
		{
			closed:        sql.NullBool{Bool: true, Valid: true},
			leIdent:       "01",
			leLatitudeDeg: sql.NullFloat64{Float64: 42.1, Valid: true},
			leLongitudeDeg: sql.NullFloat64{
				Float64: -71.1,
				Valid:   true,
			},
			heIdent:       "19",
			heLatitudeDeg: sql.NullFloat64{Float64: 42.2, Valid: true},
			heLongitudeDeg: sql.NullFloat64{
				Float64: -71.2,
				Valid:   true,
			},
		},
	})

	if runwayMap == nil {
		t.Fatal("expected runway map")
	}
	if runwayMap["airport"] != "KBOS" {
		t.Fatalf("unexpected airport: %#v", runwayMap["airport"])
	}
	runways := runwayMap["runways"].([]map[string]any)
	if len(runways) != 1 {
		t.Fatalf("expected one open runway, got %#v", runways)
	}
	runway := runways[0]
	if runway["id"] != "04R/22L" {
		t.Fatalf("expected sorted runway id, got %#v", runway["id"])
	}
	if runway["lengthFt"] != float64(10_083) || runway["widthFt"] != float64(150) {
		t.Fatalf("unexpected dimensions: %#v", runway)
	}
	centerline := runway["centerline"].(map[string]any)
	geometry := centerline["geometry"].(map[string]any)
	coordinates := geometry["coordinates"].([]any)
	first := coordinates[0].([]any)
	if first[0] != -71.010352 || first[1] != 42.35404 {
		t.Fatalf("unexpected first centerline coordinate: %#v", first)
	}
}

func TestBuildRunwayMapFromGeometryRowsReturnsNilWithoutValidRows(t *testing.T) {
	runwayMap := buildRunwayMapFromGeometryRows("KBOS", []runwayGeometryRow{
		{
			leIdent: "04R",
			heIdent: "22L",
		},
	})
	if runwayMap != nil {
		t.Fatalf("expected nil runway map, got %#v", runwayMap)
	}
}

func TestOpenAIPRunwaysBuildApproximateRunwayMap(t *testing.T) {
	airport := map[string]any{
		"icaoCode": "KJFK",
		"geometry": map[string]any{
			"type":        "Point",
			"coordinates": []any{-73.7781, 40.6413},
		},
	}
	runways := mapRunways([]map[string]any{
		{
			"_id":         "openaip-rwy",
			"designator":  "04L",
			"trueHeading": 40.0,
			"dimension": map[string]any{
				"length": map[string]any{"value": 3682.0},
				"width":  map[string]any{"value": 61.0},
			},
		},
	}, airport)

	if len(runways) != 1 {
		t.Fatalf("expected one runway, got %#v", runways)
	}
	runway := runways[0]
	le, he := runway["le"].(map[string]any), runway["he"].(map[string]any)
	if le["lat"] == nil || le["lon"] == nil || he["lat"] == nil || he["lon"] == nil {
		t.Fatalf("expected approximate endpoints, got %#v", runway)
	}
	if numberValue(he["lat"]) <= numberValue(le["lat"]) ||
		numberValue(he["lon"]) <= numberValue(le["lon"]) {
		t.Fatalf("unexpected endpoint orientation: le=%#v he=%#v", le, he)
	}

	runwayMap := buildRunwayMapFromMappedRunways("KJFK", runways, "OpenAIP")
	if runwayMap == nil {
		t.Fatal("expected runway map")
	}
	mapped := runwayMap["runways"].([]map[string]any)
	if len(mapped) != 1 || mapped[0]["id"] != "04L/22R" {
		t.Fatalf("unexpected runway map: %#v", runwayMap)
	}
	centerline := mapped[0]["centerline"].(map[string]any)
	coordinates := centerline["geometry"].(map[string]any)["coordinates"].([]any)
	first := coordinates[0].([]any)
	if math.Abs(numberValue(first[0])-numberValue(le["lon"])) > 0.0000001 ||
		math.Abs(numberValue(first[1])-numberValue(le["lat"])) > 0.0000001 {
		t.Fatalf("centerline did not use endpoint coordinates: %#v", coordinates)
	}
}

func TestOpenAIPDirectionalRunwaysDedupeToPhysicalRunways(t *testing.T) {
	runwayMap := buildRunwayMapFromMappedRunways("KJFK", []map[string]any{
		{
			"lengthFt": 11348,
			"widthFt":  200,
			"le": map[string]any{
				"ident": "04L",
				"lat":   40.621,
				"lon":   -73.795,
			},
			"he": map[string]any{
				"ident": "22R",
				"lat":   40.651,
				"lon":   -73.765,
			},
		},
		{
			"lengthFt": 11348,
			"widthFt":  200,
			"le": map[string]any{
				"ident": "22R",
				"lat":   40.651,
				"lon":   -73.765,
			},
			"he": map[string]any{
				"ident": "04L",
				"lat":   40.621,
				"lon":   -73.795,
			},
		},
		{
			"lengthFt": 10000,
			"widthFt":  200,
			"le": map[string]any{
				"ident": "13L",
				"lat":   40.64,
				"lon":   -73.8,
			},
			"he": map[string]any{
				"ident": "31R",
				"lat":   40.62,
				"lon":   -73.75,
			},
		},
	}, "OpenAIP")

	if runwayMap == nil {
		t.Fatal("expected runway map")
	}
	runways := runwayMap["runways"].([]map[string]any)
	if len(runways) != 2 {
		t.Fatalf("expected two physical runways, got %#v", runways)
	}
	if runways[0]["id"] != "04L/22R" || runways[1]["id"] != "13L/31R" {
		t.Fatalf("unexpected runway ids: %#v", runways)
	}
}

func TestNearbyAirportsPreferStoredRunwayMapOverOpenAIPApproximation(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/openaip/airports" {
			t.Fatalf("unexpected request: %s", r.URL.String())
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"items":[{
			"_id":"airport-kbos",
			"icaoCode":"KBOS",
			"iataCode":"BOS",
			"name":"Boston Logan International Airport",
			"country":"US",
			"geometry":{"type":"Point","coordinates":[-71.0052,42.3643]},
			"runways":[{
				"_id":"openaip-04l",
				"designator":"04L",
				"trueHeading":40,
				"dimension":{"length":{"value":2396},"width":{"value":45}}
			}]
		}]}`))
	}))
	defer upstream.Close()

	storedRunwayMap := map[string]any{
		"airport": "KBOS",
		"source":  "OurAirports",
		"cycle":   "",
		"runways": []map[string]any{
			{
				"id": "04L/22R",
				"centerline": map[string]any{
					"type": "Feature",
					"geometry": map[string]any{
						"type": "LineString",
						"coordinates": []any{
							[]any{-71.014344, 42.357997},
							[]any{-71.004511, 42.378322},
						},
					},
				},
			},
		},
	}

	handler := New(Options{
		HTTPClient:     upstream.Client(),
		OpenAIPAPIKey:  "test-key",
		OpenAIPBaseURL: upstream.URL + "/openaip",
		Timeout:        time.Second,
	})
	handler.runwayMapReader = fakeRunwayMapReader{
		maps: map[string]map[string]any{"KBOS": storedRunwayMap},
	}

	req := httptest.NewRequest(http.MethodGet, "/api/proxy/airports/nearby?lat=42.31&lon=-70.98&radiusNm=40&limit=10", nil)
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
	if len(airports) != 1 {
		t.Fatalf("expected one nearby airport, got %#v", airports)
	}
	airport := airports[0].(map[string]any)
	runwayMap := airport["runwayMap"].(map[string]any)
	if runwayMap["source"] != "OurAirports" {
		t.Fatalf("expected stored runway map, got %#v", runwayMap)
	}
	runways := runwayMap["runways"].([]any)
	centerline := runways[0].(map[string]any)["centerline"].(map[string]any)
	coordinates := centerline["geometry"].(map[string]any)["coordinates"].([]any)
	first := coordinates[0].([]any)
	if first[0] != -71.014344 || first[1] != 42.357997 {
		t.Fatalf("nearby runway map used OpenAIP approximation: %#v", coordinates)
	}
}

func TestNearbyAirportsOmitOpenAIPApproximateRunwayMapWithoutStoredGeometry(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/openaip/airports" {
			t.Fatalf("unexpected request: %s", r.URL.String())
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"items":[{
			"_id":"airport-kbos",
			"icaoCode":"KBOS",
			"iataCode":"BOS",
			"name":"Boston Logan International Airport",
			"country":"US",
			"geometry":{"type":"Point","coordinates":[-71.0052,42.3643]},
			"runways":[{
				"_id":"openaip-04l",
				"designator":"04L",
				"trueHeading":40,
				"dimension":{"length":{"value":2396},"width":{"value":45}}
			}]
		}]}`))
	}))
	defer upstream.Close()

	handler := New(Options{
		HTTPClient:     upstream.Client(),
		OpenAIPAPIKey:  "test-key",
		OpenAIPBaseURL: upstream.URL + "/openaip",
		Timeout:        time.Second,
	})
	handler.runwayMapReader = fakeRunwayMapReader{maps: map[string]map[string]any{}}

	req := httptest.NewRequest(http.MethodGet, "/api/proxy/airports/nearby?lat=42.31&lon=-70.98&radiusNm=40&limit=10", nil)
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
	airport := airports[0].(map[string]any)
	if runwayMap := airport["runwayMap"]; runwayMap != nil {
		t.Fatalf("nearby airport should omit synthetic OpenAIP runway map, got %#v", runwayMap)
	}
}
