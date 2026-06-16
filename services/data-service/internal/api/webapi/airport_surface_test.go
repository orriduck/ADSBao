package webapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"
)

func TestAirportSurfaceSearchBBoxUsesRunwayMap(t *testing.T) {
	runwayMap := map[string]any{
		"runways": []any{
			map[string]any{
				"ends": []any{
					map[string]any{"lat": 42.354, "lon": -71.016},
					map[string]any{"lat": 42.374, "lon": -70.992},
				},
			},
		},
	}
	bbox, ok := airportSurfaceSearchBBox(42.3656, -71.0096, runwayMap)
	if !ok {
		t.Fatal("expected bbox")
	}
	if bbox.south >= 42.354 || bbox.north <= 42.374 ||
		bbox.west >= -71.016 || bbox.east <= -70.992 {
		t.Fatalf("bbox did not include runway endpoints: %#v", bbox)
	}
}

func TestBuildAirportSurfaceOverpassQuery(t *testing.T) {
	query := buildAirportSurfaceOverpassQuery(airportSurfaceBBox{
		south: 42.344,
		west:  -71.031,
		north: 42.385,
		east:  -70.986,
	})

	if !strings.Contains(query, `[out:json][timeout:8];`) ||
		!strings.Contains(query, `way["aeroway"~"^(runway|taxiway|taxilane|apron)$"](42.344000,-71.031000,42.385000,-70.986000);`) ||
		!strings.Contains(query, `relation["aeroway"~"^(runway|taxiway|taxilane|apron)$"](42.344000,-71.031000,42.385000,-70.986000);`) ||
		!strings.Contains(query, `out tags geom;`) {
		t.Fatalf("unexpected query:\n%s", query)
	}
}

func TestBuildAirportSurfaceMapFromOverpass(t *testing.T) {
	payload := map[string]any{
		"elements": []any{
			map[string]any{
				"type": "way",
				"id":   101,
				"tags": map[string]any{"aeroway": "taxiway", "ref": "A"},
				"geometry": []any{
					map[string]any{"lat": 42.36, "lon": -71.01},
					map[string]any{"lat": 42.361, "lon": -71.009},
				},
			},
			map[string]any{
				"type": "way",
				"id":   102,
				"tags": map[string]any{"aeroway": "apron", "name": "Main apron"},
				"geometry": []any{
					map[string]any{"lat": 42.36, "lon": -71.01},
					map[string]any{"lat": 42.36, "lon": -71.00},
					map[string]any{"lat": 42.37, "lon": -71.00},
					map[string]any{"lat": 42.36, "lon": -71.01},
				},
			},
			map[string]any{
				"type":     "way",
				"id":       103,
				"tags":     map[string]any{"aeroway": "helipad"},
				"geometry": []any{map[string]any{"lat": 42.36, "lon": -71.01}},
			},
		},
	}

	surfaceMap := buildAirportSurfaceMapFromOverpass("kbos", payload)
	if surfaceMap == nil {
		t.Fatal("expected surface map")
	}
	if surfaceMap["airport"] != "KBOS" || surfaceMap["source"] != "OpenStreetMap" {
		t.Fatalf("unexpected surface map metadata: %#v", surfaceMap)
	}
	features := surfaceMap["features"].(map[string]any)["features"].([]map[string]any)
	if len(features) != 2 {
		t.Fatalf("features = %#v", features)
	}
	if valueAt(features[0], "properties", "kind") != "apron" ||
		valueAt(features[0], "geometry", "type") != "Polygon" {
		t.Fatalf("expected apron polygon first, got %#v", features[0])
	}
	if valueAt(features[1], "properties", "kind") != "taxiway" ||
		valueAt(features[1], "geometry", "type") != "LineString" {
		t.Fatalf("expected taxiway line second, got %#v", features[1])
	}
	counts := surfaceMap["counts"].(map[string]int)
	if counts["apron"] != 1 || counts["taxiway"] != 1 {
		t.Fatalf("counts = %#v", counts)
	}
}

func TestAirportDetailIncludesOptionalSurfaceMap(t *testing.T) {
	overpassHits := 0
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasPrefix(r.URL.Path, "/openaip/airports"):
			w.Header().Set("Content-Type", "application/json")
			if strings.Count(r.URL.Path, "/") > 2 {
				_, _ = w.Write([]byte(`{
					"_id":"airport-kbos",
					"icaoCode":"KBOS",
					"iataCode":"BOS",
					"name":"Boston Logan International Airport",
					"country":"US",
					"geometry":{"type":"Point","coordinates":[-71.0096,42.3656]},
					"runways":[{"_id":"rw","designator":"04L","trueHeading":40,"dimension":{"length":{"value":2396},"width":{"value":45}}}]
				}`))
				return
			}
			_, _ = w.Write([]byte(`{"items":[{
				"_id":"airport-kbos",
				"icaoCode":"KBOS",
				"iataCode":"BOS",
				"name":"Boston Logan International Airport",
				"country":"US",
				"geometry":{"type":"Point","coordinates":[-71.0096,42.3656]}
			}]}`))
		case strings.HasPrefix(r.URL.Path, "/openaip/navaids") ||
			strings.HasPrefix(r.URL.Path, "/openaip/airspaces") ||
			strings.HasPrefix(r.URL.Path, "/openaip/reporting-points") ||
			strings.HasPrefix(r.URL.Path, "/openaip/obstacles"):
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"items":[]}`))
		case strings.HasPrefix(r.URL.Path, "/overpass"):
			overpassHits++
			data, _ := url.QueryUnescape(r.URL.Query().Get("data"))
			if !strings.Contains(data, `aeroway`) {
				t.Fatalf("unexpected overpass query: %s", data)
			}
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"elements":[{
				"type":"way",
				"id":200,
				"tags":{"aeroway":"taxiway","ref":"A"},
				"geometry":[{"lat":42.36,"lon":-71.01},{"lat":42.361,"lon":-71.009}]
			}]}`))
		default:
			t.Fatalf("unexpected request: %s", r.URL.String())
		}
	}))
	defer upstream.Close()

	handler := New(Options{
		HTTPClient:             upstream.Client(),
		OpenAIPAPIKey:          "test-key",
		OpenAIPBaseURL:         upstream.URL + "/openaip",
		OverpassBaseURL:        upstream.URL + "/overpass",
		AirportSurfaceCacheTTL: time.Hour,
	})
	req := httptest.NewRequest(http.MethodGet, "/api/airport/KBOS", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
	var payload map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
		t.Fatalf("invalid json: %v", err)
	}
	surfaceMap, ok := payload["surfaceMap"].(map[string]any)
	if !ok {
		t.Fatalf("missing surfaceMap: %#v", payload["surfaceMap"])
	}
	if surfaceMap["source"] != "OpenStreetMap" {
		t.Fatalf("surfaceMap = %#v", surfaceMap)
	}
	if overpassHits != 1 {
		t.Fatalf("overpass hits = %d", overpassHits)
	}
}
