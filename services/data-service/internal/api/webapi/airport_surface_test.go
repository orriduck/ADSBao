package webapi

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestAirportSurfaceSearchBBoxUsesRunwayMap(t *testing.T) {
	runwayMap := map[string]any{
		"runways": []map[string]any{
			map[string]any{
				"ends": []map[string]any{
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

func TestBuildAirportSurfacePavementOverpassQuery(t *testing.T) {
	query := buildAirportSurfacePavementOverpassQuery(airportSurfaceBBox{
		south: 42.344,
		west:  -71.031,
		north: 42.385,
		east:  -70.986,
	})

	if !strings.Contains(query, `[out:json][timeout:3];`) ||
		!strings.Contains(query, `way["aeroway"~"^(runway|taxiway|taxilane|apron)$"](42.344000,-71.031000,42.385000,-70.986000);`) ||
		strings.Contains(query, `relation`) ||
		strings.Contains(query, `building`) ||
		strings.Contains(query, `terminal`) ||
		strings.Contains(query, `map_to_area`) {
		t.Fatalf("unexpected pavement query:\n%s", query)
	}
}

func TestBuildAirportSurfaceStructuresOverpassQuery(t *testing.T) {
	query := buildAirportSurfaceStructuresOverpassQuery(airportSurfaceBBox{
		south: 42.344,
		west:  -71.031,
		north: 42.385,
		east:  -70.986,
	})

	if !strings.Contains(query, `way["aeroway"="aerodrome"](42.344000,-71.031000,42.385000,-70.986000);`) ||
		!strings.Contains(query, `rel["aeroway"="aerodrome"](42.344000,-71.031000,42.385000,-70.986000);`) ||
		!strings.Contains(query, `.ad map_to_area->.adarea;`) ||
		!strings.Contains(query, `way["building"](area.adarea);`) ||
		!strings.Contains(query, `way["aeroway"="terminal"](42.344000,-71.031000,42.385000,-70.986000);`) ||
		!strings.Contains(query, `way["building"="hangar"](42.344000,-71.031000,42.385000,-70.986000);`) ||
		strings.Contains(query, `transportation`) ||
		strings.Contains(query, `taxiway`) {
		t.Fatalf("unexpected structures query:\n%s", query)
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
			// A building with no aeroway tag must be classified as "building"
			// (guards the missing-tag "<nil>" normalization).
			map[string]any{
				"type": "way",
				"id":   104,
				"tags": map[string]any{"building": "yes", "name": "Terminal A"},
				"geometry": []any{
					map[string]any{"lat": 42.365, "lon": -71.015},
					map[string]any{"lat": 42.365, "lon": -71.013},
					map[string]any{"lat": 42.366, "lon": -71.013},
					map[string]any{"lat": 42.365, "lon": -71.015},
				},
			},
			map[string]any{
				"type": "way",
				"id":   105,
				"tags": map[string]any{"aeroway": "hangar", "building": "hangar"},
				"geometry": []any{
					map[string]any{"lat": 42.365, "lon": -71.012},
					map[string]any{"lat": 42.365, "lon": -71.011},
					map[string]any{"lat": 42.366, "lon": -71.011},
					map[string]any{"lat": 42.365, "lon": -71.012},
				},
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
	if len(features) != 4 {
		t.Fatalf("features = %#v", features)
	}
	// Buildings rank first (drawn underneath), then apron, then taxiway.
	if valueAt(features[0], "properties", "kind") != "building" ||
		valueAt(features[0], "geometry", "type") != "Polygon" {
		t.Fatalf("expected building polygon first, got %#v", features[0])
	}
	if valueAt(features[1], "properties", "kind") != "building" ||
		valueAt(features[1], "geometry", "type") != "Polygon" {
		t.Fatalf("expected hangar as building polygon second, got %#v", features[1])
	}
	if valueAt(features[2], "properties", "kind") != "apron" ||
		valueAt(features[2], "geometry", "type") != "Polygon" {
		t.Fatalf("expected apron polygon third, got %#v", features[2])
	}
	if valueAt(features[3], "properties", "kind") != "taxiway" ||
		valueAt(features[3], "geometry", "type") != "LineString" {
		t.Fatalf("expected taxiway line fourth, got %#v", features[3])
	}
	counts := surfaceMap["counts"].(map[string]int)
	if counts["apron"] != 1 || counts["taxiway"] != 1 || counts["building"] != 2 {
		t.Fatalf("counts = %#v", counts)
	}
}

func TestBuildAirportSurfaceMapFromOSMMap(t *testing.T) {
	payload := &airportSurfaceOSMMap{
		Nodes: []airportSurfaceOSMNode{
			{ID: 1, Lat: 42.36, Lon: -71.01},
			{ID: 2, Lat: 42.361, Lon: -71.009},
			{ID: 3, Lat: 42.362, Lon: -71.01},
			{ID: 4, Lat: 42.36, Lon: -71.01},
		},
		Ways: []airportSurfaceOSMWay{
			{
				ID: 900,
				NDs: []airportSurfaceOSMND{
					{Ref: 1},
					{Ref: 2},
				},
				Tags: []airportSurfaceOSMTag{{Key: "aeroway", Value: "taxiway"}},
			},
			{
				ID: 901,
				NDs: []airportSurfaceOSMND{
					{Ref: 1},
					{Ref: 2},
					{Ref: 3},
					{Ref: 4},
				},
				Tags: []airportSurfaceOSMTag{{Key: "building", Value: "yes"}},
			},
		},
	}

	pavement := buildAirportSurfaceMapFromOSMMap("KBOS", payload, airportSurfaceScopePavement)
	structures := buildAirportSurfaceMapFromOSMMap("KBOS", payload, airportSurfaceScopeStructures)
	if numberValue(pavement["counts"].(map[string]int)["taxiway"]) != 1 {
		t.Fatalf("expected taxiway from osm map fallback: %#v", pavement["counts"])
	}
	if numberValue(structures["counts"].(map[string]int)["building"]) != 1 {
		t.Fatalf("expected building from osm map fallback: %#v", structures["counts"])
	}
}

func TestAirportSurfaceFallsBackToOSMMapWhenOverpassFails(t *testing.T) {
	osmHits := 0
	handler := New(Options{
		HTTPClient: &http.Client{
			Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
				switch req.URL.Host {
				case "overpass.invalid":
					if req.Method != http.MethodPost {
						t.Fatalf("overpass method = %s", req.Method)
					}
					return jsonResponse(http.StatusTooManyRequests, `{"error":"rate limited"}`), nil
				case "api.openstreetmap.org":
					osmHits++
					if strings.Contains(req.URL.RawQuery, "%2C") ||
						!strings.Contains(req.URL.RawQuery, "bbox=") {
						t.Fatalf("unexpected osm map query: %s", req.URL.RawQuery)
					}
					return &http.Response{
						StatusCode: http.StatusOK,
						Header:     http.Header{"Content-Type": []string{"application/xml"}},
						Body: io.NopCloser(strings.NewReader(`<osm>
<node id="1" lat="42.360000" lon="-71.010000"/>
<node id="2" lat="42.361000" lon="-71.009000"/>
<way id="900"><nd ref="1"/><nd ref="2"/><tag k="aeroway" v="taxiway"/></way>
</osm>`)),
					}, nil
				default:
					t.Fatalf("unexpected upstream host %q", req.URL.Host)
					return nil, nil
				}
			}),
		},
		OverpassBaseURL:        "https://overpass.invalid/api/interpreter",
		AirportSurfaceCacheTTL: time.Hour,
	})
	surfaceMap := handler.airportSurfaceMap(
		context.Background(),
		"KBOS",
		42.3656,
		-71.0096,
		nil,
		airportSurfaceScopePavement,
	)
	if surfaceMap == nil {
		t.Fatal("expected fallback surface map")
	}
	counts := surfaceMap["counts"].(map[string]int)
	if counts["taxiway"] != 1 {
		t.Fatalf("expected taxiway from osm fallback, counts=%#v", counts)
	}
	if osmHits != 1 {
		t.Fatalf("osm hits = %d", osmHits)
	}
}

func TestAirportSurfaceStructuresFallsBackToCenterOSMMap(t *testing.T) {
	osmHits := 0
	handler := New(Options{
		HTTPClient: &http.Client{
			Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
				switch req.URL.Host {
				case "overpass.invalid":
					return jsonResponse(http.StatusGatewayTimeout, `{"error":"timeout"}`), nil
				case "api.openstreetmap.org":
					osmHits++
					rawBBox := strings.TrimPrefix(req.URL.RawQuery, "bbox=")
					parts := strings.Split(rawBBox, ",")
					if len(parts) != 4 {
						t.Fatalf("unexpected bbox query: %s", req.URL.RawQuery)
					}
					if !strings.HasPrefix(parts[0], "-87.921") ||
						!strings.HasPrefix(parts[2], "-87.892") {
						t.Fatalf("expected center OSM bbox, got %s", req.URL.RawQuery)
					}
					return &http.Response{
						StatusCode: http.StatusOK,
						Header:     http.Header{"Content-Type": []string{"application/xml"}},
						Body: io.NopCloser(strings.NewReader(`<osm>
<node id="1" lat="41.970000" lon="-87.910000"/>
<node id="2" lat="41.970000" lon="-87.909000"/>
<node id="3" lat="41.971000" lon="-87.909000"/>
<node id="4" lat="41.970000" lon="-87.910000"/>
<way id="920"><nd ref="1"/><nd ref="2"/><nd ref="3"/><nd ref="4"/><tag k="building" v="yes"/></way>
</osm>`)),
					}, nil
				default:
					t.Fatalf("unexpected upstream host %q", req.URL.Host)
					return nil, nil
				}
			}),
		},
		OverpassBaseURL:        "https://overpass.invalid/api/interpreter",
		AirportSurfaceCacheTTL: time.Hour,
	})

	surfaceMap := handler.airportSurfaceMap(
		context.Background(),
		"KORD",
		41.9742,
		-87.9073,
		nil,
		airportSurfaceScopeStructures,
	)
	if surfaceMap == nil {
		t.Fatal("expected center OSM fallback surface map")
	}
	counts := surfaceMap["counts"].(map[string]int)
	if counts["building"] != 1 {
		t.Fatalf("expected building from center OSM fallback, counts=%#v", counts)
	}
	if osmHits != 1 {
		t.Fatalf("osm hits = %d", osmHits)
	}
}

func TestAirportSurfaceScopesKeepPavementSeparateFromStructures(t *testing.T) {
	overpassHits := 0
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasPrefix(r.URL.Path, "/openaip/airports"):
			w.Header().Set("Content-Type", "application/json")
			if strings.Count(r.URL.Path, "/") > 2 {
				_, _ = w.Write([]byte(`{
					"_id":"airport-kjfk",
					"icaoCode":"KJFK",
					"iataCode":"JFK",
					"name":"John F Kennedy International Airport",
					"country":"US",
					"geometry":{"type":"Point","coordinates":[-73.7789,40.6398]},
					"runways":[{"_id":"rw","designator":"04L","trueHeading":44,"dimension":{"length":{"value":3459},"width":{"value":45}}}]
				}`))
				return
			}
			_, _ = w.Write([]byte(`{"items":[{
				"_id":"airport-kjfk",
				"icaoCode":"KJFK",
				"iataCode":"JFK",
				"name":"John F Kennedy International Airport",
				"country":"US",
				"geometry":{"type":"Point","coordinates":[-73.7789,40.6398]}
			}]}`))
		case strings.HasPrefix(r.URL.Path, "/overpass"):
			overpassHits++
			data := airportSurfaceRequestData(t, r)
			if overpassHits == 1 {
				if strings.Contains(data, `building`) ||
					strings.Contains(data, `terminal`) ||
					!strings.Contains(data, `aeroway"~"^(runway|taxiway|taxilane|apron)$"`) {
					t.Fatalf("first query should be pavement-only: %s", data)
				}
				w.Header().Set("Content-Type", "application/json")
				_, _ = w.Write([]byte(`{"elements":[{
					"type":"way",
					"id":300,
					"tags":{"aeroway":"taxiway","ref":"A"},
					"geometry":[{"lat":40.64,"lon":-73.78},{"lat":40.641,"lon":-73.779}]
				}]}`))
				return
			}
			if !strings.Contains(data, `building"="hangar"`) ||
				!strings.Contains(data, `aeroway"="terminal"`) ||
				strings.Contains(data, `taxiway`) {
				t.Fatalf("second query should be structures-only: %s", data)
			}
			if !strings.Contains(data, `aeroway"="aerodrome"`) ||
				!strings.Contains(data, `map_to_area`) ||
				!strings.Contains(data, `building"](area.adarea)`) {
				t.Fatalf("structures query should filter buildings to the aerodrome area: %s", data)
			}
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"elements":[{
				"type":"way",
				"id":301,
				"tags":{"building":"hangar","name":"Hangar 1"},
				"geometry":[{"lat":40.64,"lon":-73.78},{"lat":40.64,"lon":-73.779},{"lat":40.641,"lon":-73.779},{"lat":40.64,"lon":-73.78}]
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
	req := httptest.NewRequest(http.MethodGet, "/api/airport/KJFK/surface?scope=pavement", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("surface status=%d body=%s", rr.Code, rr.Body.String())
	}
	var payload map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
		t.Fatalf("invalid surface json: %v", err)
	}
	surfaceMap, ok := payload["surfaceMap"].(map[string]any)
	if !ok {
		t.Fatalf("missing pavement surfaceMap: %#v", payload["surfaceMap"])
	}
	counts := surfaceMap["counts"].(map[string]any)
	if numberValue(counts["taxiway"]) != 1 {
		t.Fatalf("expected taxiway from pavement query, counts=%#v", counts)
	}

	req = httptest.NewRequest(http.MethodGet, "/api/airport/KJFK/surface?scope=structures", nil)
	rr = httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("structures status=%d body=%s", rr.Code, rr.Body.String())
	}
	payload = map[string]any{}
	if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
		t.Fatalf("invalid structures json: %v", err)
	}
	surfaceMap, ok = payload["surfaceMap"].(map[string]any)
	if !ok {
		t.Fatalf("missing fallback structures surfaceMap: %#v", payload["surfaceMap"])
	}
	counts = surfaceMap["counts"].(map[string]any)
	if numberValue(counts["building"]) != 1 {
		t.Fatalf("expected building from structures query, counts=%#v", counts)
	}
	if overpassHits != 2 {
		t.Fatalf("overpass hits = %d", overpassHits)
	}
}

func TestAirportSurfaceCacheSkipsNilPayload(t *testing.T) {
	cache := newAirportSurfaceCache(time.Hour)
	cache.set("KBOS", nil)
	if payload, ok := cache.get("KBOS"); ok || payload != nil {
		t.Fatalf("nil payload should not be cached: payload=%#v ok=%v", payload, ok)
	}

	expected := map[string]any{"source": "OpenStreetMap"}
	cache.set("KBOS", expected)
	payload, ok := cache.get("KBOS")
	if !ok || payload["source"] != "OpenStreetMap" {
		t.Fatalf("expected non-nil payload to be cached: payload=%#v ok=%v", payload, ok)
	}
}

func TestAirportDetailDefersSurfaceMapByDefault(t *testing.T) {
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
			data := airportSurfaceRequestData(t, r)
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
	if _, ok := payload["surfaceMap"]; ok {
		t.Fatalf("surfaceMap should be omitted by default: %#v", payload["surfaceMap"])
	}
	if airspaces, ok := payload["airspaces"].([]any); !ok || len(airspaces) != 0 {
		t.Fatalf("airspaces should be deferred by default: %#v", payload["airspaces"])
	}
	if obstacles, ok := payload["obstacles"].([]any); !ok || len(obstacles) != 0 {
		t.Fatalf("obstacles should be deferred by default: %#v", payload["obstacles"])
	}
	if overpassHits != 0 {
		t.Fatalf("default detail overpass hits = %d", overpassHits)
	}
	runwayMap, ok := payload["runwayMap"].(map[string]any)
	if !ok {
		t.Fatalf("missing runwayMap: %#v", payload["runwayMap"])
	}
	if runwayMap["source"] != "OpenAIP" {
		t.Fatalf("runwayMap = %#v", runwayMap)
	}

	req = httptest.NewRequest(http.MethodGet, "/api/airport/KBOS/context", nil)
	rr = httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("context status=%d body=%s", rr.Code, rr.Body.String())
	}
	payload = map[string]any{}
	if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
		t.Fatalf("invalid context json: %v", err)
	}
	if _, ok := payload["airspaces"].([]any); !ok {
		t.Fatalf("missing context airspaces: %#v", payload["airspaces"])
	}
	if _, ok := payload["obstacles"].([]any); !ok {
		t.Fatalf("missing context obstacles: %#v", payload["obstacles"])
	}

	req = httptest.NewRequest(http.MethodGet, "/api/airport/KBOS/surface", nil)
	rr = httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("surface status=%d body=%s", rr.Code, rr.Body.String())
	}
	payload = map[string]any{}
	if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
		t.Fatalf("invalid surface json: %v", err)
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

func airportSurfaceRequestData(t *testing.T, r *http.Request) string {
	t.Helper()
	if err := r.ParseForm(); err != nil {
		t.Fatalf("invalid overpass form: %v", err)
	}
	return r.Form.Get("data")
}
